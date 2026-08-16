import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

import { AppShell } from "@/components/layout/AppShell";
import { LeadForm } from "@/components/leads/LeadForm";
import { Card, CardContent } from "@/components/ui/card";
import { toUserMessage } from "@/lib/errors";
import { createLead } from "@/lib/leads.functions";
import { leadQueryKeys } from "@/lib/query/lead-queries";
import type { LeadInput } from "@/lib/validation/lead";

export const Route = createFileRoute("/_authenticated/leads/new")({
  head: () => ({
    meta: [
      { title: "Novo lead — LeadHunter" },
      {
        name: "description",
        content: "Cadastre uma nova empresa local na sua carteira de prospecção.",
      },
      { property: "og:title", content: "Novo lead — LeadHunter" },
      {
        property: "og:description",
        content: "Registre dados de contato, localização e status do lead.",
      },
    ],
  }),
  component: NewLeadPage,
});

function NewLeadPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (data: LeadInput) => createLead({ data }),
    onSuccess: async (lead) => {
      toast.success("Lead criado com sucesso.");
      await queryClient.invalidateQueries({ queryKey: leadQueryKeys.all });
      await navigate({ to: "/leads/$leadId", params: { leadId: lead.id } });
    },
    onError: (error) => toast.error(toUserMessage(error)),
  });

  return (
    <AppShell title="Novo lead" description="Cadastre uma empresa local manualmente.">
      <Card className="max-w-4xl shadow-soft">
        <CardContent className="pt-6">
          <LeadForm
            submitLabel="Criar lead"
            pending={mutation.isPending}
            onSubmit={(data) => mutation.mutate(data)}
            onCancel={() => void navigate({ to: "/leads" })}
          />
        </CardContent>
      </Card>
    </AppShell>
  );
}
