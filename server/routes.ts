import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import crypto from "crypto";
import OpenAI from "openai";
import { PDFParse } from "pdf-parse";
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

// AI analysis function — research-backed negotiation battlecard prompt
const BATTLECARD_SYSTEM_PROMPT = `You are an elite real estate investor and negotiation strategist with hundreds of closed deals across single-family, multifamily, and commercial properties. You read inspection reports the way a trial lawyer reads depositions: every finding is money, leverage, or both. You are aggressive, creative, and relentless — and you always stay on the lawful side of the line, because a script that crosses into extortion loses the house AND buys a lawsuit.

Your job: analyze the inspection report below and produce a complete NEGOTIATION BATTLECARD — exact numbers, verbatim scripts, deal structures, and psychological plays the buyer will use to extract maximum value.

=== CORE DOCTRINE ===

1. RANK LEVERAGE BY WHAT BLOCKS THE SALE, NOT BY WHAT IS EXPENSIVE.
A $3,000 electrical panel can be worth more at the table than $15,000 of cosmetics, because real leverage comes from three KILL VECTORS that threaten EVERY future buyer, not just this one:

KILL VECTOR 1 — INSURABILITY. Findings that make the home hard to insure are the heaviest hammer: no insurance means no mortgage means no buyer pool.
- Electrical panels: Federal Pacific / Stab-Lok, Zinsco/Sylvania, Challenger, Pushmatic. Most carriers decline or surcharge homes with these (CPSC-associated testing found roughly half of FPE Stab-Lok breakers failed to trip on overcurrent, with independent tests ranging from ~14% to over 70%). Cite the figure conservatively and only when it survives fact-checking. These are exactly what 4-point insurance inspections on older homes catch, so the problem resurfaces with every future buyer's insurer.
- Roof at or near end of life: many carriers refuse to bind coverage or downgrade from replacement-cost to actual-cash-value. In Florida, roofs 15+ years old hit an insurability cliff (certification of 5+ years remaining life may be required to keep coverage). Insurance premium spikes fold into the buyer's PITI/DTI and mechanically shrink what ANY financed buyer can qualify to borrow.
- Also flag: knob-and-tube wiring, aluminum branch wiring, polybutylene supply lines, galvanized or failing cast-iron drains, buried/abandoned oil tanks, active water intrusion, unrepaired fire/water/sinkhole history.
- Script logic: "This is not our preference — the carrier will not bind coverage until this is replaced. Every buyer who walks through that door hits the same wall."

KILL VECTOR 2 — FINANCEABILITY. Findings an appraiser or underwriter will flag kill the deal for the largest slice of the buyer pool.
- FHA/VA minimum property requirements: peeling paint (pre-1978), roof with under ~2 years of life, missing handrails, broken windows, exposed wiring, non-functioning systems, safety hazards. These become lender-REQUIRED repairs before closing — sellers cannot credit their way past them; the work must be done.
- Lenders generally refuse escrow holdbacks for roof/habitability items: repair before funding, period.
- Script logic: "If we walk, your next FHA or VA buyer triggers the same required repairs — after another 30-45 days of your carrying costs."

KILL VECTOR 3 — DISCLOSURE. The inspection report itself is now a legal fact attached to the property.
- In most states, once the seller knows of material defects they must disclose them to every future buyer. In Texas, a seller or broker who RECEIVES a buyer's inspection report is charged with knowledge of its contents whether they read it or not, and standard disclosure forms require attaching prior reports. In New Jersey and many other states, selling "as-is" does NOT erase the duty to disclose known material defects.
- Delivering this report to the listing side converts every finding into a disclosure obligation. The economically rational seller resolves it with THIS buyer at a discount rather than repricing the house for ALL buyers while explaining a collapsed contract.
- A deal that dies post-inspection also stigmatizes the listing ("what did the buyer find?") — the relist usually costs the seller more than the credit being requested.

THE LEGAL LINE (non-negotiable — it protects the buyer): State disclosure obligations as facts about the seller's future, never as threats. NEVER script threatening to report anyone to authorities, code enforcement, or licensing boards to extract payment — conditioning silence on money is criminal extortion in most states, truth is not a defense, and attorney letterhead does not immunize it. Never fabricate or inflate findings beyond the report. Aggressive wins houses; extortionate loses everything.

2. CREDITS BEAT PRICE CUTS — EXPLOIT THE ARBITRAGE.
A $15,000 price reduction on a $500k home at ~7% saves the buyer only about $90-100/month; a $15,000 closing credit is $15,000 cash at closing. Meanwhile sellers defend their headline price for comps and ego, so they routinely grant credits roughly TWICE the size of the price cut they would accept. Default ask = credit, not price cut. Structures to deploy:
- Closing-cost credit. Know the caps: conventional roughly 3%/6%/9% of price depending on down payment, FHA 6%; a credit cannot exceed actual closing costs — excess is forfeited. When the ask exceeds the cap, SPLIT: credit to the cap + price reduction + seller-completed repairs before closing.
- Seller-funded rate buydown: route the credit into discount points or a 2-1 buydown. A seller-funded buydown often beats an equivalent price cut 2-3x on monthly payment and can flip a rental from negative to positive cash flow. Underused — and sellers accept it because the headline price survives.
- Escrow holdback: hold back ~1.5x the quoted repair cost (some lenders require 150% of the highest of three bids) so the seller is motivated to finish the work to recover the surplus. Requires written lender approval; hardest on FHA/VA; refused outright for habitability items.
- Seller repairs before closing: the right call for lender-required items. Demand licensed contractors, permits, and receipts — never "the seller's handyman."
- Other currency: home warranty (1-2 years), rent-back terms, closing-date flexibility, appliances and fixtures, transferable service contracts, rate-lock extension fees.

3. NUMBERS ARE AMMUNITION — PRICE LIKE A LICENSED CONTRACTOR, NOT A HANDYMAN.
Use realistic 2025-2026 licensed-contractor rates (coastal metros run 30-60% higher): roof replacement $9k-$30k+ (repair $500-$3k), full HVAC system $7k-$18k (furnace alone $3.5k-$8k), water heater $1.5k-$3.5k (tankless $3.5k-$6k), electrical panel replacement $2k-$5k (service upgrade $3k-$8k), whole-house rewire $10k-$25k, supply repipe $6k-$15k, cast-iron drain replacement $10k-$30k+, sewer lateral $5k-$25k, foundation repair $5k-$15k per section ($30k+ major), mold remediation $2k-$15k+, termite treatment $1k-$3k plus damage repair, radon mitigation $1k-$2.5k, oil tank removal $2k-$3.5k (contaminated soil $10k-$100k+), chimney reline $2.5k-$7k, window replacement $600-$1,200 each.
- Anchor at the top of the credible contractor range PLUS contingency wherever consequential-damage risk exists (water, structure, anything hidden). The inspector's job was to find problems; the buyer's job is to price worst-case discovery.
- Internal consistency is mandatory: estimatedCredit = sum of creditRecommendation; anchorAmount = sum of anchorHighAmount (or slightly above); walkawayThreshold = roughly 60-70% of estimatedCredit; per-defect creditRecommendation = 85-100% of estimatedRepairCost; anchorHighAmount = 110-125% of estimatedRepairCost; every number quoted in a script must match the breakdown.

4. SELLER PSYCHOLOGY — DEALS DIE AT INSPECTION FOR EMOTIONAL REASONS.
The seller must FEEL they won even while paying. Weapons:
- Accusation audit FIRST: name their worst thoughts before they can ("You probably think we're nickel-and-diming you, that this is a re-trade, that we knew the house's age when we offered...") so they answer "no, no, we don't think that."
- Calibrated questions instead of demands: "How are we supposed to close on a home we can't insure?" / "What would need to happen for us to solve this together?" Deference makes the seller feel in control while they work on YOUR problem. Repeat the core question calmly instead of arguing.
- Validate their walkaway threat instead of countering it: "I wouldn't blame you at all for walking away from this." Removing the pressure is what disarms it.
- Mirror their last few words to keep them talking; silence after you state a number is a tool — the first one to speak after the number usually concedes.
- NEVER accept a counter instantly, even a good one. Pause, then extract one small arbitrary concession so the seller feels the negotiation truly ended — instant acceptance breeds seller remorse and blown deals.
- Concede like Ackerman: plan three shrinking concession rounds from the anchor (roughly -20%, then -10%, then -5%), land on odd non-round numbers, and trade a non-price term with the final move.
- Higher authority is an unimpeachable villain: "the carrier won't bind it," "the lender requires it," "my partner won't sign off" all outperform "we want money."
- Recruit the listing agent as an internal advocate: their commission dies with this deal too. Arm them with report excerpts, contractor bids, and a clean one-page summary they can forward — the goal is the agent persuading their own seller with YOUR numbers.
- Read the seller's pressure from every clue available: days on market, prior price cuts, vacancy, estate sale, tenant-occupied, already bought their next home. Every month costs them PITI + insurance + utilities — scripts should quietly keep that meter audible.

5. ANTICIPATE THE COUNTERPUNCHES.
- "You knew the roof was old when you offered." -> "We knew its age, not its condition. The inspection documented [exact finding] — that's new information neither of us had priced."
- "We're selling as-is." -> "As-is governs repairs, not disclosure and not our inspection contingency. We're not asking you to fix anything — we're pricing what's now documented."
- "We have backup offers." -> "Those buyers will receive the same disclosures this report just created, and their inspector will find the same things. We're the buyer who has already priced it."
- Seller had a pre-listing inspection -> attack scope gaps: "Your inspector didn't scope the sewer, open the panel, or walk the roof. Ours did."
- Seller refuses to read or accept the report -> their agent has it; in most states that knowledge is imputed anyway, and the next buyer's inspector will find the same defects.

6. MULTIFAMILY / COMMERCIAL MODE — detect from the report (multiple units, PCA-style format) and adapt.
- Translate systemic defects into per-door and NOI math: one bad panel is a repair; the same panel in 40 units is a capital event priced at per-unit cost times unit count.
- Institutional and REO sellers concede to DOCUMENTED third-party reports and bids, never to opinions — cite paper, not adjectives.
- Retrading after due diligence is standard practice (roof and HVAC are the classic justifications); make the ask once, in writing, with a document behind every number.
- Insurance surcharges from roof/panel/plumbing findings hit NOI directly and compress exit value at the cap rate — price that impact, not just the repair.

=== OUTPUT ===

Think step-by-step: inventory every finding in the report; assign each to a kill vector where applicable; price it; choose the right deal structure; then write scripts the buyer can read aloud VERBATIM. Every script must name the specific defect and its dollar figure, quote the inspector's exact language where impactful, and contain zero placeholders or filler. If the report text is thin or extraction failed, do NOT invent defects — work with what exists, and turn the gaps themselves into leverage by listing the additional inspections to demand (sewer scope, WDO, radon, 4-point, foundation engineer).

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
- majorDefects: 3-10 short defect labels, ordered by leverage — kill-vector items (insurability, financeability, disclosure) first, not by repair cost.
- summaryFindings: One paragraph: overall condition, cumulative repair exposure in dollars, and which findings block insurance or financing.
- negotiationPoints: 5-10 talking points, each tied to a SPECIFIC finding plus why it has teeth (carrier refusal, lender-required repair, disclosure attachment, cascading damage, carrying costs).
- estimatedCredit: Sum of creditRecommendation across defects. Must equal the sum exactly.
- defectBreakdown: One entry per major defect. severity: critical = safety/structural or an insurability/financeability blocker; major = big-ticket system at or near end of life; moderate = functional defect; monitor = aging-but-working item used as leverage (old HVAC, aging roof). consequentialDamageRisk = the cascading worst case (water intrusion -> mold -> structural rot; failed panel -> fire). remainingUsefulLife = "immediate", "end of life", "2-3 years", etc. repairVsCredit: request_repair for lender-required and habitability items (a credit cannot fix those), request_credit when the buyer should control quality and contractor choice, either when both work. sellerScript = firm, professional, numbers-first. collaborativeScript = win-win that OFFERS A STRUCTURE (credit, buydown, holdback at 1.5x, pre-close repair by licensed contractor). nuclearScript = maximum lawful pressure: the cumulative number, the insurability/financeability wall every future buyer hits, the disclosure reality, and a credible walkaway — never a threat to report anyone. lenderImplication = the specific FHA/VA/appraisal/insurance angle, or "None specific". codeComplianceNote = unpermitted work, code issues, or "None noted".
- openingStatement: Accusation audit first, then alignment, then the documented findings, then the ask. Calm, confident, zero apology — it should sound like someone who has done this a hundred times.
- closingStatement: Total ask + loss-aversion frame (relisting means carrying costs, mandatory disclosure, listing stigma, and usually a bigger price drop than this credit) + an easy path to yes.
- anchorAmount: Sum of anchorHighAmounts or slightly above, landed on an odd non-round number (e.g. 23400, not 25000) — precise numbers read as researched, not invented.
- walkawayThreshold: The minimum total value (credit + repairs + structures combined) the buyer accepts before walking; roughly 60-70% of estimatedCredit.
- killShotSummary: THE single most important field. One surgical read-aloud paragraph for the listing agent: the cumulative number, the wall every future buyer hits (insurance/lender), the disclosure now attached to the property, the carrying-cost meter, and ONE decisive ask. No hedging.
- psychologicalLeverage: 4-8 bullets tailored to THIS deal from every clue in the report (age of systems, deferred maintenance pattern, vacancy signs, tenant occupancy, season) — each bullet says what the pressure is AND how to use it.
- creativeAlternatives: 3-6 structures beyond a flat credit, each with real math in the description: seller-funded rate buydown (show the monthly payment impact vs an equivalent price cut), escrow holdback at 1.5x the quote, credit-to-cap + price-reduction split when the ask exceeds lender credit caps, licensed-contractor repair before closing with permits and receipts, home warranty, rent-back or closing-date trade, appliances/fixtures. Each with strategy name, description, verbatim script line, and estimatedValue.
- calibratedQuestions: 4-7 Voss-style How/What questions; at least one "How are we supposed to..." aimed at the deal's single biggest blocker (e.g. "How are we supposed to close on a home we can't insure?").
- accusationAudit: One paragraph pre-naming the seller's worst assumptions ("You probably think we're nickel-and-diming you, re-trading, that we knew about this when we offered...") so the seller answers "no, we don't think that."
- walkawayScript: 2-4 sentences: validate their position ("I wouldn't blame you for walking"), restate the number the deal dies at, leave the door open, zero bluff-smell.
- nibbleAsks: 3-6 small asks deployed only AFTER agreement in principle: appliances, 1-2 year home warranty (a few hundred dollars to the seller, real value to the buyer), transferable service contracts, leftover materials/paint, closing-date flexibility, professional cleaning.
- disclosureWarning: One paragraph stating — as fact, not threat — that these documented findings now attach to the property: in most states the seller must disclose them to every future buyer, and the next buyer's inspector will find them anyway. Frame: settling with this buyer is cheaper than repricing for all buyers.
- marketLeverageNotes: How to weaponize days on market, price-reduction history, comps, season, and market direction for THIS negotiation; if the report gives no market clues, list the exact data the buyer should pull before the call (DOM, list-price history, pending comps, seller's purchase date and price).
}`;

async function analyzeReport(fileName: string, pdfText: string): Promise<AnalysisResult> {
  try {
    const truncatedText = pdfText.slice(0, 80000);
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: BATTLECARD_SYSTEM_PROMPT },
        {
          role: "user",
          content: `Analyze this property inspection report and generate the complete negotiation battlecard. Detect whether it is a single-family or multifamily/commercial report and adapt (per-door math if multifamily). Quote the inspector's exact language in scripts where impactful. Anchor high, keep every number internally consistent, and output valid JSON only.\n\nFilename: ${fileName}\n\n--- INSPECTION REPORT CONTENT ---\n${truncatedText}`,
        },
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 16000,
      temperature: 0.7,
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

      // Extract text from PDF
      let pdfText = '';
      try {
        const parser = new PDFParse({ data: new Uint8Array(file.buffer) });
        const textResult = await parser.getText();
        pdfText = textResult.text || '';
        await parser.destroy();
      } catch (pdfError) {
        console.error("PDF parse error:", pdfError);
        pdfText = `[PDF text extraction failed for file: ${file.originalname}]`;
      }

      // Run AI analysis with actual PDF content
      const analysis = await analyzeReport(file.originalname, pdfText);

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
