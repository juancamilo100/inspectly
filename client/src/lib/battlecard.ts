import jsPDF from "jspdf";

export interface DefectBreakdown {
  issue: string;
  severity: "critical" | "major" | "moderate" | "monitor";
  estimatedRepairCost: number;
  estimatedRepairRange?: { low: number; high: number };
  creditRecommendation: number;
  anchorHighAmount?: number;
  consequentialDamageRisk?: string;
  remainingUsefulLife?: string;
  repairVsCredit: "request_credit" | "request_repair" | "either";
  sellerScript: string;
  collaborativeScript?: string;
  nuclearScript?: string;
  lenderImplication?: string;
  codeComplianceNote?: string;
}

export interface CreativeAlternative {
  strategy: string;
  description: string;
  script: string;
  estimatedValue: number;
}

export interface AIAnalysis {
  majorDefects: string[];
  summaryFindings: string;
  negotiationPoints: string[];
  estimatedCredit: number;
  defectBreakdown?: DefectBreakdown[];
  openingStatement?: string;
  closingStatement?: string;
  anchorAmount?: number;
  walkawayThreshold?: number;
  killShotSummary?: string;
  psychologicalLeverage?: string[];
  creativeAlternatives?: CreativeAlternative[];
  calibratedQuestions?: string[];
  accusationAudit?: string;
  walkawayScript?: string;
  nibbleAsks?: string[];
  disclosureWarning?: string;
  marketLeverageNotes?: string;
}

export function generateBattlecardText(analysis: AIAnalysis, address: string): string {
  let text = `NEGOTIATION BATTLECARD - ${address}\n`;
  text += `${"=".repeat(50)}\n\n`;
  text += `ANCHOR (open): $${(analysis.anchorAmount ?? analysis.estimatedCredit).toLocaleString()}  |  TARGET: $${analysis.estimatedCredit.toLocaleString()}  |  WALK AWAY: $${(analysis.walkawayThreshold ?? Math.round(analysis.estimatedCredit * 0.7)).toLocaleString()}\n\n`;
  if (analysis.killShotSummary) {
    text += `KILL SHOT SUMMARY:\n"${analysis.killShotSummary}"\n\n`;
  }
  if (analysis.accusationAudit) {
    text += `ACCUSATION AUDIT:\n"${analysis.accusationAudit}"\n\n`;
  }
  if (analysis.openingStatement) {
    text += `OPENING STATEMENT:\n"${analysis.openingStatement}"\n\n`;
  }
  text += `ISSUE BREAKDOWN:\n`;
  if (analysis.defectBreakdown && analysis.defectBreakdown.length > 0) {
    analysis.defectBreakdown.forEach((defect, i) => {
      text += `\n${i + 1}. ${defect.issue}\n`;
      text += `   Severity: ${defect.severity.toUpperCase()}\n`;
      if (defect.estimatedRepairRange) {
        text += `   Est. Repair: $${defect.estimatedRepairRange.low.toLocaleString()}–$${defect.estimatedRepairRange.high.toLocaleString()}\n`;
      } else {
        text += `   Est. Repair: $${defect.estimatedRepairCost.toLocaleString()}\n`;
      }
      text += `   Credit Ask: $${defect.creditRecommendation.toLocaleString()}`;
      if (defect.anchorHighAmount) text += `  (Anchor: $${defect.anchorHighAmount.toLocaleString()})`;
      text += `\n`;
      if (defect.consequentialDamageRisk) text += `   Cascading risk: ${defect.consequentialDamageRisk}\n`;
      if (defect.remainingUsefulLife) text += `   Remaining life: ${defect.remainingUsefulLife}\n`;
      text += `   Strategy: ${defect.repairVsCredit === "request_credit" ? "Request Credit" : defect.repairVsCredit === "request_repair" ? "Seller Repair" : "Either Option"}\n`;
      text += `   Script (firm): "${defect.sellerScript}"\n`;
      if (defect.collaborativeScript) text += `   Script (collab): "${defect.collaborativeScript}"\n`;
      if (defect.nuclearScript) text += `   Script (nuclear): "${defect.nuclearScript}"\n`;
    });
  } else {
    analysis.majorDefects.forEach((defect, i) => {
      text += `${i + 1}. ${defect}\n`;
    });
  }
  text += `\nKEY NEGOTIATION POINTS:\n`;
  analysis.negotiationPoints.forEach((point, i) => {
    text += `${i + 1}. ${point}\n`;
  });
  if (analysis.calibratedQuestions && analysis.calibratedQuestions.length > 0) {
    text += `\nCALIBRATED QUESTIONS:\n`;
    analysis.calibratedQuestions.forEach((q) => {
      text += `"${q}"\n`;
    });
  }
  if (analysis.psychologicalLeverage && analysis.psychologicalLeverage.length > 0) {
    text += `\nPSYCHOLOGICAL LEVERAGE:\n`;
    analysis.psychologicalLeverage.forEach((p) => {
      text += `• ${p}\n`;
    });
  }
  if (analysis.creativeAlternatives && analysis.creativeAlternatives.length > 0) {
    text += `\nCREATIVE ALTERNATIVES:\n`;
    analysis.creativeAlternatives.forEach((a, i) => {
      text += `${i + 1}. ${a.strategy} (est. value $${a.estimatedValue.toLocaleString()})\n   ${a.description}\n   Script: "${a.script}"\n`;
    });
  }
  if (analysis.nibbleAsks && analysis.nibbleAsks.length > 0) {
    text += `\nNIBBLE ASKS:\n`;
    analysis.nibbleAsks.forEach((n) => {
      text += `• ${n}\n`;
    });
  }
  if (analysis.disclosureWarning) {
    text += `\nDISCLOSURE WARNING:\n"${analysis.disclosureWarning}"\n\n`;
  }
  if (analysis.closingStatement) {
    text += `\nCLOSING STATEMENT:\n"${analysis.closingStatement}"\n`;
  }
  if (analysis.walkawayScript) {
    text += `\nWALKAWAY SCRIPT:\n"${analysis.walkawayScript}"\n`;
  }
  text += `\n${"=".repeat(50)}\nGenerated by Inspectly AI Deal Coach\n`;
  return text;
}

export function downloadBattlecardPDF(analysis: AIAnalysis, address: string): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const maxWidth = pageWidth - margin * 2;
  let y = 20;

  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("NEGOTIATION BATTLECARD", margin, y);
  y += 10;
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text(address, margin, y);
  y += 15;
  const anchor = analysis.anchorAmount ?? analysis.estimatedCredit;
  const walkaway = analysis.walkawayThreshold ?? Math.round(analysis.estimatedCredit * 0.7);
  doc.setFontSize(10);
  doc.text(`Anchor: $${anchor.toLocaleString()}  |  Target: $${analysis.estimatedCredit.toLocaleString()}  |  Walk away: $${walkaway.toLocaleString()}`, margin, y);
  y += 10;
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(`TOTAL CREDIT REQUEST: $${analysis.estimatedCredit.toLocaleString()}`, margin, y);
  y += 15;
  if (analysis.killShotSummary) {
    if (y > 240) {
      doc.addPage();
      y = 20;
    }
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("KILL SHOT SUMMARY:", margin, y);
    y += 6;
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    const killLines = doc.splitTextToSize(`"${analysis.killShotSummary}"`, maxWidth);
    doc.text(killLines, margin, y);
    y += killLines.length * 4 + 10;
  }
  if (analysis.openingStatement) {
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("OPENING STATEMENT:", margin, y);
    y += 6;
    doc.setFont("helvetica", "italic");
    const lines = doc.splitTextToSize(`"${analysis.openingStatement}"`, maxWidth);
    doc.text(lines, margin, y);
    y += lines.length * 5 + 10;
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("ISSUE BREAKDOWN:", margin, y);
  y += 8;
  if (analysis.defectBreakdown && analysis.defectBreakdown.length > 0) {
    analysis.defectBreakdown.forEach((defect, i) => {
      if (y > 250) {
        doc.addPage();
        y = 20;
      }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text(`${i + 1}. ${defect.issue}`, margin, y);
      y += 5;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(`Severity: ${defect.severity.toUpperCase()}`, margin + 5, y);
      y += 4;
      const repairStr = defect.estimatedRepairRange
        ? `Est. Repair: $${defect.estimatedRepairRange.low.toLocaleString()}–$${defect.estimatedRepairRange.high.toLocaleString()}`
        : `Est. Repair: $${defect.estimatedRepairCost.toLocaleString()}`;
      doc.text(`${repairStr} | Credit Ask: $${defect.creditRecommendation.toLocaleString()}${defect.anchorHighAmount ? ` (Anchor: $${defect.anchorHighAmount.toLocaleString()})` : ""}`, margin + 5, y);
      y += 4;
      if (defect.consequentialDamageRisk) {
        const riskLines = doc.splitTextToSize(`Risk: ${defect.consequentialDamageRisk}`, maxWidth - 5);
        doc.text(riskLines, margin + 5, y);
        y += riskLines.length * 4;
      }
      doc.text(`Strategy: ${defect.repairVsCredit === "request_credit" ? "Request Credit" : defect.repairVsCredit === "request_repair" ? "Seller Repair" : "Either"}`, margin + 5, y);
      y += 5;
      doc.setFont("helvetica", "italic");
      const scriptLines = doc.splitTextToSize(`Script: "${defect.sellerScript}"`, maxWidth - 5);
      doc.text(scriptLines, margin + 5, y);
      y += scriptLines.length * 4 + 8;
    });
  }
  if (y > 240) {
    doc.addPage();
    y = 20;
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("KEY NEGOTIATION POINTS:", margin, y);
  y += 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  analysis.negotiationPoints.forEach((point, i) => {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
    const pointLines = doc.splitTextToSize(`${i + 1}. ${point}`, maxWidth);
    doc.text(pointLines, margin, y);
    y += pointLines.length * 4 + 3;
  });
  if (analysis.calibratedQuestions && analysis.calibratedQuestions.length > 0) {
    if (y > 230) {
      doc.addPage();
      y = 20;
    }
    y += 5;
    doc.setFont("helvetica", "bold");
    doc.text("CALIBRATED QUESTIONS:", margin, y);
    y += 8;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    analysis.calibratedQuestions.forEach((q, i) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      const qLines = doc.splitTextToSize(`${i + 1}. "${q}"`, maxWidth);
      doc.text(qLines, margin, y);
      y += qLines.length * 4 + 3;
    });
    y += 5;
  }
  if (analysis.psychologicalLeverage && analysis.psychologicalLeverage.length > 0) {
    if (y > 230) {
      doc.addPage();
      y = 20;
    }
    doc.setFont("helvetica", "bold");
    doc.text("PSYCHOLOGICAL LEVERAGE:", margin, y);
    y += 8;
    doc.setFont("helvetica", "normal");
    analysis.psychologicalLeverage.forEach((p) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      const pLines = doc.splitTextToSize(`• ${p}`, maxWidth);
      doc.text(pLines, margin, y);
      y += pLines.length * 4 + 2;
    });
    y += 5;
  }
  if (analysis.creativeAlternatives && analysis.creativeAlternatives.length > 0) {
    if (y > 220) {
      doc.addPage();
      y = 20;
    }
    doc.setFont("helvetica", "bold");
    doc.text("CREATIVE ALTERNATIVES:", margin, y);
    y += 8;
    doc.setFont("helvetica", "normal");
    analysis.creativeAlternatives.forEach((a, i) => {
      if (y > 250) {
        doc.addPage();
        y = 20;
      }
      doc.setFontSize(9);
      doc.text(`${i + 1}. ${a.strategy} (est. $${a.estimatedValue.toLocaleString()})`, margin, y);
      y += 4;
      const descLines = doc.splitTextToSize(a.description, maxWidth);
      doc.text(descLines, margin + 5, y);
      y += descLines.length * 4 + 2;
      const scriptLines = doc.splitTextToSize(`"${a.script}"`, maxWidth - 5);
      doc.text(scriptLines, margin + 5, y);
      y += scriptLines.length * 4 + 6;
    });
    y += 5;
  }
  if (analysis.nibbleAsks && analysis.nibbleAsks.length > 0) {
    if (y > 250) {
      doc.addPage();
      y = 20;
    }
    doc.setFont("helvetica", "bold");
    doc.text("NIBBLE ASKS:", margin, y);
    y += 8;
    doc.setFont("helvetica", "normal");
    analysis.nibbleAsks.forEach((n) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      const nLines = doc.splitTextToSize(`• ${n}`, maxWidth);
      doc.text(nLines, margin, y);
      y += nLines.length * 4 + 2;
    });
    y += 5;
  }
  if (analysis.disclosureWarning) {
    if (y > 240) {
      doc.addPage();
      y = 20;
    }
    doc.setFont("helvetica", "bold");
    doc.text("DISCLOSURE WARNING:", margin, y);
    y += 6;
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    const discLines = doc.splitTextToSize(analysis.disclosureWarning, maxWidth);
    doc.text(discLines, margin, y);
    y += discLines.length * 4 + 10;
  }
  if (analysis.closingStatement) {
    if (y > 250) {
      doc.addPage();
      y = 20;
    }
    y += 5;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("CLOSING STATEMENT:", margin, y);
    y += 6;
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    const closingLines = doc.splitTextToSize(`"${analysis.closingStatement}"`, maxWidth);
    doc.text(closingLines, margin, y);
    y += closingLines.length * 4 + 8;
  }
  if (analysis.walkawayScript) {
    if (y > 250) {
      doc.addPage();
      y = 20;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("WALKAWAY SCRIPT:", margin, y);
    y += 6;
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    const walkLines = doc.splitTextToSize(`"${analysis.walkawayScript}"`, maxWidth);
    doc.text(walkLines, margin, y);
  }
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("Generated by Inspectly AI Deal Coach", margin, doc.internal.pageSize.getHeight() - 10);
  doc.save(`battlecard-${address.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase()}.pdf`);
}
