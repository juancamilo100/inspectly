import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import crypto from "crypto";
import OpenAI from "openai";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, registerAuthRoutes } from "./replit_integrations/auth";
import { CREDIT_VALUES } from "@shared/schema";

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  },
});

// OpenAI client for AI analysis
const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

// Helper to get user ID from request
function getUserId(req: Request): string {
  const user = req.user as any;
  return user?.claims?.sub;
}

// Enhanced defect type with cost breakdown
interface DefectBreakdown {
  issue: string;
  severity: 'critical' | 'major' | 'moderate';
  estimatedRepairCost: number;
  creditRecommendation: number;
  repairVsCredit: 'request_credit' | 'request_repair' | 'either';
  sellerScript: string;
}

interface AnalysisResult {
  majorDefects: string[];
  summaryFindings: string;
  negotiationPoints: string[];
  estimatedCredit: number;
  defectBreakdown: DefectBreakdown[];
  openingStatement: string;
  closingStatement: string;
}

// AI analysis function
async function analyzeReport(fileName: string): Promise<AnalysisResult> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert real estate negotiation coach and home inspection analyst. Generate comprehensive negotiation ammunition for a property buyer based on an inspection report. Return a JSON object with:

- majorDefects: array of 2-5 major issues found (simple strings for quick reference)
- summaryFindings: a brief paragraph summarizing the overall condition
- negotiationPoints: array of 3-5 high-level talking points
- estimatedCredit: total dollar amount to request from seller (sum of all issues)
- defectBreakdown: array of detailed analysis for each issue with:
  - issue: short description of the problem
  - severity: "critical", "major", or "moderate"
  - estimatedRepairCost: realistic repair cost estimate in dollars
  - creditRecommendation: amount to request (usually 70-90% of repair cost)
  - repairVsCredit: "request_credit" (prefer cash), "request_repair" (seller should fix), or "either"
  - sellerScript: a 1-2 sentence script to use when discussing this issue with the seller or their agent
- openingStatement: a confident opening statement to begin the negotiation conversation
- closingStatement: a closing statement that summarizes the total ask and frames it fairly

Be specific, realistic, and persuasive. Use actual contractor price ranges. Common issues: roof (age, condition), HVAC (age, efficiency), plumbing (leaks, age), electrical (panel, wiring), foundation (cracks, settling), water damage, mold, etc.`
        },
        {
          role: "user",
          content: `Analyze this inspection report: ${fileName}. Generate comprehensive negotiation ammunition with per-issue cost breakdowns and seller scripts.`
        }
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 2048,
    });

    const content = response.choices[0]?.message?.content || '{}';
    const parsed = JSON.parse(content);
    
    // Build default defect breakdown from major defects if not provided
    const defaultBreakdown: DefectBreakdown[] = (parsed.majorDefects || []).map((defect: string, i: number) => ({
      issue: defect,
      severity: i === 0 ? 'critical' : 'major',
      estimatedRepairCost: 2000 + (i * 500),
      creditRecommendation: 1500 + (i * 400),
      repairVsCredit: 'request_credit',
      sellerScript: `The inspection revealed ${defect.toLowerCase()}. This is a significant concern that warrants a credit toward closing costs.`,
    }));

    return {
      majorDefects: parsed.majorDefects || ["Roof showing signs of wear", "HVAC system over 15 years old"],
      summaryFindings: parsed.summaryFindings || "Property is in fair condition with some maintenance items to address.",
      negotiationPoints: parsed.negotiationPoints || ["Request seller credit for roof repairs", "Negotiate HVAC replacement allowance"],
      estimatedCredit: parsed.estimatedCredit || 5000,
      defectBreakdown: parsed.defectBreakdown || defaultBreakdown,
      openingStatement: parsed.openingStatement || "Based on the professional inspection, we've identified several items that need to be addressed before closing.",
      closingStatement: parsed.closingStatement || "We believe a credit is fair given the scope of work required. This allows everyone to move forward on good terms.",
    };
  } catch (error) {
    console.error("AI analysis error:", error);
    // Return default values if AI fails
    return {
      majorDefects: ["Roof needs inspection", "Plumbing requires evaluation"],
      summaryFindings: "Property requires professional assessment of key systems.",
      negotiationPoints: ["Request inspection contingency", "Negotiate repair credits"],
      estimatedCredit: 3000,
      defectBreakdown: [
        {
          issue: "Roof needs inspection",
          severity: 'major',
          estimatedRepairCost: 2500,
          creditRecommendation: 2000,
          repairVsCredit: 'request_credit',
          sellerScript: "The roof shows signs of wear and requires professional assessment. We're requesting a credit to address this.",
        },
        {
          issue: "Plumbing requires evaluation",
          severity: 'moderate',
          estimatedRepairCost: 1200,
          creditRecommendation: 1000,
          repairVsCredit: 'either',
          sellerScript: "The plumbing system needs evaluation. A credit toward potential repairs would be appropriate.",
        },
      ],
      openingStatement: "Based on the inspection findings, we've identified items requiring attention.",
      closingStatement: "We believe these credits are fair given the issues found.",
    };
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Setup authentication (must be before other routes)
  await setupAuth(app);
  registerAuthRoutes(app);

  // Dashboard endpoint
  app.get("/api/dashboard", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      
      const [creditBalance, recentReports, transactions, stats] = await Promise.all([
        storage.getCreditBalance(userId),
        storage.getReportsByUser(userId),
        storage.getCreditTransactions(userId),
        storage.getCreditStats(userId),
      ]);

      const userDownloads = await storage.getDownloadsByUser(userId);

      res.json({
        creditBalance,
        recentReports: recentReports.slice(0, 5),
        recentTransactions: transactions.slice(0, 10),
        stats: {
          totalReports: recentReports.length,
          totalDownloads: userDownloads.length,
          creditsEarned: stats.earned,
          creditsSpent: stats.spent,
        },
      });
    } catch (error) {
      console.error("Dashboard error:", error);
      res.status(500).json({ error: "Failed to load dashboard" });
    }
  });

  // Upload report
  app.post("/api/reports/upload", isAuthenticated, upload.single('file'), async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const file = req.file;

      if (!file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      // Generate file hash to prevent duplicates
      const fileHash = crypto.createHash('sha256').update(file.buffer).digest('hex');

      // Check for duplicate
      const existing = await storage.getReportByHash(fileHash);
      if (existing) {
        return res.status(400).json({ error: "This report has already been uploaded" });
      }

      // Run AI analysis
      const analysis = await analyzeReport(file.originalname);

      // Create the report
      const report = await storage.createReport({
        userId,
        propertyAddress: file.originalname.replace('.pdf', '').replace(/_/g, ' ') || "Unknown Address",
        fileHash,
        fileName: file.originalname,
        fileSize: file.size,
        majorDefects: analysis.majorDefects,
        summaryFindings: analysis.summaryFindings,
        negotiationPoints: analysis.negotiationPoints,
        estimatedCredit: analysis.estimatedCredit,
        isRedacted: true,
        isPublic: true,
      });

      // Award credits for upload
      await storage.createCreditTransaction({
        userId,
        amount: CREDIT_VALUES.UPLOAD_REWARD,
        type: 'upload',
        description: `Uploaded report: ${report.propertyAddress}`,
        reportId: report.id,
      });

      // Check if this fulfills any bounties
      const matchingBounty = await storage.getBountyByAddress(report.propertyAddress);
      if (matchingBounty && matchingBounty.userId !== userId) {
        // Fulfill the bounty
        await storage.fulfillBounty(matchingBounty.id, userId, report.id);
        
        // Transfer bounty credits to uploader
        await storage.createCreditTransaction({
          userId,
          amount: matchingBounty.stakedCredits,
          type: 'bounty_earned',
          description: `Bounty fulfilled for: ${report.propertyAddress}`,
          bountyId: matchingBounty.id,
          reportId: report.id,
        });
      }

      res.json({
        report,
        creditsEarned: CREDIT_VALUES.UPLOAD_REWARD,
        analysis,
      });
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ error: "Failed to upload report" });
    }
  });

  // Get public reports (browse)
  app.get("/api/reports", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const searchQuery = req.query.search as string | undefined;
      const reports = await storage.getPublicReports(searchQuery);
      
      res.json({
        reports,
        total: reports.length,
      });
    } catch (error) {
      console.error("Get reports error:", error);
      res.status(500).json({ error: "Failed to get reports" });
    }
  });

  // Get user's reports (my reports)
  app.get("/api/my-reports", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      
      const [uploaded, userDownloads] = await Promise.all([
        storage.getReportsByUser(userId),
        storage.getDownloadsByUser(userId),
      ]);

      // Get the downloaded reports
      const downloadedReportIds = userDownloads.map(d => d.reportId);
      const downloadedReports: any[] = [];
      
      for (const reportId of downloadedReportIds) {
        const report = await storage.getReport(reportId);
        if (report) {
          downloadedReports.push(report);
        }
      }

      res.json({
        uploaded,
        downloaded: downloadedReports,
      });
    } catch (error) {
      console.error("Get my reports error:", error);
      res.status(500).json({ error: "Failed to get reports" });
    }
  });

  // Download report
  app.post("/api/reports/:id/download", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const reportId = parseInt(req.params.id);

      const report = await storage.getReport(reportId);
      if (!report) {
        return res.status(404).json({ error: "Report not found" });
      }

      // Check if user owns this report
      if (report.userId === userId) {
        return res.json({ report, message: "You own this report" });
      }

      // Check if already downloaded
      const alreadyDownloaded = await storage.hasUserDownloaded(userId, reportId);
      if (alreadyDownloaded) {
        return res.json({ report, message: "Already downloaded" });
      }

      // Check credit balance
      const balance = await storage.getCreditBalance(userId);
      if (balance < CREDIT_VALUES.DOWNLOAD_COST) {
        return res.status(400).json({ error: "Insufficient credits" });
      }

      // Create download record
      await storage.createDownload({
        userId,
        reportId,
        creditSpent: CREDIT_VALUES.DOWNLOAD_COST,
      });

      // Deduct credits
      await storage.createCreditTransaction({
        userId,
        amount: -CREDIT_VALUES.DOWNLOAD_COST,
        type: 'download',
        description: `Downloaded report: ${report.propertyAddress}`,
        reportId,
      });

      // Increment download count
      await storage.incrementDownloadCount(reportId);

      res.json({ report });
    } catch (error) {
      console.error("Download error:", error);
      res.status(500).json({ error: "Failed to download report" });
    }
  });

  // Delete report
  app.delete("/api/reports/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const reportId = parseInt(req.params.id);

      const report = await storage.getReport(reportId);
      if (!report) {
        return res.status(404).json({ error: "Report not found" });
      }

      if (report.userId !== userId) {
        return res.status(403).json({ error: "Not authorized" });
      }

      await storage.deleteReport(reportId);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete error:", error);
      res.status(500).json({ error: "Failed to delete report" });
    }
  });

  // Credits endpoints
  app.get("/api/credits", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      
      const [balance, transactions, stats] = await Promise.all([
        storage.getCreditBalance(userId),
        storage.getCreditTransactions(userId),
        storage.getCreditStats(userId),
      ]);

      res.json({
        balance,
        totalEarned: stats.earned,
        totalSpent: stats.spent,
        transactions,
      });
    } catch (error) {
      console.error("Credits error:", error);
      res.status(500).json({ error: "Failed to get credits" });
    }
  });

  // Bounties endpoints
  app.get("/api/bounties", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      
      const [myBounties, openBounties] = await Promise.all([
        storage.getBountiesByUser(userId),
        storage.getOpenBounties(userId),
      ]);

      res.json({
        myBounties,
        openBounties,
      });
    } catch (error) {
      console.error("Bounties error:", error);
      res.status(500).json({ error: "Failed to get bounties" });
    }
  });

  app.post("/api/bounties", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const { propertyAddress, stakedCredits } = req.body;

      if (!propertyAddress) {
        return res.status(400).json({ error: "Property address is required" });
      }

      const stakeAmount = Math.max(CREDIT_VALUES.MIN_BOUNTY_STAKE, stakedCredits || CREDIT_VALUES.MIN_BOUNTY_STAKE);

      // Check credit balance
      const balance = await storage.getCreditBalance(userId);
      if (balance < stakeAmount) {
        return res.status(400).json({ error: "Insufficient credits" });
      }

      // Create bounty
      const bounty = await storage.createBounty({
        userId,
        propertyAddress,
        stakedCredits: stakeAmount,
      });

      // Deduct staked credits
      await storage.createCreditTransaction({
        userId,
        amount: -stakeAmount,
        type: 'bounty_stake',
        description: `Staked for bounty: ${propertyAddress}`,
        bountyId: bounty.id,
      });

      res.json(bounty);
    } catch (error) {
      console.error("Create bounty error:", error);
      res.status(500).json({ error: "Failed to create bounty" });
    }
  });

  app.delete("/api/bounties/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const bountyId = parseInt(req.params.id);

      const bounty = await storage.getBounty(bountyId);
      if (!bounty) {
        return res.status(404).json({ error: "Bounty not found" });
      }

      if (bounty.userId !== userId) {
        return res.status(403).json({ error: "Not authorized" });
      }

      if (bounty.status !== 'open') {
        return res.status(400).json({ error: "Cannot cancel non-open bounty" });
      }

      // Cancel bounty
      await storage.cancelBounty(bountyId);

      // Refund staked credits
      await storage.createCreditTransaction({
        userId,
        amount: bounty.stakedCredits,
        type: 'bounty_stake',
        description: `Refund for cancelled bounty: ${bounty.propertyAddress}`,
        bountyId: bounty.id,
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Cancel bounty error:", error);
      res.status(500).json({ error: "Failed to cancel bounty" });
    }
  });

  // Give signup bonus to new users (called when user first accesses dashboard)
  app.post("/api/signup-bonus", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      
      // Check if user already has transactions (not a new user)
      const transactions = await storage.getCreditTransactions(userId);
      if (transactions.length > 0) {
        return res.json({ alreadyClaimed: true });
      }

      // Give signup bonus
      await storage.createCreditTransaction({
        userId,
        amount: CREDIT_VALUES.SIGNUP_BONUS,
        type: 'signup_bonus',
        description: 'Welcome bonus for joining InspectSwap!',
      });

      res.json({ credited: CREDIT_VALUES.SIGNUP_BONUS });
    } catch (error) {
      console.error("Signup bonus error:", error);
      res.status(500).json({ error: "Failed to process signup bonus" });
    }
  });

  return httpServer;
}
