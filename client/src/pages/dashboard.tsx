import { useState, useCallback, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Upload, FileText, Sparkles, TrendingUp, Clock, AlertCircle, X, DollarSign, CheckCircle, Unlock, Zap, Copy, Download, MessageSquare, Wrench, CreditCard, Eye, FileCheck, Send, Home, XCircle, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { AIAnalysis } from "@/lib/battlecard";
import { generateBattlecardText, downloadBattlecardPDF } from "@/lib/battlecard";
import { BattlecardView } from "@/components/battlecard-view";
import type { Report, CreditTransaction } from "@shared/schema";

// Deal status types and configuration
type DealStatus = 'watching' | 'offer_pending' | 'under_contract' | 'closed' | 'passed';

const DEAL_STATUSES: { value: DealStatus; label: string; icon: React.ComponentType<{ className?: string }>; color: string }[] = [
  { value: 'watching', label: 'Watching', icon: Eye, color: 'text-blue-500' },
  { value: 'offer_pending', label: 'Offer Pending', icon: Send, color: 'text-orange-500' },
  { value: 'under_contract', label: 'Under Contract', icon: FileCheck, color: 'text-purple-500' },
  { value: 'closed', label: 'Closed', icon: Home, color: 'text-green-500' },
  { value: 'passed', label: 'Passed', icon: XCircle, color: 'text-muted-foreground' },
];

// Deal Timeline Component
function DealTimeline({ currentStatus }: { currentStatus: DealStatus }) {
  const activeIndex = DEAL_STATUSES.findIndex(s => s.value === currentStatus);
  
  return (
    <div className="flex items-center justify-between w-full py-2">
      {DEAL_STATUSES.filter(s => s.value !== 'passed').map((status, index) => {
        const isActive = index <= activeIndex && currentStatus !== 'passed';
        const isCurrent = status.value === currentStatus;
        const Icon = status.icon;
        
        return (
          <div key={status.value} className="flex items-center flex-1">
            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors ${
                isCurrent 
                  ? 'bg-primary border-primary text-primary-foreground' 
                  : isActive 
                    ? 'bg-primary/20 border-primary/50 text-primary'
                    : 'bg-muted border-muted-foreground/30 text-muted-foreground'
              }`}>
                <Icon className="w-4 h-4" />
              </div>
              <span className={`text-xs ${isCurrent ? 'font-medium' : 'text-muted-foreground'}`}>
                {status.label}
              </span>
            </div>
            {index < DEAL_STATUSES.length - 2 && (
              <div className={`flex-1 h-0.5 mx-2 ${
                isActive && index < activeIndex ? 'bg-primary/50' : 'bg-muted-foreground/20'
              }`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

interface DashboardData {
  creditBalance: number;
  recentReports: Report[];
  recentTransactions: CreditTransaction[];
  stats: {
    totalReports: number;
    totalDownloads: number;
    creditsEarned: number;
    creditsSpent: number;
  };
}

interface UploadResult {
  report: Report;
  creditsEarned: number;
  analysis: AIAnalysis;
}

export default function DashboardPage() {
  const { toast } = useToast();
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastAnalysis, setLastAnalysis] = useState<{ analysis: AIAnalysis; report: Report } | null>(null);
  const [dealStatus, setDealStatus] = useState<DealStatus>('watching');
  const [savedToVault, setSavedToVault] = useState(false);
  const [existingPropertyId, setExistingPropertyId] = useState<number | null>(null);
  const [selectedReportForView, setSelectedReportForView] = useState<Report | null>(null);
  const [analysisForView, setAnalysisForView] = useState<AIAnalysis | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);

  // Fetch full analysis when opening a report from Recent Reports
  useEffect(() => {
    if (!selectedReportForView) {
      setAnalysisForView(null);
      setAnalysisLoading(false);
      return;
    }
    setAnalysisLoading(true);
    setAnalysisForView(null);
    fetch(`/api/reports/${selectedReportForView.id}/analysis`, { credentials: "include" })
      .then((res) => {
        if (res.ok) return res.json();
        return null;
      })
      .then((data: AIAnalysis | null) => {
        setAnalysisForView(data);
      })
      .catch(() => setAnalysisForView(null))
      .finally(() => setAnalysisLoading(false));
  }, [selectedReportForView?.id]);

  const saveToVaultMutation = useMutation({
    mutationFn: async ({ address, status, reportId, existingId }: { address: string; status: DealStatus; reportId: number; existingId?: number }) => {
      if (existingId) {
        const response = await apiRequest('PATCH', `/api/properties/${existingId}`, { status });
        return response.json();
      } else {
        const response = await apiRequest('POST', '/api/properties', { address, status });
        const property = await response.json();
        await apiRequest('POST', `/api/properties/${property.id}/reports`, { reportId });
        return property;
      }
    },
    onSuccess: (property) => {
      toast({
        title: existingPropertyId ? "Status Updated" : "Saved to Digital Vault",
        description: existingPropertyId ? "Property status updated in your vault." : "Property added to your portfolio tracker.",
      });
      setSavedToVault(true);
      setExistingPropertyId(property.id);
      queryClient.invalidateQueries({ queryKey: ['/api/properties'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to save",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const checkExistingPropertyMutation = useMutation({
    mutationFn: async (address: string) => {
      const response = await fetch('/api/properties', { credentials: 'include' });
      if (!response.ok) return null;
      const properties = await response.json();
      return properties.find((p: { address: string; status: string; id: number }) => 
        p.address.toLowerCase() === address.toLowerCase()
      );
    },
    onSuccess: (property) => {
      if (property) {
        setExistingPropertyId(property.id);
        setDealStatus(property.status as DealStatus);
        setSavedToVault(true);
      }
    },
  });

  const { data, isLoading, error } = useQuery<DashboardData>({
    queryKey: ['/api/dashboard'],
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      
      setUploadProgress(20);
      const response = await fetch('/api/reports/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }
      
      setUploadProgress(60);
      setIsAnalyzing(true);
      
      const result = await response.json();
      setUploadProgress(100);
      
      return result;
    },
    onSuccess: async (data: UploadResult) => {
      toast({
        title: "Report uploaded successfully!",
        description: `+${data.creditsEarned} credits earned. AI analysis complete.`,
      });
      setLastAnalysis({ analysis: data.analysis, report: data.report });
      setDealStatus('watching');
      setSavedToVault(false);
      setExistingPropertyId(null);
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['/api/reports'] });
      setUploadProgress(0);
      setIsAnalyzing(false);

      // Auto-add to Digital Vault: ensure property exists and link report
      const address = (data.report.propertyAddress || '').trim();
      const skipVault = !address || address.toLowerCase() === 'unknown address';
      if (!skipVault) {
        try {
          const propsRes = await fetch('/api/properties', { credentials: 'include' });
          if (!propsRes.ok) throw new Error(`Properties fetch: ${propsRes.status}`);
          const { properties = [] } = await propsRes.json();
          const existing = (properties as { address?: string; id: number; status?: string }[]).find((p) =>
            (p.address || '').trim().toLowerCase() === address.toLowerCase()
          );
          if (existing) {
            await apiRequest('POST', `/api/properties/${existing.id}/reports`, { reportId: data.report.id });
            setExistingPropertyId(existing.id);
            setDealStatus((existing.status as DealStatus) || 'watching');
            setSavedToVault(true);
          } else {
            const createRes = await apiRequest('POST', '/api/properties', { address, status: 'watching' });
            const property = await createRes.json();
            await apiRequest('POST', `/api/properties/${property.id}/reports`, { reportId: data.report.id });
            setExistingPropertyId(property.id);
            setSavedToVault(true);
          }
          queryClient.invalidateQueries({ queryKey: ['/api/properties'] });
          queryClient.refetchQueries({ queryKey: ['/api/properties'] });
        } catch (err) {
          console.error('Vault auto-add failed:', err);
          toast({
            title: 'Vault not updated',
            description: 'Could not add to Digital Vault automatically. You can add it from the Vault.',
            variant: 'destructive',
          });
        }
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
      setUploadProgress(0);
      setIsAnalyzing(false);
    },
  });

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    const pdfFile = files.find(f => f.type === 'application/pdf');
    
    if (pdfFile) {
      uploadMutation.mutate(pdfFile);
    } else {
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF file.",
        variant: "destructive",
      });
    }
  }, [uploadMutation, toast]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      uploadMutation.mutate(file);
    } else if (file) {
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF file.",
        variant: "destructive",
      });
    }
    e.target.value = '';
  }, [uploadMutation, toast]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Failed to load dashboard</h2>
            <p className="text-muted-foreground text-sm">Please try refreshing the page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Welcome Hero - when no active analysis */}
      {!lastAnalysis && (
        <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-primary/10 via-primary/5 to-background border border-primary/20 p-6">
          <div className="relative z-10">
            <p className="text-sm font-medium text-primary mb-1">Upload & Analyze</p>
            <h1 className="text-2xl font-bold mb-2" data-testid="text-dashboard-heading">
              Get Your Negotiation Edge in 60 Seconds
            </h1>
            <p className="text-muted-foreground max-w-xl">
              Drop your inspection PDF below. AI will generate seller scripts, cost breakdowns, and credit recommendations - ready for your next call.
            </p>
          </div>
          <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 rounded-full blur-3xl -translate-y-12 translate-x-12" />
        </div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Credit Balance</p>
                {isLoading ? (
                  <Skeleton className="h-8 w-16 mt-1" />
                ) : (
                  <p className="text-2xl font-bold font-mono" data-testid="text-credit-balance">
                    {data?.creditBalance ?? 0}
                  </p>
                )}
              </div>
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Reports Uploaded</p>
                {isLoading ? (
                  <Skeleton className="h-8 w-16 mt-1" />
                ) : (
                  <p className="text-2xl font-bold font-mono" data-testid="text-total-reports">
                    {data?.stats.totalReports ?? 0}
                  </p>
                )}
              </div>
              <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                <FileText className="w-5 h-5 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  War Chest
                </p>
                {isLoading ? (
                  <Skeleton className="h-8 w-16 mt-1" />
                ) : (
                  <>
                    <p className="text-2xl font-bold font-mono text-primary" data-testid="text-war-chest">
                      {Math.floor((data?.creditBalance ?? 0) / 5)} reports
                    </p>
                    <p className="text-xs text-muted-foreground">ready to unlock</p>
                  </>
                )}
              </div>
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Unlock className="w-5 h-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Reports Accessed</p>
                {isLoading ? (
                  <Skeleton className="h-8 w-16 mt-1" />
                ) : (
                  <p className="text-2xl font-bold font-mono" data-testid="text-total-downloads">
                    {data?.stats.totalDownloads ?? 0}
                  </p>
                )}
              </div>
              <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-orange-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upload Zone */}
      <Card className={lastAnalysis ? '' : 'border-primary/30'}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            {lastAnalysis ? 'Upload Another Report' : 'Upload Your Inspection Report'}
          </CardTitle>
          <CardDescription>
            {lastAnalysis 
              ? 'Add another property to your portfolio. Each upload earns +10 credits.'
              : 'Receive your inspection? Upload now - AI battlecard ready in 60 seconds.'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className={`
              relative min-h-64 border-2 border-dashed rounded-lg
              flex flex-col items-center justify-center gap-4 p-8
              transition-all cursor-pointer
              ${isDragging 
                ? 'border-primary bg-primary/5' 
                : 'border-border hover:border-primary/50 hover:bg-muted/30'
              }
              ${uploadMutation.isPending ? 'pointer-events-none opacity-70' : ''}
            `}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => document.getElementById('file-upload')?.click()}
            data-testid="upload-zone"
          >
            <input
              id="file-upload"
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={handleFileSelect}
              disabled={uploadMutation.isPending}
            />

            {uploadMutation.isPending ? (
              <div className="text-center space-y-4 w-full max-w-sm">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  {isAnalyzing ? (
                    <Sparkles className="w-8 h-8 text-primary animate-pulse" />
                  ) : (
                    <Upload className="w-8 h-8 text-primary animate-bounce" />
                  )}
                </div>
                <div>
                  <p className="font-medium">
                    {isAnalyzing ? 'AI is analyzing your report...' : 'Uploading...'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {isAnalyzing ? 'Extracting defects and generating negotiation points' : 'Please wait'}
                  </p>
                </div>
                <Progress value={uploadProgress} className="w-full" />
              </div>
            ) : (
              <>
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                  <Upload className="w-8 h-8 text-muted-foreground" />
                </div>
                <div className="text-center">
                  <p className="font-medium">Drop your PDF here or click to browse</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Supports inspection reports up to 50MB
                  </p>
                </div>
                <Badge variant="secondary" className="mt-2">
                  <Sparkles className="w-3 h-3 mr-1" />
                  +10 credits per upload (Unlock 2 reports!)
                </Badge>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* AI Deal Coach Panel - Hero after upload */}
      {lastAnalysis && (
        <Card className="border-green-500/50 bg-gradient-to-br from-green-500/10 via-green-500/5 to-background shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-green-600 dark:text-green-400 mb-0.5">
                    Battlecard Ready - You're Negotiation Ready
                  </p>
                  <CardTitle className="flex items-center gap-2">
                    {lastAnalysis.report.propertyAddress}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-2 mt-1">
                    <Sparkles className="w-3 h-3" />
                    AI Deal Coach Analysis Complete
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    const battlecard = generateBattlecardText(lastAnalysis.analysis, lastAnalysis.report.propertyAddress);
                    navigator.clipboard.writeText(battlecard);
                    toast({ title: "Copied!", description: "Battlecard copied to clipboard." });
                  }}
                  data-testid="button-copy-battlecard"
                >
                  <Copy className="w-4 h-4 mr-1" />
                  Copy
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => downloadBattlecardPDF(lastAnalysis.analysis, lastAnalysis.report.propertyAddress)}
                  data-testid="button-download-battlecard"
                >
                  <Download className="w-4 h-4 mr-1" />
                  Export
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setLastAnalysis(null)}
                  data-testid="button-close-analysis"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Deal Status Tracker */}
            <div className="p-4 rounded-lg bg-background border">
              <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Where are you in this deal?</span>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={dealStatus} onValueChange={(v) => setDealStatus(v as DealStatus)}>
                    <SelectTrigger className="w-[180px]" data-testid="select-deal-status">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {DEAL_STATUSES.map((status) => {
                        const Icon = status.icon;
                        return (
                          <SelectItem key={status.value} value={status.value}>
                            <div className="flex items-center gap-2">
                              <Icon className={`w-4 h-4 ${status.color}`} />
                              {status.label}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    variant={savedToVault ? "outline" : "default"}
                    onClick={() => {
                      if (lastAnalysis) {
                        saveToVaultMutation.mutate({
                          address: lastAnalysis.report.propertyAddress,
                          status: dealStatus,
                          reportId: lastAnalysis.report.id,
                          existingId: existingPropertyId || undefined,
                        });
                      }
                    }}
                    disabled={saveToVaultMutation.isPending}
                    data-testid="button-save-to-vault"
                  >
                    {savedToVault ? (
                      <>
                        <CheckCircle className="w-4 h-4 mr-1 text-green-500" />
                        {saveToVaultMutation.isPending ? 'Updating...' : 'Update Status'}
                      </>
                    ) : (
                      <>
                        <Home className="w-4 h-4 mr-1" />
                        {saveToVaultMutation.isPending ? 'Saving...' : 'Save to Vault'}
                      </>
                    )}
                  </Button>
                </div>
              </div>
              <DealTimeline currentStatus={dealStatus} />
              <p className="text-xs text-muted-foreground mt-2">
                Track this property in your Digital Vault to monitor deal progress
              </p>
            </div>

            <BattlecardView report={lastAnalysis.report} analysis={lastAnalysis.analysis} showActions={false} />
          </CardContent>
        </Card>
      )}

      {/* Report summary / full battlecard dialog (Recent Reports view) */}
      <Dialog
        open={!!selectedReportForView}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedReportForView(null);
            setAnalysisForView(null);
            setAnalysisLoading(false);
          }
        }}
      >
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              {analysisForView ? "Full Battlecard" : "Report Summary"}
            </DialogTitle>
            <DialogDescription>
              {selectedReportForView?.propertyAddress}
            </DialogDescription>
          </DialogHeader>
          {selectedReportForView && (
            <>
              {analysisLoading ? (
                <div className="py-8 flex justify-center">
                  <Skeleton className="h-64 w-full" />
                </div>
              ) : analysisForView ? (
                <ScrollArea className="max-h-[70vh] pr-4">
                  <BattlecardView report={selectedReportForView} analysis={analysisForView} showActions />
                </ScrollArea>
              ) : (
                <ScrollArea className="max-h-[60vh] pr-4">
                  <div className="space-y-6">
                    {selectedReportForView.negotiationPoints && (selectedReportForView.negotiationPoints as string[]).length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-3">Top Negotiation Points</h4>
                        <ul className="space-y-2">
                          {(selectedReportForView.negotiationPoints as string[]).map((point, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm">
                              <Badge variant="outline" className="flex-shrink-0 mt-0.5">{i + 1}</Badge>
                              <span>{point}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {selectedReportForView.majorDefects && (selectedReportForView.majorDefects as string[]).length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-3 flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-destructive" />
                          Major Defects Identified
                        </h4>
                        <ul className="space-y-2">
                          {(selectedReportForView.majorDefects as string[]).map((defect, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm">
                              <span className="w-1.5 h-1.5 rounded-full bg-destructive mt-2 flex-shrink-0" />
                              <span>{defect}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {selectedReportForView.estimatedCredit != null && (
                      <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                        <h4 className="font-semibold mb-2">Estimated Credit Request</h4>
                        <p className="text-2xl font-bold text-primary font-mono">
                          ${selectedReportForView.estimatedCredit.toLocaleString()}
                        </p>
                      </div>
                    )}
                    {selectedReportForView.summaryFindings && (
                      <div>
                        <h4 className="font-semibold mb-3">Summary</h4>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {selectedReportForView.summaryFindings}
                        </p>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground pt-2 border-t">
                      No full battlecard stored for this report. New uploads save the full analysis for viewing here.
                    </p>
                  </div>
                </ScrollArea>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Recent Reports */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Reports</CardTitle>
          <CardDescription>Your most recently uploaded inspection reports</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : data?.recentReports && data.recentReports.length > 0 ? (
            <div className="space-y-3">
              {data.recentReports.map((report) => (
                <div
                  key={report.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedReportForView(report)}
                  onKeyDown={(e) => e.key === 'Enter' && setSelectedReportForView(report)}
                  className="flex items-center gap-4 p-3 rounded-lg border hover-elevate cursor-pointer"
                  data-testid={`report-item-${report.id}`}
                >
                  <div className="w-10 h-10 rounded bg-muted flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{report.propertyAddress}</p>
                    <p className="text-sm text-muted-foreground">
                      {report.inspectionDate 
                        ? new Date(report.inspectionDate).toLocaleDateString()
                        : 'Date unknown'
                      }
                    </p>
                  </div>
                  {report.majorDefects && (report.majorDefects as string[]).length > 0 && (
                    <Badge variant="destructive" className="flex-shrink-0">
                      {(report.majorDefects as string[]).length} defects
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedReportForView(report);
                    }}
                    data-testid={`button-view-report-${report.id}`}
                  >
                    View
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No reports yet. Upload your first inspection report above!</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
