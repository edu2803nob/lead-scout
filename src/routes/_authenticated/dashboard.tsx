import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Building2, Globe2, Target, Trophy } from "lucide-react";

import { EmptyState, ErrorState, LoadingState } from "@/components/common/StateViews";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toUserMessage } from "@/lib/errors";
import { leadStatsQuery } from "@/lib/query/lead-queries";
import { LEAD_STATUS_LABELS, LEAD_STATUSES } from "@/types/lead";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — LeadHunter" },
      {
        name: "description",
        content: "Visão geral da sua carteira de leads de empresas locais no LeadHunter.",
      },
      { property: "og:title", content: "Dashboard — LeadHunter" },
      {
        property: "og:description",
        content: "Acompanhe leads abertos, negócios ganhos e empresas sem site.",
      },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { data, isPending, isError, error, refetch } = useQuery(leadStatsQuery());

  return (
    <AppShell
      title="Dashboard"
      description="Visão geral da sua prospecção."
      actions={
        <Button asChild>
          <Link to="/leads/new">Novo lead</Link>
        </Button>
      }
    >
      {isPending ? (
        <LoadingState label="Carregando indicadores..." />
      ) : isError ? (
        <ErrorState message={toUserMessage(error)} onRetry={() => void refetch()} />
      ) : data.total === 0 ? (
        <EmptyState
          title="Nenhum lead cadastrado"
          description="Cadastre a primeira empresa para começar a acompanhar seus indicadores."
          action={
            <Button asChild>
              <Link to="/leads/new">Cadastrar lead</Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Total de leads" value={data.total} icon={Building2} />
            <MetricCard label="Em aberto" value={data.open} icon={Target} />
            <MetricCard label="Ganhos" value={data.won} icon={Trophy} />
            <MetricCard label="Sem site" value={data.withoutWebsite} icon={Globe2} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Leads por status</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {LEAD_STATUSES.filter((status) => data.byStatus[status] > 0).map((status) => (
                <div
                  key={status}
                  className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
                >
                  <span className="text-sm text-muted-foreground">
                    {LEAD_STATUS_LABELS[status]}
                  </span>
                  <span className="font-display text-sm font-semibold">
                    {data.byStatus[status]}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </AppShell>
  );
}

function MetricCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card className="shadow-soft">
      <CardContent className="flex items-center justify-between pt-6">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="font-display text-3xl font-semibold text-foreground">{value}</p>
        </div>
        <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="size-5" />
        </span>
      </CardContent>
    </Card>
  );
}
