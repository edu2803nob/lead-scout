import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { ErrorState, LoadingState } from "@/components/common/StateViews";
import { AppShell } from "@/components/layout/AppShell";
import { LeadForm } from "@/components/leads/LeadForm";
import { LeadStatusBadge } from "@/components/leads/LeadStatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toUserMessage } from "@/lib/errors";
import { updateLead } from "@/lib/leads.functions";
import { leadDetailQuery, leadQueryKeys } from "@/lib/query/lead-queries";
import type { LeadInput, LeadFormValues } from "@/lib/validation/lead";
import type { Lead } from "@/types/lead";

export const Route = createFileRoute("/_authenticated/leads/$leadId")({
  head: () => ({
    meta: [
      { title: "Detalhes do lead — LeadHunter" },
      {
        name: "description",
        content: "Consulte e atualize os dados, contatos e o status de um lead.",
      },
      { property: "og:title", content: "Detalhes do lead — LeadHunter" },
      {
        property: "og:description",
        content: "Ficha completa da empresa prospectada com edição em linha.",
      },
    ],
  }),
  component: LeadDetailPage,
});

function toFormValues(lead: Lead): LeadFormValues {
  return {
    companyName: lead.companyName,
    businessCategory: lead.businessCategory ?? "",
    businessSubcategory: lead.businessSubcategory ?? "",
    description: lead.description ?? "",
    phone: lead.phone ?? "",
    email: lead.email ?? "",
    address: lead.address ?? "",
    city: lead.city ?? "",
    state: lead.state ?? "",
    country: lead.country ?? "",
    latitude: lead.latitude ?? "",
    longitude: lead.longitude ?? "",
    websiteUrl: lead.websiteUrl ?? "",
    hasWebsite: lead.hasWebsite,
    status: lead.status,
    source: lead.source ?? "",
  };
}

function LeadDetailPage() {
  const { leadId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);

  const { data, isPending, isError, error, refetch } = useQuery(leadDetailQuery(leadId));

  const mutation = useMutation({
    mutationFn: (input: LeadInput) => updateLead({ data: { id: leadId, ...input } }),
    onSuccess: async () => {
      toast.success("Lead atualizado.");
      setEditing(false);
      await queryClient.invalidateQueries({ queryKey: leadQueryKeys.all });
    },
    onError: (mutationError) => toast.error(toUserMessage(mutationError)),
  });

  if (isPending) {
    return (
      <AppShell title="Lead">
        <LoadingState label="Carregando lead..." />
      </AppShell>
    );
  }

  if (isError || !data) {
    return (
      <AppShell title="Lead">
        <ErrorState
          message={isError ? toUserMessage(error) : "Lead não encontrado."}
          onRetry={() => void refetch()}
        />
      </AppShell>
    );
  }

  return (
    <AppShell
      title={data.companyName}
      description={data.businessCategory ?? "Lead sem categoria definida."}
      actions={
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void navigate({ to: "/leads" })}>
            Voltar
          </Button>
          <Button variant={editing ? "secondary" : "default"} onClick={() => setEditing(!editing)}>
            {editing ? "Cancelar edição" : "Editar"}
          </Button>
        </div>
      }
    >
      {editing ? (
        <Card className="max-w-4xl shadow-soft">
          <CardContent className="pt-6">
            <LeadForm
              initialValues={toFormValues(data)}
              submitLabel="Salvar alterações"
              pending={mutation.isPending}
              onSubmit={(input) => mutation.mutate(input)}
              onCancel={() => setEditing(false)}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid max-w-4xl gap-4 md:grid-cols-2">
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="text-base">Situação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <LeadStatusBadge status={data.status} />
              <Field label="Origem" value={data.source} />
              <Field label="Possui site" value={data.hasWebsite ? "Sim" : "Não"} />
              <Field label="Website" value={data.websiteUrl} />
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="text-base">Contato</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Field label="Telefone" value={data.phone} />
              <Field label="E-mail" value={data.email} />
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="text-base">Localização</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Field label="Endereço" value={data.address} />
              <Field label="Cidade" value={data.city} />
              <Field label="Estado" value={data.state} />
              <Field label="País" value={data.country} />
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="text-base">Descrição</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {data.description ?? "Nenhuma descrição registrada."}
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </AppShell>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm text-foreground">{value?.trim() ? value : "—"}</p>
    </div>
  );
}
