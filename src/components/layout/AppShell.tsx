import { Link, useRouter } from "@tanstack/react-router";
import { LayoutDashboard, LogOut, Radar, Users } from "lucide-react";
import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/leads", label: "Leads", icon: Users },
] as const;

interface AppShellProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}

export function AppShell({ title, description, actions, children }: AppShellProps) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    await supabase.auth.signOut();
    await router.navigate({ to: "/auth" });
  }

  return (
    <div className="flex min-h-screen flex-col bg-background md:flex-row">
      <aside className="flex shrink-0 flex-col gap-6 bg-sidebar px-4 py-5 text-sidebar-foreground md:w-64">
        <Link to="/dashboard" className="flex items-center gap-2 px-2">
          <span className="flex size-9 items-center justify-center rounded-xl bg-brand">
            <Radar className="size-5 text-sidebar-primary-foreground" />
          </span>
          <span className="font-display text-lg font-semibold tracking-tight">LeadHunter</span>
        </Link>

        <nav className="flex gap-1 overflow-x-auto md:flex-col">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              activeProps={{
                className: cn("bg-sidebar-accent text-sidebar-accent-foreground"),
              }}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          ))}
        </nav>

        <div className="mt-auto hidden md:block">
          <Button
            variant="ghost"
            className="w-full justify-start text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            onClick={handleSignOut}
            disabled={signingOut}
          >
            <LogOut className="size-4" />
            Sair
          </Button>
        </div>
      </aside>

      <main className="flex-1">
        <header className="border-b border-border bg-card px-5 py-5 md:px-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
              {description ? (
                <p className="mt-1 text-sm text-muted-foreground">{description}</p>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              {actions}
              <Button
                variant="ghost"
                size="sm"
                className="md:hidden"
                onClick={handleSignOut}
                disabled={signingOut}
              >
                <LogOut className="size-4" />
              </Button>
            </div>
          </div>
        </header>
        <div className="px-5 py-6 md:px-8">{children}</div>
      </main>
    </div>
  );
}
