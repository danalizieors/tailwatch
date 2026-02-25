import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Button } from "../ui/button";
import { Github, LogOut, User } from "lucide-react";

export function SignIn() {
  const { signIn } = useAuthActions();
  
  return (
    <div className="flex flex-col items-center justify-center h-full w-full bg-background p-4">
      <div className="w-full max-w-sm space-y-8 text-center">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-foreground uppercase">Tailwatch</h1>
          <p className="text-muted-foreground">Sign in to access your telemetry dashboard</p>
        </div>
        
        <Button 
          variant="outline" 
          size="lg" 
          className="w-full h-12 gap-3 border-primary/20 hover:bg-primary/10"
          onClick={() => void signIn("github")}
        >
          <Github className="h-5 w-5" />
          Continue with GitHub
        </Button>
        
        <p className="text-xs text-muted-foreground/60">
          Telemetry for distributed systems and hierarchical events.
        </p>
      </div>
    </div>
  );
}

export function UserMenu() {
  const { signOut } = useAuthActions();
  const { isAuthenticated } = useConvexAuth();
  
  // Note: We'll need a query to get the current user details
  // For now, we'll just show the logout button
  if (!isAuthenticated) return null;

  return (
    <div className="flex items-center gap-3 ml-4 pl-4 border-l border-border/40">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground hover:text-foreground"
        onClick={() => void signOut()}
        title="Sign Out"
      >
        <LogOut className="h-4 w-4" />
      </Button>
    </div>
  );
}
