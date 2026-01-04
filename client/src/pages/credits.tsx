import { useQuery } from "@tanstack/react-query";
import { 
  Coins, 
  TrendingUp, 
  TrendingDown, 
  Upload, 
  Download,
  Gift,
  Bell,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { CreditTransaction } from "@shared/schema";

interface CreditsData {
  balance: number;
  totalEarned: number;
  totalSpent: number;
  transactions: CreditTransaction[];
}

const transactionIcons: Record<string, typeof Upload> = {
  upload: Upload,
  download: Download,
  signup_bonus: Gift,
  bounty_stake: Bell,
  bounty_earned: Gift,
};

const transactionColors: Record<string, string> = {
  upload: 'text-green-500 bg-green-500/10',
  download: 'text-orange-500 bg-orange-500/10',
  signup_bonus: 'text-primary bg-primary/10',
  bounty_stake: 'text-orange-500 bg-orange-500/10',
  bounty_earned: 'text-green-500 bg-green-500/10',
};

export default function CreditsPage() {
  const { data, isLoading, error } = useQuery<CreditsData>({
    queryKey: ['/api/credits'],
  });

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleDateString(undefined, { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Credits</h1>
        <p className="text-muted-foreground">
          Your credit balance and transaction history
        </p>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-4 mb-2">
              <p className="text-sm font-medium text-muted-foreground">Current Balance</p>
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Coins className="w-5 h-5 text-primary" />
              </div>
            </div>
            {isLoading ? (
              <Skeleton className="h-10 w-24" />
            ) : (
              <p className="text-4xl font-bold font-mono" data-testid="text-balance">
                {data?.balance ?? 0}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-4 mb-2">
              <p className="text-sm font-medium text-muted-foreground">Total Earned</p>
              <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
            </div>
            {isLoading ? (
              <Skeleton className="h-10 w-24" />
            ) : (
              <p className="text-4xl font-bold font-mono text-green-500" data-testid="text-earned">
                +{data?.totalEarned ?? 0}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-4 mb-2">
              <p className="text-sm font-medium text-muted-foreground">Total Spent</p>
              <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center">
                <TrendingDown className="w-5 h-5 text-orange-500" />
              </div>
            </div>
            {isLoading ? (
              <Skeleton className="h-10 w-24" />
            ) : (
              <p className="text-4xl font-bold font-mono text-orange-500" data-testid="text-spent">
                -{data?.totalSpent ?? 0}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>All your credit transactions</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : data?.transactions && data.transactions.length > 0 ? (
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-2">
                {data.transactions.map((tx) => {
                  const Icon = transactionIcons[tx.type] || Coins;
                  const colorClass = transactionColors[tx.type] || 'text-muted-foreground bg-muted';
                  const isPositive = tx.amount > 0;

                  return (
                    <div
                      key={tx.id}
                      className="flex items-center gap-4 p-3 rounded-lg border"
                      data-testid={`transaction-${tx.id}`}
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${colorClass}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm capitalize">
                          {tx.type.replace('_', ' ')}
                        </p>
                        {tx.description && (
                          <p className="text-xs text-muted-foreground truncate">
                            {tx.description}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className={`font-bold font-mono ${isPositive ? 'text-green-500' : 'text-orange-500'}`}>
                          {isPositive ? '+' : ''}{tx.amount}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(tx.createdAt)}
                        </p>
                      </div>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${isPositive ? 'bg-green-500/10' : 'bg-orange-500/10'}`}>
                        {isPositive ? (
                          <ArrowUpRight className="w-3 h-3 text-green-500" />
                        ) : (
                          <ArrowDownRight className="w-3 h-3 text-orange-500" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Coins className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No transactions yet</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
