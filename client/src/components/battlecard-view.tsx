import { useState } from "react";
import {
  AlertCircle,
  CheckCircle,
  Copy,
  CreditCard,
  DollarSign,
  FileText,
  MessageSquare,
  Wrench,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import type { Report } from "@shared/schema";
import type { AIAnalysis } from "@/lib/battlecard";
import { generateBattlecardText, downloadBattlecardPDF } from "@/lib/battlecard";

export interface BattlecardViewProps {
  report: Report;
  analysis: AIAnalysis;
  /** Show Copy / Export buttons above the content */
  showActions?: boolean;
  /** Optional class for the root */
  className?: string;
}

export function BattlecardView({ report, analysis, showActions = true, className = "" }: BattlecardViewProps) {
  const { toast } = useToast();
  const [scriptTone, setScriptTone] = useState<"firm" | "collaborative" | "nuclear">("firm");
  const address = report.propertyAddress;

  return (
    <div className={`space-y-6 ${className}`}>
      {showActions && (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const battlecard = generateBattlecardText(analysis, address);
              navigator.clipboard.writeText(battlecard);
              toast({ title: "Copied!", description: "Battlecard copied to clipboard." });
            }}
          >
            <Copy className="w-4 h-4 mr-1" />
            Copy
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => downloadBattlecardPDF(analysis, address)}
          >
            <FileText className="w-4 h-4 mr-1" />
            Export PDF
          </Button>
        </div>
      )}

      {/* Anchor / Target / Walkaway */}
      {(analysis.anchorAmount != null || analysis.walkawayThreshold != null) && (
        <div className="p-4 rounded-lg bg-muted/50 border flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            {analysis.anchorAmount != null && (
              <div>
                <p className="text-xs text-muted-foreground">Anchor (open high)</p>
                <p className="text-lg font-mono font-semibold">${analysis.anchorAmount.toLocaleString()}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-muted-foreground">Target credit</p>
              <p className="text-lg font-mono font-semibold text-green-600 dark:text-green-400">
                ${analysis.estimatedCredit.toLocaleString()}
              </p>
            </div>
            {analysis.walkawayThreshold != null && (
              <div>
                <p className="text-xs text-muted-foreground">Walk away below</p>
                <p className="text-lg font-mono font-semibold text-amber-600 dark:text-amber-400">
                  ${analysis.walkawayThreshold.toLocaleString()}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Kill Shot */}
      {analysis.killShotSummary && (
        <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
          <h4 className="font-semibold text-sm flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-amber-500" />
            Kill Shot Summary
          </h4>
          <p className="text-sm text-muted-foreground italic">&ldquo;{analysis.killShotSummary}&rdquo;</p>
          <Button
            variant="ghost"
            size="sm"
            className="mt-2"
            onClick={() => {
              navigator.clipboard.writeText(analysis.killShotSummary || "");
              toast({ title: "Copied!" });
            }}
          >
            <Copy className="w-3 h-3 mr-1" /> Copy
          </Button>
        </div>
      )}

      {/* Total Credit Request */}
      <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-green-500/20 flex items-center justify-center">
              <DollarSign className="w-7 h-7 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Recommended Credit Request</p>
              <p className="text-3xl font-bold font-mono text-green-500">
                ${analysis.estimatedCredit.toLocaleString()}
              </p>
            </div>
          </div>
          <Badge className="bg-green-500/20 text-green-600 border-green-500/30">
            Based on {analysis.defectBreakdown?.length || analysis.majorDefects.length} issues
          </Badge>
        </div>
      </div>

      {/* Disclosure Warning */}
      {analysis.disclosureWarning && (
        <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30">
          <h4 className="font-semibold text-sm text-destructive mb-2">Disclosure leverage</h4>
          <p className="text-sm text-muted-foreground">{analysis.disclosureWarning}</p>
        </div>
      )}

      <Tabs defaultValue="breakdown" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
          <TabsTrigger value="scripts">Scripts</TabsTrigger>
          <TabsTrigger value="tactics">Tactics</TabsTrigger>
          <TabsTrigger value="alternatives">Alternatives</TabsTrigger>
          <TabsTrigger value="summary">Summary</TabsTrigger>
        </TabsList>

        <TabsContent value="breakdown" className="space-y-4 mt-4">
          {analysis.defectBreakdown && analysis.defectBreakdown.length > 0 ? (
            <div className="space-y-3">
              {analysis.defectBreakdown.map((defect, index) => (
                <div key={index} className="p-4 rounded-lg bg-background border">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                          defect.severity === "critical"
                            ? "bg-destructive/10 text-destructive"
                            : defect.severity === "major"
                              ? "bg-orange-500/10 text-orange-500"
                              : defect.severity === "moderate"
                                ? "bg-yellow-500/10 text-yellow-500"
                                : "bg-blue-500/10 text-blue-500"
                        }`}
                      >
                        <AlertCircle className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-medium">{defect.issue}</p>
                        <Badge variant="outline" className="mt-1 text-xs capitalize">
                          {defect.severity}
                        </Badge>
                      </div>
                    </div>
                    <Badge
                      className={`flex-shrink-0 ${
                        defect.repairVsCredit === "request_credit"
                          ? "bg-primary/10 text-primary border-primary/30"
                          : defect.repairVsCredit === "request_repair"
                            ? "bg-orange-500/10 text-orange-500 border-orange-500/30"
                            : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {defect.repairVsCredit === "request_credit" ? (
                        <>
                          <CreditCard className="w-3 h-3 mr-1" /> Request Credit
                        </>
                      ) : defect.repairVsCredit === "request_repair" ? (
                        <>
                          <Wrench className="w-3 h-3 mr-1" /> Seller Repair
                        </>
                      ) : (
                        <>Either</>
                      )}
                    </Badge>
                  </div>
                  {(defect.consequentialDamageRisk || defect.remainingUsefulLife) && (
                    <div className="text-xs text-muted-foreground space-y-1 mb-3">
                      {defect.consequentialDamageRisk && (
                        <p>
                          <span className="font-medium">Cascading risk:</span> {defect.consequentialDamageRisk}
                        </p>
                      )}
                      {defect.remainingUsefulLife && (
                        <p>
                          <span className="font-medium">Remaining life:</span> {defect.remainingUsefulLife}
                        </p>
                      )}
                    </div>
                  )}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                    <div className="p-2 rounded bg-muted/50">
                      <p className="text-muted-foreground text-xs">Est. Repair Cost</p>
                      <p className="font-mono font-semibold">
                        {defect.estimatedRepairRange
                          ? `$${defect.estimatedRepairRange.low.toLocaleString()}–$${defect.estimatedRepairRange.high.toLocaleString()}`
                          : `$${defect.estimatedRepairCost.toLocaleString()}`}
                      </p>
                    </div>
                    <div className="p-2 rounded bg-green-500/10">
                      <p className="text-muted-foreground text-xs">Credit Request</p>
                      <p className="font-mono font-semibold text-green-500">
                        ${defect.creditRecommendation.toLocaleString()}
                      </p>
                    </div>
                    {defect.anchorHighAmount != null && (
                      <div className="p-2 rounded bg-amber-500/10">
                        <p className="text-muted-foreground text-xs">Anchor (open)</p>
                        <p className="font-mono font-semibold text-amber-600 dark:text-amber-400">
                          ${defect.anchorHighAmount.toLocaleString()}
                        </p>
                      </div>
                    )}
                    {((defect.lenderImplication && defect.lenderImplication !== "None specific") ||
                      (defect.codeComplianceNote && defect.codeComplianceNote !== "None noted")) && (
                      <div className="p-2 rounded bg-muted/50 col-span-2 sm:col-span-1">
                        <p className="text-muted-foreground text-xs">Lender / Code</p>
                        <p className="text-xs">
                          {defect.lenderImplication && defect.lenderImplication !== "None specific"
                            ? defect.lenderImplication
                            : defect.codeComplianceNote}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {analysis.majorDefects.map((defect, index) => (
                <div key={index} className="flex items-start gap-2 text-sm p-3 rounded-lg bg-background border">
                  <span className="w-5 h-5 rounded-full bg-destructive/10 text-destructive flex items-center justify-center flex-shrink-0 text-xs">
                    {index + 1}
                  </span>
                  {defect}
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="scripts" className="space-y-4 mt-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-muted-foreground">Tone:</span>
            <Select value={scriptTone} onValueChange={(v) => setScriptTone(v as "firm" | "collaborative" | "nuclear")}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="firm">Firm</SelectItem>
                <SelectItem value="collaborative">Collaborative</SelectItem>
                <SelectItem value="nuclear">Nuclear</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {analysis.openingStatement && (
            <div className="p-4 rounded-lg bg-background border">
              <div className="flex items-center justify-between gap-2 mb-2">
                <h4 className="font-semibold flex items-center gap-2 text-sm">
                  <MessageSquare className="w-4 h-4 text-primary" />
                  Opening Statement
                </h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(analysis.openingStatement || "");
                    toast({ title: "Copied!" });
                  }}
                >
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground italic">&ldquo;{analysis.openingStatement}&rdquo;</p>
            </div>
          )}
          {analysis.defectBreakdown?.map((defect, index) => {
            const script =
              scriptTone === "collaborative" && defect.collaborativeScript
                ? defect.collaborativeScript
                : scriptTone === "nuclear" && defect.nuclearScript
                  ? defect.nuclearScript
                  : defect.sellerScript;
            return (
              <div key={index} className="p-4 rounded-lg bg-background border">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <h4 className="font-semibold text-sm">{defect.issue}</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(script);
                      toast({ title: "Copied!" });
                    }}
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground italic">&ldquo;{script}&rdquo;</p>
              </div>
            );
          })}
          {analysis.closingStatement && (
            <div className="p-4 rounded-lg bg-background border">
              <div className="flex items-center justify-between gap-2 mb-2">
                <h4 className="font-semibold flex items-center gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Closing Statement
                </h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(analysis.closingStatement || "");
                    toast({ title: "Copied!" });
                  }}
                >
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground italic">&ldquo;{analysis.closingStatement}&rdquo;</p>
            </div>
          )}
          {analysis.walkawayScript && (
            <div className="p-4 rounded-lg bg-background border border-amber-500/30">
              <div className="flex items-center justify-between gap-2 mb-2">
                <h4 className="font-semibold text-sm text-amber-600 dark:text-amber-400">Walkaway Script</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(analysis.walkawayScript || "");
                    toast({ title: "Copied!" });
                  }}
                >
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground italic">&ldquo;{analysis.walkawayScript}&rdquo;</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="tactics" className="space-y-4 mt-4">
          {analysis.accusationAudit && (
            <div className="p-4 rounded-lg bg-background border">
              <h4 className="font-semibold text-sm mb-2">Accusation Audit</h4>
              <p className="text-sm text-muted-foreground italic">&ldquo;{analysis.accusationAudit}&rdquo;</p>
              <Button
                variant="ghost"
                size="sm"
                className="mt-2"
                onClick={() => {
                  navigator.clipboard.writeText(analysis.accusationAudit || "");
                  toast({ title: "Copied!" });
                }}
              >
                <Copy className="w-3 h-3 mr-1" /> Copy
              </Button>
            </div>
          )}
          {analysis.psychologicalLeverage && analysis.psychologicalLeverage.length > 0 && (
            <div className="p-4 rounded-lg bg-background border">
              <h4 className="font-semibold text-sm mb-2">Psychological Leverage</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                {analysis.psychologicalLeverage.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            </div>
          )}
          {analysis.calibratedQuestions && analysis.calibratedQuestions.length > 0 && (
            <div className="p-4 rounded-lg bg-background border">
              <h4 className="font-semibold text-sm mb-2">Calibrated Questions</h4>
              <ul className="space-y-2 text-sm">
                {analysis.calibratedQuestions.map((q, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-muted-foreground">{i + 1}.</span>
                    <span className="italic text-muted-foreground">&ldquo;{q}&rdquo;</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-shrink-0"
                      onClick={() => {
                        navigator.clipboard.writeText(q);
                        toast({ title: "Copied!" });
                      }}
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {analysis.marketLeverageNotes && (
            <div className="p-4 rounded-lg bg-muted/50 border">
              <h4 className="font-semibold text-sm mb-2">Market Leverage Notes</h4>
              <p className="text-sm text-muted-foreground">{analysis.marketLeverageNotes}</p>
            </div>
          )}
          {analysis.nibbleAsks && analysis.nibbleAsks.length > 0 && (
            <div className="p-4 rounded-lg bg-background border">
              <h4 className="font-semibold text-sm mb-2">Nibble Asks (after main negotiation)</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                {analysis.nibbleAsks.map((n, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded border flex items-center justify-center text-xs">?</span>
                    {n}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </TabsContent>

        <TabsContent value="alternatives" className="space-y-4 mt-4">
          {analysis.creativeAlternatives && analysis.creativeAlternatives.length > 0 ? (
            analysis.creativeAlternatives.map((alt, index) => (
              <div key={index} className="p-4 rounded-lg bg-background border">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h4 className="font-semibold text-sm">{alt.strategy}</h4>
                  <Badge variant="secondary" className="font-mono">
                    ${alt.estimatedValue.toLocaleString()}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-2">{alt.description}</p>
                <p className="text-sm italic text-muted-foreground">&ldquo;{alt.script}&rdquo;</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2"
                  onClick={() => {
                    navigator.clipboard.writeText(alt.script);
                    toast({ title: "Copied!" });
                  }}
                >
                  <Copy className="w-3 h-3 mr-1" /> Copy script
                </Button>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              No creative alternatives generated. Focus on the credit request and key negotiation points.
            </p>
          )}
        </TabsContent>

        <TabsContent value="summary" className="space-y-4 mt-4">
          <div>
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Inspection Summary
            </h4>
            <p className="text-muted-foreground text-sm">{analysis.summaryFindings}</p>
          </div>
          <Separator />
          <div>
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              Key Negotiation Points
            </h4>
            <ul className="space-y-2">
              {analysis.negotiationPoints.map((point, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <span className="w-5 h-5 rounded-full bg-green-500/10 text-green-500 flex items-center justify-center flex-shrink-0 text-xs">
                    {index + 1}
                  </span>
                  {point}
                </li>
              ))}
            </ul>
          </div>
          {analysis.nibbleAsks && analysis.nibbleAsks.length > 0 && (
            <>
              <Separator />
              <div>
                <h4 className="font-semibold mb-2 text-sm">Nibble Asks Checklist</h4>
                <ul className="space-y-1.5 text-sm text-muted-foreground">
                  {analysis.nibbleAsks.map((n, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded border border-muted-foreground/50 flex-shrink-0" />
                      {n}
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
