import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { FileText, Loader2 } from "lucide-react";

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const { login, register, isLoggingIn, isRegistering, isAuthenticated } = useAuth();
  const { toast } = useToast();

  if (isAuthenticated) {
    setLocation("/dashboard");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (isLogin) {
        await login({ email, password });
        toast({
          title: "Welcome back!",
          description: "You've successfully signed in.",
        });
      } else {
        await register({ email, password, firstName, lastName });
        toast({
          title: "Welcome to InspectSwap!",
          description: "Your account has been created with 50 free credits.",
        });
      }
      setLocation("/dashboard");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Something went wrong";
      const cleanMessage = message.replace(/^\d+:\s*/, "").replace(/[{}"]/g, "").replace(/error:/i, "").trim();
      toast({
        title: isLogin ? "Login failed" : "Registration failed",
        description: cleanMessage || "Please check your credentials and try again.",
        variant: "destructive",
      });
    }
  };

  const isPending = isLoggingIn || isRegistering;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <FileText className="w-8 h-8 text-primary" />
            <span className="text-2xl font-bold">InspectSwap</span>
          </div>
          <CardTitle data-testid="text-auth-title">
            {isLogin ? "Sign In" : "Create Account"}
          </CardTitle>
          <CardDescription>
            {isLogin 
              ? "Access your negotiation arsenal" 
              : "Get 50 free credits to start winning negotiations"
            }
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {!isLogin && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="John"
                    data-testid="input-first-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Doe"
                    data-testid="input-last-name"
                  />
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                data-testid="input-email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isLogin ? "Enter your password" : "At least 6 characters"}
                required
                minLength={6}
                data-testid="input-password"
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isPending}
              data-testid="button-auth-submit"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {isLogin ? "Signing in..." : "Creating account..."}
                </>
              ) : (
                isLogin ? "Sign In" : "Create Account"
              )}
            </Button>
            <p className="text-sm text-muted-foreground text-center">
              {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-primary underline-offset-4 hover:underline"
                data-testid="button-toggle-auth-mode"
              >
                {isLogin ? "Create one" : "Sign in"}
              </button>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
