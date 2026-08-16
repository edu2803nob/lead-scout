import { Link, useRouter } from "@tanstack/react-router";
import { LayoutDashboard, LogOut, Radar, Tags, Users } from "lucide-react";
import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/leads", label: "Leads", icon: Users },
  { to: "/settings/categories", label: "Categorias", icon: Tags },
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

  const brand = (
    <Link to="/dashboard" className="flex min-w-0 items-center gap-2">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand">
        <Radar className="size-5 text-sidebar-primary-foreground" />
      </span>
      <span className="truncate font-display text-lg font-semibold tracking-tight">LeadHunter</span>
    </Link>
  );

  return (
    <div className="flex min-h-screen flex-col bg-background md:flex-row">
      {/* Desktop sidebar */}
      <aside className="hidden shrink-0 flex-col gap-6 bg-sidebar px-4 py-5 text-sidebar-foreground md:flex md:w-64">
        <div className="px-2">{brand}</div>

        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              activeProps={{ className: cn("bg-sidebar-accent text-sidebar-accent-foreground") }}
            >
              <Icon className="size-4 shrink-0" />
              {label}
            </Link>
          ))}
        </nav>

        <div className="mt-auto">
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

      {/* Mobile top bar */}
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 bg-sidebar px-4 py-3 text-sidebar-foreground md:hidden">
        {brand}
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          onClick={handleSignOut}
          disabled={signingOut}
          aria-label="Sair"
        >
          <LogOut className="size-4" />
        </Button>
      </header>

      <main className="flex flex-1 flex-col pb-16 md:pb-0">
        <div className="border-b border-border bg-card px-5 py-5 md:px-8">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 sm:flex sm:flex-wrap sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h1 className="truncate font-display text-xl font-semibold text-foreground sm:text-2xl">
                {title}
              </h1>
              {description ? (
                <p className="mt-1 text-sm text-muted-foreground">{description}</p>
              ) : null}
            </div>
            {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
          </div>
        </div>
        <div className="flex-1 px-4 py-5 sm:px-5 md:px-8 md:py-6">{children}</div>
      </main>

      {/* Mobile bottom navigation */}
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-3 border-t border-border bg-card/95 backdrop-blur md:hidden">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className="flex flex-col items-center gap-1 py-2.5 text-xs font-medium text-muted-foreground transition-colors"
            activeProps={{ className: cn("text-primary") }}
          >
            <Icon className="size-5" />
            {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
