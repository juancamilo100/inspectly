import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { 
  Search, 
  FileText, 
  Download, 
  MapPin, 
  Calendar, 
  AlertTriangle,
  Bell,
  Coins
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Report } from "@shared/schema";

interface BrowseData {
  reports: Report[];
  total: number;
}

export default function BrowsePage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [bountyAddress, setBountyAddress] = useState("");
  const [bountyCredits, setBountyCredits] = useState(5);
  const [isBountyDialogOpen, setIsBountyDialogOpen] = useState(false);

  const { data, isLoading, error } = useQuery<BrowseData>({
    queryKey: ['/api/reports', searchQuery],
    queryFn: async () => {
      const url = searchQuery 
        ? `/api/reports?search=${encodeURIComponent(searchQuery)}`
        : '/api/reports';
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch reports');
      return res.json();
    },
  });

  const downloadMutation = useMutation({
    mutationFn: async (reportId: number) => {
      return apiRequest('POST', `/api/reports/${reportId}/download`);
    },
    onSuccess: () => {
      toast({
        title: "Report unlocked",
        description: "View it in My Reports. -5 credits.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['/api/credits'] });
      queryClient.invalidateQueries({ queryKey: ['/api/my-reports'] });
      queryClient.invalidateQueries({ queryKey: ['/api/reports'] });
      queryClient.refetchQueries({ queryKey: ['/api/dashboard'] });
      queryClient.refetchQueries({ queryKey: ['/api/my-reports'] });
      queryClient.refetchQueries({ queryKey: ['/api/reports'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Download failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const bountyMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', '/api/bounties', {
        propertyAddress: bountyAddress,
        stakedCredits: bountyCredits,
      });
    },
    onSuccess: () => {
      toast({
        title: "Bounty created!",
        description: `Staked ${bountyCredits} credits. You'll be notified when a report is uploaded.`,
      });
      setIsBountyDialogOpen(false);
      setBountyAddress("");
      setBountyCredits(5);
      queryClient.invalidateQueries({ queryKey: ['/api/bounties'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create bounty",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const filteredReports = data?.reports?.filter(report => 
    !searchQuery || 
    report.propertyAddress.toLowerCase().includes(searchQuery.toLowerCase())
  ) ?? [];

  const noResults = searchQuery && filteredReports.length === 0;

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Search Header */}
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold">Browse Reports</h1>
          <p className="text-muted-foreground">
            Search for inspection reports by property address
          </p>
        </div>

        <div className="relative max-w-xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by address (e.g., 123 Main St)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-search"
          />
        </div>
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-32 w-full mb-4" />
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : noResults ? (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No reports found</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              We don't have an inspection report for "{searchQuery}" yet. 
              Would you like to request one?
            </p>
            <Dialog open={isBountyDialogOpen} onOpenChange={setIsBountyDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => setBountyAddress(searchQuery)} data-testid="button-request-report">
                  <Bell className="w-4 h-4 mr-2" />
                  Request This Report
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Request a Report</DialogTitle>
                  <DialogDescription>
                    Stake credits to request an inspection report. You'll be notified 
                    when someone uploads a report for this address.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <label className="text-sm font-medium">Property Address</label>
                    <Input
                      value={bountyAddress}
                      onChange={(e) => setBountyAddress(e.target.value)}
                      placeholder="123 Main St, City, State"
                      className="mt-1"
                      data-testid="input-bounty-address"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Credits to Stake</label>
                    <div className="flex items-center gap-2 mt-1">
                      <Input
                        type="number"
                        min={5}
                        value={bountyCredits}
                        onChange={(e) => setBountyCredits(Math.max(5, parseInt(e.target.value) || 5))}
                        className="w-24"
                        data-testid="input-bounty-credits"
                      />
                      <span className="text-sm text-muted-foreground">
                        (minimum 5 credits)
                      </span>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsBountyDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={() => bountyMutation.mutate()}
                    disabled={!bountyAddress || bountyMutation.isPending}
                    data-testid="button-confirm-bounty"
                  >
                    <Coins className="w-4 h-4 mr-2" />
                    Stake {bountyCredits} Credits
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      ) : filteredReports.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredReports.map((report) => (
            <Card key={report.id} className="hover-elevate transition-all" data-testid={`card-report-${report.id}`}>
              <CardContent className="p-4 space-y-4">
                {/* Preview placeholder */}
                <div className="h-32 bg-muted rounded-md flex items-center justify-center">
                  <FileText className="w-12 h-12 text-muted-foreground/50" />
                </div>

                {/* Address */}
                <div>
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <p className="font-medium text-sm leading-tight line-clamp-2">
                      {report.propertyAddress}
                    </p>
                  </div>
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
                  {report.majorDefects && (report.majorDefects as string[]).length > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      {(report.majorDefects as string[]).length} issues
                    </Badge>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-1.5 pt-2 border-t">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="secondary" className="text-xs">
                      <Coins className="w-3 h-3 mr-1" />
                      5 credits
                    </Badge>
                    <Button 
                      size="sm"
                      onClick={() => downloadMutation.mutate(report.id)}
                      disabled={downloadMutation.isPending}
                      data-testid={`button-download-${report.id}`}
                    >
                      <Download className="w-4 h-4 mr-1" />
                      Unlock
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Unlock to view and export in My Reports.
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No reports available yet</h3>
            <p className="text-muted-foreground mb-6">
              Be the first to contribute! Upload an inspection report to get started.
            </p>
            <Button asChild>
              <Link href="/dashboard">Upload Report</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
