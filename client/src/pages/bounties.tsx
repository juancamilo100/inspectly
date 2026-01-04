import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { 
  Bell, 
  MapPin, 
  Coins, 
  Clock,
  CheckCircle,
  XCircle,
  Plus,
  Upload
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Bounty } from "@shared/schema";

interface BountiesData {
  myBounties: Bounty[];
  openBounties: Bounty[];
}

const statusConfig = {
  open: { icon: Clock, color: 'text-yellow-500 bg-yellow-500/10', label: 'Open' },
  fulfilled: { icon: CheckCircle, color: 'text-green-500 bg-green-500/10', label: 'Fulfilled' },
  cancelled: { icon: XCircle, color: 'text-muted-foreground bg-muted', label: 'Cancelled' },
};

export default function BountiesPage() {
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newAddress, setNewAddress] = useState("");
  const [newCredits, setNewCredits] = useState(10);

  const { data, isLoading, error } = useQuery<BountiesData>({
    queryKey: ['/api/bounties'],
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', '/api/bounties', {
        propertyAddress: newAddress,
        stakedCredits: newCredits,
      });
    },
    onSuccess: () => {
      toast({
        title: "Bounty created!",
        description: `Staked ${newCredits} credits. You'll be notified when a report is uploaded.`,
      });
      setIsCreateOpen(false);
      setNewAddress("");
      setNewCredits(10);
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

  const cancelMutation = useMutation({
    mutationFn: async (bountyId: number) => {
      return apiRequest('DELETE', `/api/bounties/${bountyId}`);
    },
    onSuccess: () => {
      toast({
        title: "Bounty cancelled",
        description: "Your staked credits have been refunded.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/bounties'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to cancel bounty",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const BountyCard = ({ bounty, showActions = false }: { bounty: Bounty; showActions?: boolean }) => {
    const status = statusConfig[bounty.status as keyof typeof statusConfig] || statusConfig.open;
    const StatusIcon = status.icon;

    return (
      <Card className="hover-elevate transition-all" data-testid={`card-bounty-${bounty.id}`}>
        <CardContent className="p-4 space-y-3">
          {/* Address */}
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <p className="font-medium text-sm leading-tight line-clamp-2">
              {bounty.propertyAddress}
            </p>
          </div>

          {/* Meta */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Badge className={`${status.color} border-0`}>
                <StatusIcon className="w-3 h-3 mr-1" />
                {status.label}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                <Coins className="w-3 h-3 mr-1" />
                {bounty.stakedCredits} credits
              </Badge>
            </div>
            <span className="text-xs text-muted-foreground">
              {formatDate(bounty.createdAt)}
            </span>
          </div>

          {/* Actions */}
          {showActions && bounty.status === 'open' && (
            <div className="pt-2 border-t">
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => cancelMutation.mutate(bounty.id)}
                disabled={cancelMutation.isPending}
                data-testid={`button-cancel-bounty-${bounty.id}`}
              >
                <XCircle className="w-4 h-4 mr-2" />
                Cancel & Refund
              </Button>
            </div>
          )}

          {bounty.status === 'fulfilled' && bounty.fulfilledReportId && (
            <div className="pt-2 border-t">
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                asChild
              >
                <Link href={`/my-reports`}>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  View Report
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Bounties</h1>
          <p className="text-muted-foreground">
            Request reports for specific properties and earn rewards
          </p>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-bounty">
              <Plus className="w-4 h-4 mr-2" />
              Create Bounty
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create a Report Bounty</DialogTitle>
              <DialogDescription>
                Stake credits to request an inspection report for a specific property. 
                When someone uploads a matching report, you'll be notified and the credits 
                will be transferred to them.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium">Property Address</label>
                <Input
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  placeholder="123 Main St, City, State ZIP"
                  className="mt-1"
                  data-testid="input-new-bounty-address"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Credits to Stake</label>
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    type="number"
                    min={10}
                    value={newCredits}
                    onChange={(e) => setNewCredits(Math.max(10, parseInt(e.target.value) || 10))}
                    className="w-24"
                    data-testid="input-new-bounty-credits"
                  />
                  <span className="text-sm text-muted-foreground">
                    (minimum 10 credits)
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Higher stakes may attract faster responses
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={() => createMutation.mutate()}
                disabled={!newAddress || createMutation.isPending}
                data-testid="button-confirm-create-bounty"
              >
                <Coins className="w-4 h-4 mr-2" />
                Stake {newCredits} Credits
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="my-bounties" className="w-full">
        <TabsList>
          <TabsTrigger value="my-bounties" data-testid="tab-my-bounties">
            My Bounties ({data?.myBounties?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="open-bounties" data-testid="tab-open-bounties">
            Open Bounties ({data?.openBounties?.length ?? 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="my-bounties" className="mt-6">
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
          ) : data?.myBounties && data.myBounties.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.myBounties.map((bounty) => (
                <BountyCard key={bounty.id} bounty={bounty} showActions />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <Bell className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No bounties yet</h3>
                <p className="text-muted-foreground mb-6">
                  Create a bounty to request inspection reports for properties you're interested in.
                </p>
                <Button onClick={() => setIsCreateOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Bounty
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="open-bounties" className="mt-6">
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
          ) : data?.openBounties && data.openBounties.length > 0 ? (
            <>
              <div className="bg-muted/50 border rounded-lg p-4 mb-6">
                <p className="text-sm text-muted-foreground">
                  <Upload className="w-4 h-4 inline mr-2" />
                  Earn credits by uploading inspection reports for these requested properties!
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.openBounties.map((bounty) => (
                  <BountyCard key={bounty.id} bounty={bounty} />
                ))}
              </div>
            </>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <Bell className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No open bounties</h3>
                <p className="text-muted-foreground">
                  Check back later - investors are always looking for new properties!
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
