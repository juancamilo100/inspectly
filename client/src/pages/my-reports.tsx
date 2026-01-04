import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { 
  FileText, 
  MapPin, 
  Calendar, 
  AlertTriangle,
  Eye,
  Sparkles,
  Download,
  MoreVertical,
  Trash2,
  Upload
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Report } from "@shared/schema";

interface MyReportsData {
  uploaded: Report[];
  downloaded: Report[];
}

export default function MyReportsPage() {
  const { toast } = useToast();
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);

  const { data, isLoading, error } = useQuery<MyReportsData>({
    queryKey: ['/api/my-reports'],
  });

  const deleteMutation = useMutation({
    mutationFn: async (reportId: number) => {
      return apiRequest('DELETE', `/api/reports/${reportId}`);
    },
    onSuccess: () => {
      toast({
        title: "Report deleted",
        description: "Your report has been removed.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/my-reports'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete report",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const openAnalysis = (report: Report) => {
    setSelectedReport(report);
    setIsAnalysisOpen(true);
  };

  const ReportCard = ({ report, showActions = false }: { report: Report; showActions?: boolean }) => (
    <Card className="hover-elevate transition-all" data-testid={`card-my-report-${report.id}`}>
      <CardContent className="p-4 space-y-3">
        {/* Address */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 flex-1 min-w-0">
            <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <p className="font-medium text-sm leading-tight line-clamp-2">
              {report.propertyAddress}
            </p>
          </div>
          {showActions && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="flex-shrink-0">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem 
                  onClick={() => deleteMutation.mutate(report.id)}
                  className="text-destructive"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Meta */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {report.inspectionDate 
              ? new Date(report.inspectionDate).toLocaleDateString()
              : 'Unknown'
            }
          </div>
          <div className="flex items-center gap-1">
            <Download className="w-3 h-3" />
            {report.downloadCount} downloads
          </div>
        </div>

        {/* Defects */}
        {report.majorDefects && (report.majorDefects as string[]).length > 0 && (
          <div className="flex flex-wrap gap-1">
            <Badge variant="destructive" className="text-xs">
              <AlertTriangle className="w-3 h-3 mr-1" />
              {(report.majorDefects as string[]).length} issues found
            </Badge>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2 border-t">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1"
            onClick={() => openAnalysis(report)}
            data-testid={`button-analysis-${report.id}`}
          >
            <Sparkles className="w-4 h-4 mr-1" />
            AI Analysis
          </Button>
          <Button variant="ghost" size="sm" data-testid={`button-view-${report.id}`}>
            <Eye className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">My Reports</h1>
        <p className="text-muted-foreground">
          View and manage your uploaded and downloaded inspection reports
        </p>
      </div>

      <Tabs defaultValue="uploaded" className="w-full">
        <TabsList>
          <TabsTrigger value="uploaded" data-testid="tab-uploaded">
            Uploaded ({data?.uploaded?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="downloaded" data-testid="tab-downloaded">
            Downloaded ({data?.downloaded?.length ?? 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="uploaded" className="mt-6">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <Skeleton className="h-24 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : data?.uploaded && data.uploaded.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.uploaded.map((report) => (
                <ReportCard key={report.id} report={report} showActions />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <Upload className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No uploaded reports</h3>
                <p className="text-muted-foreground mb-6">
                  Upload your first inspection report to earn credits!
                </p>
                <Button asChild>
                  <Link href="/dashboard">Upload Report</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="downloaded" className="mt-6">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <Skeleton className="h-24 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : data?.downloaded && data.downloaded.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.downloaded.map((report) => (
                <ReportCard key={report.id} report={report} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <Download className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No downloaded reports</h3>
                <p className="text-muted-foreground mb-6">
                  Browse available reports and download ones for properties you're interested in.
                </p>
                <Button asChild>
                  <Link href="/browse">Browse Reports</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* AI Analysis Dialog */}
      <Dialog open={isAnalysisOpen} onOpenChange={setIsAnalysisOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              AI Deal Coach Analysis
            </DialogTitle>
            <DialogDescription>
              {selectedReport?.propertyAddress}
            </DialogDescription>
          </DialogHeader>
          
          {selectedReport && (
            <ScrollArea className="max-h-[60vh] pr-4">
              <div className="space-y-6">
                {/* Negotiation Points */}
                {selectedReport.negotiationPoints && (selectedReport.negotiationPoints as string[]).length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-xs font-bold text-primary">1</span>
                      </div>
                      Top Negotiation Points
                    </h4>
                    <ul className="space-y-2">
                      {(selectedReport.negotiationPoints as string[]).map((point, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <Badge variant="outline" className="flex-shrink-0 mt-0.5">{i + 1}</Badge>
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Major Defects */}
                {selectedReport.majorDefects && (selectedReport.majorDefects as string[]).length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-destructive/10 flex items-center justify-center">
                        <AlertTriangle className="w-3 h-3 text-destructive" />
                      </div>
                      Major Defects Identified
                    </h4>
                    <ul className="space-y-2">
                      {(selectedReport.majorDefects as string[]).map((defect, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <span className="w-1.5 h-1.5 rounded-full bg-destructive mt-2 flex-shrink-0" />
                          <span>{defect}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Estimated Credit Request */}
                {selectedReport.estimatedCredit && (
                  <Card className="bg-primary/5 border-primary/20">
                    <CardContent className="p-4">
                      <h4 className="font-semibold mb-2">Estimated Credit Request</h4>
                      <p className="text-3xl font-bold text-primary font-mono">
                        ${selectedReport.estimatedCredit.toLocaleString()}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Based on the identified defects and repair estimates
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Summary */}
                {selectedReport.summaryFindings && (
                  <div>
                    <h4 className="font-semibold mb-3">Summary</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {selectedReport.summaryFindings}
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
