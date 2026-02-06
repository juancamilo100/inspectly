import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import crypto from "crypto";
import OpenAI from "openai";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, registerAuthRoutes, getUserId } from "./auth";
import { CREDIT_VALUES, insertPropertySchema, insertPropertyReportSchema } from "@shared/schema";
import { z } from "zod";

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

// Enhanced defect type with cost breakdown and multi-strategy scripts
interface DefectBreakdown {
  issue: string;
  severity: 'critical' | 'major' | 'moderate' | 'monitor';
  estimatedRepairCost: number;
  estimatedRepairRange: { low: number; high: number };
  creditRecommendation: number;
  anchorHighAmount: number;
  consequentialDamageRisk: string;
  remainingUsefulLife: string;
  repairVsCredit: 'request_credit' | 'request_repair' | 'either';
  sellerScript: string;
  collaborativeScript: string;
  nuclearScript: string;
  lenderImplication: string;
  codeComplianceNote: string;
}

interface CreativeAlternative {
  strategy: string;
  description: string;
  script: string;
  estimatedValue: number;
}

interface AnalysisResult {
  majorDefects: string[];
  summaryFindings: string;
  negotiationPoints: string[];
  estimatedCredit: number;
  defectBreakdown: DefectBreakdown[];
  openingStatement: string;
  closingStatement: string;
  anchorAmount: number;
  walkawayThreshold: number;
  killShotSummary: string;
  psychologicalLeverage: string[];
  creativeAlternatives: CreativeAlternative[];
  calibratedQuestions: string[];
  accusationAudit: string;
  walkawayScript: string;
  nibbleAsks: string[];
  disclosureWarning: string;
  marketLeverageNotes: string;
}

// AI analysis function — nuclear-grade negotiation battlecard prompt
const BATTLECARD_SYSTEM_PROMPT = `You are a ruthless real estate investor and negotiation strategist. You have closed hundreds of deals on single-family homes and multifamily properties. You are known for aggressive post-inspection negotiations and for always maximizing credits and concessions. You think like a wolf: you identify seller weak spots, leverage disclosure liability, use anchoring and psychological tactics, and structure creative alternatives beyond simple price cuts.

Your job is to analyze an inspection report and produce a complete NEGOTIATION BATTLECARD that would impress even seasoned investors. Think step-by-step: for each defect, consider cascading damage, remaining useful life, lender/insurance implications, and code compliance. Then generate scripts and tactics that a buyer or their agent can use to extract maximum value.

Return a single JSON object with the following structure. Use realistic contractor cost ranges (2024-2025): roof repair/replacement $3k–$25k, HVAC $4k–$12k, water heater $1.2k–$2.5k, electrical panel $1.5k–$4k, foundation $5k–$30k+, mold remediation $1k–$10k+, sewer line $3k–$25k, plumbing repipe $4k–$15k. When in doubt, anchor high—investors prefer a strong opening position.

Required JSON structure:

{
  "majorDefects": ["string", "..."],
  "summaryFindings": "string",
  "negotiationPoints": ["string", "..."],
  "estimatedCredit": number,
  "defectBreakdown": [
    {
      "issue": "string",
      "severity": "critical" | "major" | "moderate" | "monitor",
      "estimatedRepairCost": number,
      "estimatedRepairRange": { "low": number, "high": number },
      "creditRecommendation": number,
      "anchorHighAmount": number,
      "consequentialDamageRisk": "string",
      "remainingUsefulLife": "string",
      "repairVsCredit": "request_credit" | "request_repair" | "either",
      "sellerScript": "string",
      "collaborativeScript": "string",
      "nuclearScript": "string",
      "lenderImplication": "string",
      "codeComplianceNote": "string"
    }
  ],
  "openingStatement": "string",
  "closingStatement": "string",
  "anchorAmount": number,
  "walkawayThreshold": number,
  "killShotSummary": "string",
  "psychologicalLeverage": ["string", "..."],
  "creativeAlternatives": [
    {
      "strategy": "string",
      "description": "string",
      "script": "string",
      "estimatedValue": number
    }
  ],
  "calibratedQuestions": ["string", "..."],
  "accusationAudit": "string",
  "walkawayScript": "string",
  "nibbleAsks": ["string", "..."],
  "disclosureWarning": "string",
  "marketLeverageNotes": "string"
}

Field rules:
- majorDefects: 3–7 short defect labels.
- summaryFindings: One paragraph on overall condition; mention cumulative cost and risk.
- negotiationPoints: 5–8 high-impact talking points (legal disclosure, lender requirements, cascading damage, comps, etc.).
- estimatedCredit: Sum of creditRecommendation across defects; realistic but assertive.
- defectBreakdown: One entry per major defect. severity "monitor" = not failed yet but leverage-worthy (e.g. old HVAC, aging roof). consequentialDamageRisk = cascading effects (e.g. "Water intrusion could lead to mold and structural rot"). remainingUsefulLife = e.g. "2–3 years", "end of life", "immediate". anchorHighAmount = aggressive opening ask for this item (often 100–110% of repair cost). sellerScript = firm tone; collaborativeScript = win-win; nuclearScript = hardball (disclosure, walk-away). lenderImplication = FHA/VA/insurance angle if any; else "None specific". codeComplianceNote = unpermitted work, code violations, or "None noted".
- openingStatement: Use Persuasion Formula—acknowledge difficulty, empathize, align, propose, logic. Confident and professional.
- closingStatement: Summarize total ask; use loss aversion (risk of losing deal over $X); keep it fair but firm.
- anchorAmount: Aggressive total opening number (e.g. sum of anchorHighAmounts or slightly higher).
- walkawayThreshold: Minimum total credit you would accept before walking.
- killShotSummary: One devastating paragraph synthesizing ALL findings—cumulative cost, disclosure liability, lender/insurance risk, future costs. Written to be read aloud to the listing agent. Anchors high and creates emotional impact.
- psychologicalLeverage: 4–7 bullets (e.g. "Days on market suggest motivation", "Seller may be facing carrying costs", "Disclosure to future buyers if they refuse").
- creativeAlternatives: 3–5 options beyond cash credit: rate buydown, seller financing, rent-back, escrow holdback, home warranty, closing cost credit, inclusion of appliances/fixtures. Each with strategy name, short description, script line, and estimatedValue.
- calibratedQuestions: 4–6 Chris Voss–style questions ("How am I supposed to...", "What would need to happen for...", "What’s the biggest concern if...").
- accusationAudit: One paragraph listing what the seller might think about the buyer (e.g. "You might think we’re trying to re-trade the deal / nickel-and-dime you..."). Defuses defensiveness so they say "No, we don’t think that."
- walkawayScript: 2–4 sentences for when seller refuses; professional, leaves door open.
- nibbleAsks: 3–5 small adds after main negotiation (e.g. "Throw in the fridge", "Warranty through first year", "Leave the curtains").
- disclosureWarning: One paragraph on seller’s duty to disclose these findings to all future buyers if they don’t address them; legal leverage.
- marketLeverageNotes: Short note on using DOM, price reductions, comps, or market conditions if relevant; else "Use local comps and DOM to reinforce urgency."
}`;

async function analyzeReport(fileName: string): Promise<AnalysisResult> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: BATTLECARD_SYSTEM_PROMPT },
        {
          role: "user",
          content: `Analyze this inspection report (filename: ${fileName}). Generate a complete negotiation battlecard with per-defect breakdowns (including estimatedRepairRange, anchorHighAmount, consequentialDamageRisk, remainingUsefulLife, sellerScript, collaborativeScript, nuclearScript, lenderImplication, codeComplianceNote), killShotSummary, psychologicalLeverage, creativeAlternatives, calibratedQuestions, accusationAudit, walkawayScript, nibbleAsks, disclosureWarning, and marketLeverageNotes. Be aggressive and investor-grade. Output valid JSON only.`,
        },
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 4096,
    });

    const content = response.choices[0]?.message?.content || '{}';
    const parsed = JSON.parse(content);

    const rawDefects = parsed.majorDefects || [];
    const rawBreakdown = parsed.defectBreakdown || [];

    const defaultBreakdown: DefectBreakdown[] = rawDefects.length > 0
      ? rawDefects.map((defect: string, i: number) => {
          const baseCost = 2000 + i * 500;
          const low = Math.round(baseCost * 0.85);
          const high = Math.round(baseCost * 1.2);
          return {
            issue: defect,
            severity: (i === 0 ? 'critical' : 'major') as DefectBreakdown['severity'],
            estimatedRepairCost: baseCost,
            estimatedRepairRange: { low, high },
            creditRecommendation: Math.round(baseCost * 0.85),
            anchorHighAmount: Math.round(baseCost * 1.05),
            consequentialDamageRisk: 'Further deterioration or secondary damage possible if deferred.',
            remainingUsefulLife: i === 0 ? 'Limited' : 'Unknown',
            repairVsCredit: 'request_credit' as const,
            sellerScript: `The inspection revealed ${defect.toLowerCase()}. We're requesting a credit toward closing to address this.`,
            collaborativeScript: `We'd like to work with you on ${defect.toLowerCase()}. A credit at closing would let us handle it and keep the deal moving.`,
            nuclearScript: `This item will need to be disclosed to every future buyer if not addressed. A credit now is the cleanest path.`,
            lenderImplication: 'May affect loan approval if safety-related.',
            codeComplianceNote: 'None noted.',
          };
        })
      : [];

    const normalizeSeverity = (s: string): DefectBreakdown['severity'] =>
      (['critical', 'major', 'moderate', 'monitor'].includes(s) ? s : 'moderate') as DefectBreakdown['severity'];

    const defectBreakdown: DefectBreakdown[] = (rawBreakdown.length > 0 ? rawBreakdown : defaultBreakdown).map(
      (d: Record<string, unknown>) => ({
        issue: String(d.issue ?? 'Unknown issue'),
        severity: normalizeSeverity(String(d.severity ?? 'moderate')),
        estimatedRepairCost: Number(d.estimatedRepairCost) || 2000,
        estimatedRepairRange: d.estimatedRepairRange && typeof d.estimatedRepairRange === 'object' && 'low' in d.estimatedRepairRange && 'high' in d.estimatedRepairRange
          ? { low: Number((d.estimatedRepairRange as { low: number }).low) || 1500, high: Number((d.estimatedRepairRange as { high: number }).high) || 3000 }
          : { low: Math.round((Number(d.estimatedRepairCost) || 2000) * 0.85), high: Math.round((Number(d.estimatedRepairCost) || 2000) * 1.2) },
        creditRecommendation: Number(d.creditRecommendation) || 1500,
        anchorHighAmount: (Number(d.anchorHighAmount) ?? Number(d.creditRecommendation)) || 2000,
        consequentialDamageRisk: String(d.consequentialDamageRisk ?? 'Potential for additional damage if not addressed.'),
        remainingUsefulLife: String(d.remainingUsefulLife ?? 'Unknown'),
        repairVsCredit: ['request_credit', 'request_repair', 'either'].includes(String(d.repairVsCredit)) ? d.repairVsCredit as DefectBreakdown['repairVsCredit'] : 'request_credit',
        sellerScript: String(d.sellerScript ?? 'We are requesting a credit for this item.'),
        collaborativeScript: String(d.collaborativeScript ?? d.sellerScript ?? 'We would like to find a solution that works for everyone.'),
        nuclearScript: String(d.nuclearScript ?? 'This must be disclosed to future buyers if not resolved.'),
        lenderImplication: String(d.lenderImplication ?? 'None specific'),
        codeComplianceNote: String(d.codeComplianceNote ?? 'None noted'),
      }),
    );

    const creativeAlternatives: CreativeAlternative[] = Array.isArray(parsed.creativeAlternatives)
      ? parsed.creativeAlternatives.map((a: Record<string, unknown>) => ({
          strategy: String(a.strategy ?? ''),
          description: String(a.description ?? ''),
          script: String(a.script ?? ''),
          estimatedValue: Number(a.estimatedValue) || 0,
        }))
      : [];

    return {
      majorDefects: Array.isArray(parsed.majorDefects) ? parsed.majorDefects : (defectBreakdown.map(d => d.issue)),
      summaryFindings: String(parsed.summaryFindings ?? 'Property condition summary not available.'),
      negotiationPoints: Array.isArray(parsed.negotiationPoints) ? parsed.negotiationPoints : ['Request seller credit for material defects', 'Negotiate repair allowances where appropriate'],
      estimatedCredit: Number(parsed.estimatedCredit) || defectBreakdown.reduce((sum, d) => sum + d.creditRecommendation, 0),
      defectBreakdown,
      openingStatement: String(parsed.openingStatement ?? "Based on the professional inspection, we've identified several items that need to be addressed. We'd like to work with you on a credit at closing."),
      closingStatement: String(parsed.closingStatement ?? "We believe a credit is fair given the scope of work required and keeps the deal moving for everyone."),
      anchorAmount: Number(parsed.anchorAmount) ?? (Number(parsed.estimatedCredit) || 0) * 1.15,
      walkawayThreshold: Number(parsed.walkawayThreshold) ?? Math.round((Number(parsed.estimatedCredit) || 5000) * 0.7),
      killShotSummary: String(parsed.killShotSummary ?? ''),
      psychologicalLeverage: Array.isArray(parsed.psychologicalLeverage) ? parsed.psychologicalLeverage : [],
      creativeAlternatives,
      calibratedQuestions: Array.isArray(parsed.calibratedQuestions) ? parsed.calibratedQuestions : [],
      accusationAudit: String(parsed.accusationAudit ?? ''),
      walkawayScript: String(parsed.walkawayScript ?? "We understand. If anything changes on your side, we're open to revisiting."),
      nibbleAsks: Array.isArray(parsed.nibbleAsks) ? parsed.nibbleAsks : [],
      disclosureWarning: String(parsed.disclosureWarning ?? ''),
      marketLeverageNotes: String(parsed.marketLeverageNotes ?? 'Use local comps and days on market to reinforce urgency.'),
    };
  } catch (error) {
    console.error("AI analysis error:", error);
    const fallbackBreakdown: DefectBreakdown[] = [
      {
        issue: "Roof needs inspection",
        severity: 'major',
        estimatedRepairCost: 2500,
        estimatedRepairRange: { low: 2000, high: 3500 },
        creditRecommendation: 2000,
        anchorHighAmount: 2800,
        consequentialDamageRisk: 'Leaks can lead to interior water damage and mold.',
        remainingUsefulLife: 'Limited',
        repairVsCredit: 'request_credit',
        sellerScript: "The roof shows signs of wear. We're requesting a credit to address this.",
        collaborativeScript: "We'd like to work with you on the roof. A credit at closing would let us handle it.",
        nuclearScript: "This will need to be disclosed to future buyers if not addressed.",
        lenderImplication: 'May affect insurance and loan condition.',
        codeComplianceNote: 'None noted.',
      },
      {
        issue: "Plumbing requires evaluation",
        severity: 'moderate',
        estimatedRepairCost: 1200,
        estimatedRepairRange: { low: 900, high: 1800 },
        creditRecommendation: 1000,
        anchorHighAmount: 1300,
        consequentialDamageRisk: 'Undetected leaks can cause water damage.',
        remainingUsefulLife: 'Unknown',
        repairVsCredit: 'either',
        sellerScript: "The plumbing system needs evaluation. A credit would be appropriate.",
        collaborativeScript: "We're open to either a credit or a repair before closing.",
        nuclearScript: "Any unrepaired defects must be disclosed to future buyers.",
        lenderImplication: 'None specific',
        codeComplianceNote: 'None noted.',
      },
    ];
    return {
      majorDefects: ["Roof needs inspection", "Plumbing requires evaluation"],
      summaryFindings: "Property requires professional assessment of key systems.",
      negotiationPoints: ["Request seller credit for material defects", "Negotiate repair allowances"],
      estimatedCredit: 3000,
      defectBreakdown: fallbackBreakdown,
      openingStatement: "Based on the inspection findings, we've identified items requiring attention. We'd like to discuss a credit at closing.",
      closingStatement: "We believe these credits are fair and allow everyone to move forward.",
      anchorAmount: 3500,
      walkawayThreshold: 2100,
      killShotSummary: '',
      psychologicalLeverage: [],
      creativeAlternatives: [],
      calibratedQuestions: [],
      accusationAudit: '',
      walkawayScript: "If anything changes, we're open to revisiting.",
      nibbleAsks: [],
      disclosureWarning: '',
      marketLeverageNotes: 'Use local comps and days on market to reinforce urgency.',
    };
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Setup authentication (must be before other routes)
  setupAuth(app);
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

      // Create the report (persist full analysis for View / My Reports battlecard)
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
        analysisJson: analysis as unknown as Record<string, unknown>,
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

      // Increment download count and return updated report so client sees new downloadCount
      await storage.incrementDownloadCount(reportId);
      const updatedReport = await storage.getReport(reportId);
      res.json({ report: updatedReport ?? report });
    } catch (error) {
      console.error("Download error:", error);
      res.status(500).json({ error: "Failed to download report" });
    }
  });

  // Get report analysis (full battlecard) — only for report owner or users who have downloaded
  app.get("/api/reports/:id/analysis", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const reportId = parseInt(req.params.id);
      const report = await storage.getReport(reportId);
      if (!report) {
        return res.status(404).json({ error: "Report not found" });
      }
      const owns = report.userId === userId;
      const hasDownloaded = await storage.hasUserDownloaded(userId, reportId);
      if (!owns && !hasDownloaded) {
        return res.status(403).json({ error: "Access denied" });
      }
      const analysis = report.analysisJson;
      if (analysis == null || typeof analysis !== "object") {
        return res.status(404).json({ error: "No analysis stored for this report" });
      }
      res.json(analysis);
    } catch (error) {
      console.error("Get report analysis error:", error);
      res.status(500).json({ error: "Failed to get analysis" });
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
        description: 'Welcome bonus for joining Inspectly!',
      });

      res.json({ credited: CREDIT_VALUES.SIGNUP_BONUS });
    } catch (error) {
      console.error("Signup bonus error:", error);
      res.status(500).json({ error: "Failed to process signup bonus" });
    }
  });

  // ============================================
  // PROPERTIES (Digital Vault)
  // ============================================

  // Get all properties for user
  app.get("/api/properties", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const props = await storage.getPropertiesByUser(userId);
      res.json({ properties: props });
    } catch (error) {
      console.error("Get properties error:", error);
      res.status(500).json({ error: "Failed to get properties" });
    }
  });

  // Create property
  const createPropertySchema = insertPropertySchema.extend({
    address: z.string().min(1, "Address is required"),
    status: z.enum(['watching', 'offer_pending', 'under_contract', 'closed', 'passed']).optional().default('watching'),
  }).omit({ userId: true });

  app.post("/api/properties", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const parseResult = createPropertySchema.safeParse(req.body);
      
      if (!parseResult.success) {
        return res.status(400).json({ error: parseResult.error.errors[0]?.message || "Invalid request" });
      }

      const property = await storage.createProperty({
        userId,
        ...parseResult.data,
      });

      res.json(property);
    } catch (error) {
      console.error("Create property error:", error);
      res.status(500).json({ error: "Failed to create property" });
    }
  });

  // Update property
  const updatePropertySchema = z.object({
    address: z.string().min(1).optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zipCode: z.string().optional(),
    latitude: z.string().optional(),
    longitude: z.string().optional(),
    status: z.enum(['watching', 'offer_pending', 'under_contract', 'closed', 'passed']).optional(),
    notes: z.string().optional(),
    purchasePrice: z.number().optional(),
    offerAmount: z.number().optional(),
    closingDate: z.string().transform(s => new Date(s)).optional(),
  });

  app.patch("/api/properties/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const propertyId = parseInt(req.params.id);

      if (isNaN(propertyId)) {
        return res.status(400).json({ error: "Invalid property ID" });
      }

      const parseResult = updatePropertySchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: parseResult.error.errors[0]?.message || "Invalid request" });
      }

      const property = await storage.getProperty(propertyId);
      if (!property) {
        return res.status(404).json({ error: "Property not found" });
      }
      if (property.userId !== userId) {
        return res.status(403).json({ error: "Not authorized" });
      }

      const updated = await storage.updateProperty(propertyId, parseResult.data);
      res.json(updated);
    } catch (error) {
      console.error("Update property error:", error);
      res.status(500).json({ error: "Failed to update property" });
    }
  });

  // Delete property
  app.delete("/api/properties/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const propertyId = parseInt(req.params.id);

      const property = await storage.getProperty(propertyId);
      if (!property) {
        return res.status(404).json({ error: "Property not found" });
      }
      if (property.userId !== userId) {
        return res.status(403).json({ error: "Not authorized" });
      }

      await storage.deleteProperty(propertyId);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete property error:", error);
      res.status(500).json({ error: "Failed to delete property" });
    }
  });

  // Link report to property
  const linkReportSchema = z.object({
    reportId: z.number().int().positive("Report ID is required"),
  });

  app.post("/api/properties/:id/reports", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const propertyId = parseInt(req.params.id);

      if (isNaN(propertyId)) {
        return res.status(400).json({ error: "Invalid property ID" });
      }

      const parseResult = linkReportSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: parseResult.error.errors[0]?.message || "Invalid request" });
      }

      const property = await storage.getProperty(propertyId);
      if (!property) {
        return res.status(404).json({ error: "Property not found" });
      }
      if (property.userId !== userId) {
        return res.status(403).json({ error: "Not authorized" });
      }

      const link = await storage.linkPropertyReport({ propertyId, reportId: parseResult.data.reportId });
      res.json(link);
    } catch (error) {
      console.error("Link report error:", error);
      res.status(500).json({ error: "Failed to link report" });
    }
  });

  return httpServer;
}
