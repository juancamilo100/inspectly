import { useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { useAuth } from "@/hooks/use-auth";
import { Skeleton } from "@/components/ui/skeleton";

import NotFound from "@/pages/not-found";
import LandingPage from "@/pages/landing";
import AuthPage from "@/pages/auth";
import DashboardPage from "@/pages/dashboard";
import BrowsePage from "@/pages/browse";
import MyReportsPage from "@/pages/my-reports";
import CreditsPage from "@/pages/credits";
import BountiesPage from "@/pages/bounties";
import VaultPage from "@/pages/vault";

interface DashboardData {
  creditBalance: number;
}

function AuthenticatedLayout() {
  const { data: dashboardData } = useQuery<DashboardData>({
    queryKey: ['/api/dashboard'],
  });

  // Claim signup bonus on first visit
  useEffect(() => {
    fetch('/api/signup-bonus', { method: 'POST', credentials: 'include' })
      .catch(() => {});
  }, []);

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar creditBalance={dashboardData?.creditBalance ?? 0} />
        <div className="flex flex-col flex-1 min-w-0">
          <header className="flex items-center justify-between gap-4 p-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-auto">
            <Switch>
              <Route path="/dashboard" component={DashboardPage} />
              <Route path="/browse" component={BrowsePage} />
              <Route path="/my-reports" component={MyReportsPage} />
              <Route path="/vault" component={VaultPage} />
              <Route path="/credits" component={CreditsPage} />
              <Route path="/bounties" component={BountiesPage} />
              <Route path="/">
                <DashboardPage />
              </Route>
              <Route component={NotFound} />
            </Switch>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function AppContent() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [location] = useLocation();

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center space-y-4">
          <Skeleton className="h-12 w-12 rounded-full mx-auto" />
          <Skeleton className="h-4 w-32 mx-auto" />
        </div>
      </div>
    );
  }

  // Show landing page or auth page for unauthenticated users
  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/auth" component={AuthPage} />
        <Route component={LandingPage} />
      </Switch>
    );
  }

  // Show authenticated layout
  return <AuthenticatedLayout />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="system">
        <TooltipProvider>
          <AppContent />
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
