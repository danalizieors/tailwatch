import { useEffect, useRef, useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Button } from "../ui/button";
import { BellRing, ChevronDown, Github, HardDrive, LogOut, User } from "lucide-react";

export function SignIn() {
  const { signIn } = useAuthActions();
  const enableDebug = import.meta.env.VITE_ENABLE_DEBUG_AUTH === 'true';
  
  const enterGuestMode = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('debug', 'true');
    window.location.href = url.toString();
  };

  return (
    <div className="flex min-h-[100svh] w-full flex-col items-center justify-center overflow-y-auto bg-background p-4">
      <div className="w-full max-w-sm space-y-8 text-center">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-foreground uppercase">Tailwatch</h1>
          <p className="text-muted-foreground">Sign in to access your telemetry dashboard</p>
        </div>
        
        <div className="space-y-3">
          <Button 
            variant="outline" 
            size="lg" 
            className="w-full h-12 gap-3 border-primary/20 hover:bg-primary/10"
            onClick={() => void signIn("github")}
          >
            <Github className="h-5 w-5" />
            Continue with GitHub
          </Button>

          {enableDebug && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full text-muted-foreground hover:text-primary"
              onClick={enterGuestMode}
            >
              Enter Guest Mode (Debug)
            </Button>
          )}
        </div>
        
        <p className="text-xs text-muted-foreground/60">
          Telemetry for distributed systems and hierarchical events.
        </p>
      </div>
    </div>
  );
}

interface UserMenuProps {
  volume?: string
}

export function UserMenu({ volume }: UserMenuProps) {
  const { signOut } = useAuthActions();
  const { isAuthenticated } = useConvexAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  
  const isDebugMode = typeof window !== 'undefined' && localStorage.getItem('debug_auth') === 'true';
  const user = useQuery(api.functions.currentUser);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleSignOut = () => {
    setIsOpen(false);
    if (isDebugMode) {
      localStorage.removeItem('debug_auth');
      window.location.href = '/';
    } else {
      void signOut();
    }
  };

  if (!isAuthenticated && !isDebugMode) return null;

  const displayName = user?.name || user?.email || (isDebugMode ? "Guest Mode" : "GitHub User");
  const avatarInitial = (displayName.trim().charAt(0) || "G").toUpperCase();
  const avatarSrc = !isDebugMode ? user?.image ?? undefined : undefined;
  const deviceSettingsHref = volume && volume.trim() ? `/settings/devices?volume=${encodeURIComponent(volume)}` : '/settings/devices';
  const volumeSettingsHref = volume && volume.trim() ? `/settings/volumes?volume=${encodeURIComponent(volume)}` : '/settings/volumes';

  return (
    <div ref={menuRef} className="relative ml-1 flex items-center border-l border-border/40 pl-1 sm:ml-2 sm:pl-2">
      <Button
        type="button"
        variant="ghost"
        className="h-9 gap-1 rounded-full px-1 pr-1 hover:bg-primary/10 sm:pr-2"
        onClick={() => setIsOpen((open) => !open)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        title={isDebugMode ? "Guest menu" : "GitHub account menu"}
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-primary overflow-hidden">
          {avatarSrc ? (
            <img src={avatarSrc} alt={displayName} className="h-full w-full object-cover" />
          ) : (
            user ? (
              <span className="text-[10px] font-bold uppercase">{avatarInitial}</span>
            ) : (
              <User className="h-3.5 w-3.5" />
            )
          )}
        </span>
        <ChevronDown className="hidden h-3.5 w-3.5 text-muted-foreground sm:block" />
      </Button>

      {isOpen && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-border/60 bg-background/95 p-1 shadow-xl backdrop-blur-md"
        >
          <div className="px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
              {isDebugMode ? "Guest Session" : "GitHub"}
            </p>
            <p className="truncate text-xs font-medium text-foreground">{displayName}</p>
          </div>
          <a
            href={volumeSettingsHref}
            className="flex h-9 w-full items-center gap-2 rounded-lg px-3 text-sm hover:bg-muted"
            role="menuitem"
            onClick={() => setIsOpen(false)}
            title="Manage volumes and publish keys"
          >
            <HardDrive className="h-4 w-4" />
            Manage volumes
          </a>
          <a
            href={deviceSettingsHref}
            className="flex h-9 w-full items-center gap-2 rounded-lg px-3 text-sm hover:bg-muted"
            role="menuitem"
            onClick={() => setIsOpen(false)}
            title="Manage notification devices"
          >
            <BellRing className="h-4 w-4" />
            Manage devices
          </a>
          <Button
            type="button"
            variant="ghost"
            className="h-9 w-full justify-start rounded-lg gap-2"
            onClick={handleSignOut}
            role="menuitem"
            title={isDebugMode ? "Exit Guest Mode" : "Sign Out"}
          >
            <LogOut className="h-4 w-4" />
            {isDebugMode ? "Exit Guest Mode" : "Sign out"}
          </Button>
        </div>
      )}
    </div>
  );
}
