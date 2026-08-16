import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Globe2, Search, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { EmptyState, ErrorState, LoadingState } from "@/components/common/StateViews";
import { DataPagination } from "@/components/ds/DataPagination";
import { LeadCard } from "@/components/ds/LeadCard";
import { StatusBadge } from "@/components/ds/StatusBadge";
import { AppShell } from "@/components/layout/AppShell";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toUserMessage } from "@/lib/errors";
import { deleteLead } from "@/lib/leads.functions";
import { leadListQuery, leadQueryKeys } from "@/lib/query/lead-queries";
import { LEAD_STATUSES, LEAD_STATUS_LABELS, type LeadStatus } from "@/types/lead";

const searchSchema = z.object({
  page: z.number().int().min(1).catch(1),
  q: z.string().catch(""),
  status: z.string().catch(""),
  website: z.enum(["all", "yes", "no"]).catch("all"),
});

export const Route = createFileRoute("/_authenticated/leads/")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Leads — LeadHunter" },
      {
        name: "description",
        content: "Lista completa dos seus leads com busca, filtros e paginação.",
      },
      { property: "og:title", content: "Leads — LeadHunter" },
      {
        property: "og:description",
        content: "Pesquise, filtre e gerencie os leads da sua prospecção local.",
      },
    ],
  }),
  component: LeadsPage,
});

const PAGE_SIZE = 10;

function LeadsPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const queryClient = useQueryClient();

  const [term, setTerm] = useState(search.q);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const params = {
    page: search.page,
    pageSize: PAGE_SIZE,
    search: search.q,
    status: (LEAD_STATUSES as readonly string[]).includes(search.status)
      ? (search.status as LeadStatus)
      : null,
    hasWebsite: search.website === "all" ? null : search.website === "yes",
    city: "",
  };

  const { data, isPending, isError, error, refetch } = useQuery(leadListQuery(params));

  const removeMutation = useMutation({
    mutationFn: (id: string) => deleteLead({ data: { id } }),
    onSuccess: async () => {
      toast.success("Lead excluído.");
      setPendingDeleteId(null);
      await queryClient.invalidateQueries({ queryKey: leadQueryKeys.all });
    },
    onError: (mutationError) => toast.error(toUserMessage(mutationError)),
  });

  function updateSearch(patch: Partial<z.infer<typeof searchSchema>>) {
    void navigate({ search: (previous) => ({ ...previous, page: 1, ...patch }) });
  }

  return (
    <AppShell
      title="Leads"
      description="Empresas locais na sua carteira de prospecção."
      actions={
        <Button asChild>
          <Link to="/leads/new">Novo lead</Link>
        </Button>
      }
    >
      <div className="space-y-5">
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-soft md:flex-row md:items-center">
          <form
            className="flex flex-1 items-center gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              updateSearch({ q: term });
            }}
          >
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Buscar por empresa, categoria, cidade, e-mail..."
                value={term}
                onChange={(event) => setTerm(event.target.value)}
              />
            </div>
            <Button type="submit" variant="secondary">
              Buscar
            </Button>
          </form>

          <Select
            value={search.status === "" ? "ALL" : search.status}
            onValueChange={(value) => updateSearch({ status: value === "ALL" ? "" : value })}
          >
            <SelectTrigger className="md:w-52">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos os status</SelectItem>
              {LEAD_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {LEAD_STATUS_LABELS[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={search.website}
            onValueChange={(value) => updateSearch({ website: value as "all" | "yes" | "no" })}
          >
            <SelectTrigger className="md:w-44">
              <SelectValue placeholder="Site" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Com e sem site</SelectItem>
              <SelectItem value="no">Sem site</SelectItem>
              <SelectItem value="yes">Com site</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isPending ? (
          <LoadingState label="Carregando leads..." />
        ) : isError ? (
          <ErrorState message={toUserMessage(error)} onRetry={() => void refetch()} />
        ) : data.items.length === 0 ? (
          <EmptyState
            title="Nenhum lead encontrado"
            description="Ajuste a busca e os filtros ou cadastre um novo lead para começar."
            action={
              <Button asChild>
                <Link to="/leads/new">Cadastrar lead</Link>
              </Button>
            }
          />
        ) : (
          <>
            <div className="grid gap-3 md:hidden">
              {data.items.map((lead) => (
                <LeadCard key={lead.id} lead={lead} onDelete={setPendingDeleteId} />
              ))}
            </div>

            <div className="hidden overflow-x-auto rounded-xl border border-border bg-card shadow-soft md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Cidade</TableHead>
                    <TableHead>Site</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.items.map((lead) => (
                    <TableRow key={lead.id}>
                      <TableCell className="font-medium">
                        <Link
                          to="/leads/$leadId"
                          params={{ leadId: lead.id }}
                          className="hover:text-primary"
                        >
                          {lead.companyName}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {lead.businessCategory ?? "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{lead.city ?? "—"}</TableCell>
                      <TableCell>
                        {lead.hasWebsite ? (
                          <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                            <Globe2 className="size-4" /> Sim
                          </span>
                        ) : (
                          <span className="text-sm text-accent-foreground">Não</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={lead.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setPendingDeleteId(lead.id)}
                          aria-label={`Excluir ${lead.companyName}`}
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <DataPagination
              page={data.page}
              pageCount={data.pageCount}
              total={data.total}
              itemLabel="lead(s)"
              onPageChange={(page) =>
                void navigate({ search: (previous) => ({ ...previous, page }) })
              }
            />
          </>
        )}
      </div>

      <AlertDialog
        open={pendingDeleteId !== null}
        onOpenChange={(open) => !open && setPendingDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir lead?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é permanente e não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => pendingDeleteId && removeMutation.mutate(pendingDeleteId)}
              disabled={removeMutation.isPending}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}
