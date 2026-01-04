import { useState, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Upload, FileText, Sparkles, TrendingUp, Clock, AlertCircle, X, DollarSign, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Report, CreditTransaction } from "@shared/schema";

interface AIAnalysis {
  majorDefects: string[];
  summaryFindings: string;
  negotiationPoints: string[];
  estimatedCredit: number;
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
    onSuccess: (data: UploadResult) => {
      toast({
        title: "Report uploaded successfully!",
        description: `+${data.creditsEarned} credits earned. AI analysis complete.`,
      });
      setLastAnalysis({ analysis: data.analysis, report: data.report });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['/api/reports'] });
      setUploadProgress(0);
      setIsAnalyzing(false);
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

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Credits Earned</p>
                {isLoading ? (
                  <Skeleton className="h-8 w-16 mt-1" />
                ) : (
                  <p className="text-2xl font-bold font-mono text-green-500">
                    +{data?.stats.creditsEarned ?? 0}
                  </p>
                )}
              </div>
              <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Downloads</p>
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Upload Inspection Report
          </CardTitle>
          <CardDescription>
            Drop your PDF here for instant AI analysis and earn 25 credits
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
                  +25 credits per upload
                </Badge>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* AI Deal Coach Panel */}
      {lastAnalysis && (
        <Card className="border-primary/50 bg-primary/5">
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="flex items-center gap-2">
                    AI Deal Coach
                    <Badge variant="secondary">New Analysis</Badge>
                  </CardTitle>
                  <CardDescription>{lastAnalysis.report.propertyAddress}</CardDescription>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setLastAnalysis(null)}
                data-testid="button-close-analysis"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Summary */}
            <div>
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Summary
              </h4>
              <p className="text-muted-foreground text-sm" data-testid="text-analysis-summary">
                {lastAnalysis.analysis.summaryFindings}
              </p>
            </div>

            {/* Major Defects */}
            <div>
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-destructive" />
                Major Defects Found
              </h4>
              <ul className="space-y-2">
                {lastAnalysis.analysis.majorDefects.map((defect, index) => (
                  <li 
                    key={index} 
                    className="flex items-start gap-2 text-sm"
                    data-testid={`text-defect-${index}`}
                  >
                    <span className="w-5 h-5 rounded-full bg-destructive/10 text-destructive flex items-center justify-center flex-shrink-0 text-xs">
                      {index + 1}
                    </span>
                    {defect}
                  </li>
                ))}
              </ul>
            </div>

            {/* Negotiation Points */}
            <div>
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                Negotiation Battlecard
              </h4>
              <ul className="space-y-2">
                {lastAnalysis.analysis.negotiationPoints.map((point, index) => (
                  <li 
                    key={index} 
                    className="flex items-start gap-2 text-sm"
                    data-testid={`text-negotiation-${index}`}
                  >
                    <span className="w-5 h-5 rounded-full bg-green-500/10 text-green-500 flex items-center justify-center flex-shrink-0 text-xs">
                      {index + 1}
                    </span>
                    {point}
                  </li>
                ))}
              </ul>
            </div>

            {/* Estimated Credit */}
            <div className="p-4 rounded-lg bg-background border">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-green-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Recommended Seller Credit Request</p>
                    <p className="text-2xl font-bold font-mono text-green-500" data-testid="text-estimated-credit">
                      ${lastAnalysis.analysis.estimatedCredit.toLocaleString()}
                    </p>
                  </div>
                </div>
                <Button variant="outline" data-testid="button-copy-battlecard">
                  Copy Battlecard
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
                  <Button variant="ghost" size="sm" data-testid={`button-view-report-${report.id}`}>
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
