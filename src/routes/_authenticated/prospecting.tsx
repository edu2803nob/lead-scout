import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Download, Globe, Loader2, MapPin, Star, XCircle } from "lucide-react";
import { useState } from "react";

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Checkbox,
  EmptyState,
  ErrorState,
  LoadingState,
  Progress,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  toast,
} from "@/components/ds";
import { AppShell } from "@/components/layout/AppShell";
import { ProspectingForm } from "@/components/prospecting/ProspectingForm";
import { toUserMessage } from "@/lib/errors";
import {
  cancelProspection,
  importProspection,
  startProspection,
} from "@/lib/prospecting.functions";
import { categoryTreeQuery } from "@/lib/query/category-queries";
import { prospectingQueryKeys, prospectionsQuery } from "@/lib/query/prospecting-queries";
import type { ProspectionFormValues } from "@/lib/validation/prospecting";
import { PROSPECTION_STATUS_LABELS, type ProspectionDetail } from "@/types/prospecting";

export const Route = createFileRoute("/_authenticated/prospecting")({
  head: () => ({
    meta: [
      { title: "Prospecção de empresas locais — LeadHunter" },
      {
        name: "description",
        content:
          "Encontre empresas locais por categoria, cidade e raio usando dados públicos do Google e importe como leads.",
      },
      { property: "og:title", content: "Prospecção de empresas locais — LeadHunter" },
      {
        property: "og:description",
        content: "Busque empresas por segmento e região e importe os resultados como leads.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProspectingPage,
});

const STATUS_VARIANT: Record<string, string> = {
  RUNNING: "bg-info-soft text-info-strong",
  COMPLETED: "bg-success-soft text-success-strong",
  FAILED: "bg-destructive/10 text-destructive",
  CANCELLED: "bg-muted text-muted-foreground",
  PENDING: "bg-warning-soft text-warning-strong",
};

function ProspectingPage() {
  const queryClient = useQueryClient();
  const categories = useQuery(categoryTreeQuery());
  const history = useQuery(prospectionsQuery(10));
  const [detail, setDetail] = useState<ProspectionDetail | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: prospectingQueryKeys.all });
    void queryClient.invalidateQueries({ queryKey: ["leads"] });
  };

  const run = useMutation({
    mutationFn: (values: ProspectionFormValues) => startProspection({ data: values }),
    onSuccess: (data) => {
      setDetail(data);
      setSelected(new Set(data.results.filter((item) => !item.imported).map((item) => item.id)));
      invalidate();
      if (data.prospection.status === "FAILED") {
        toast.error(data.prospection.errorMessage ?? "A prospecção falhou.");
      } else {
        toast.success(`${data.results.length} empresa(s) encontrada(s).`);
      }
    },
    onError: (error) => toast.error(toUserMessage(error)),
  });

  const cancel = useMutation({
    mutationFn: (id: string) => cancelProspection({ data: { id } }),
    onSuccess: () => {
      toast.info("Prospecção cancelada.");
      invalidate();
    },
    onError: (error) => toast.error(toUserMessage(error)),
  });

  const importer = useMutation({
    mutationFn: (input: { id: string; resultIds: string[] }) => importProspection({ data: input }),
    onSuccess: ({ summary }) => {
      toast.success(
        `${summary.created} lead(s) criado(s), ${summary.updated} atualizado(s), ${summary.skipped} ignorado(s).`,
      );
      setSelected(new Set());
      invalidate();
      if (detail) {
        setDetail({
          ...detail,
          results: detail.results.map((item) =>
            selected.has(item.id) ? { ...item, imported: true } : item,
          ),
        });
      }
    },
    onError: (error) => toast.error(toUserMessage(error)),
  });

  const results = detail?.results ?? [];
  const progress = detail
    ? Math.min(
        100,
        Math.round((results.length / Math.max(1, detail.prospection.requestedLimit)) * 100),
      )
    : 0;

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <AppShell
      title="Prospecção"
      description="Busque empresas locais por categoria e região e importe os resultados como leads."
    >
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Nova prospecção</CardTitle>
            <CardDescription>
              Os dados vêm de informações públicas de estabelecimentos. Respeitamos os limites do
              provedor.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {categories.isPending ? (
              <LoadingState label="Carregando categorias..." />
            ) : categories.isError ? (
              <ErrorState
                message={toUserMessage(categories.error)}
                onRetry={() => void categories.refetch()}
              />
            ) : (
              <ProspectingForm
                categories={categories.data ?? []}
                isRunning={run.isPending}
                onSubmit={(values) => run.mutate(values)}
              />
            )}
          </CardContent>
        </Card>

        {run.isPending ? (
          <Card>
            <CardContent className="flex items-center gap-3 py-6">
              <Loader2 className="size-4 animate-spin text-primary" />
              <div className="flex-1">
                <p className="text-sm font-medium">Consultando empresas...</p>
                <Progress value={40} className="mt-2" />
              </div>
            </CardContent>
          </Card>
        ) : null}

        {detail ? (
          <Card>
            <CardHeader className="gap-3 sm:flex sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <CardTitle className="truncate">{detail.prospection.name}</CardTitle>
                <CardDescription>
                  {results.length} de {detail.prospection.requestedLimit} solicitados ·{" "}
                  {PROSPECTION_STATUS_LABELS[detail.prospection.status]}
                </CardDescription>
                <Progress value={progress} className="mt-3 max-w-sm" />
              </div>
              <div className="mt-3 flex shrink-0 flex-wrap gap-2 sm:mt-0">
                {detail.prospection.status === "RUNNING" ? (
                  <Button
                    variant="outline"
                    onClick={() => cancel.mutate(detail.prospection.id)}
                    disabled={cancel.isPending}
                  >
                    <XCircle className="mr-2 size-4" />
                    Cancelar
                  </Button>
                ) : null}
                <Button
                  onClick={() =>
                    importer.mutate({
                      id: detail.prospection.id,
                      resultIds: Array.from(selected),
                    })
                  }
                  disabled={importer.isPending || selected.size === 0}
                >
                  {importer.isPending ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : (
                    <Download className="mr-2 size-4" />
                  )}
                  Importar ({selected.size})
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {detail.prospection.errorMessage ? (
                <p className="mb-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {detail.prospection.errorMessage}
                </p>
              ) : null}

              {results.length === 0 ? (
                <EmptyState
                  title="Nenhuma empresa encontrada"
                  description="Ajuste a categoria, a cidade ou aumente o raio da busca."
                />
              ) : (
                <>
                  {/* Desktop table */}
                  <div className="hidden md:block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-10" />
                          <TableHead>Empresa</TableHead>
                          <TableHead>Local</TableHead>
                          <TableHead>Contato</TableHead>
                          <TableHead>Google</TableHead>
                          <TableHead>Site</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {results.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>
                              <Checkbox
                                checked={selected.has(item.id)}
                                onCheckedChange={() => toggle(item.id)}
                                aria-label={`Selecionar ${item.name}`}
                              />
                            </TableCell>
                            <TableCell className="font-medium">
                              {item.name}
                              {item.imported ? (
                                <Badge className="ml-2 bg-success-soft text-success-strong">
                                  Importado
                                </Badge>
                              ) : null}
                              {item.providerCategory ? (
                                <p className="text-xs text-muted-foreground">
                                  {item.providerCategory}
                                </p>
                              ) : null}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {[item.neighborhood, item.city, item.state]
                                .filter(Boolean)
                                .join(" · ") || "—"}
                            </TableCell>
                            <TableCell className="text-sm">{item.phone ?? "—"}</TableCell>
                            <TableCell className="text-sm">
                              {item.rating === null ? (
                                "—"
                              ) : (
                                <span className="inline-flex items-center gap-1">
                                  <Star className="size-3.5 text-warning" />
                                  {item.rating.toFixed(1)} ({item.reviewCount ?? 0})
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-sm">
                              {item.websiteUrl ? (
                                <Globe className="size-4 text-success" aria-label="Possui site" />
                              ) : (
                                <Badge variant="outline">Sem site</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Mobile list */}
                  <ul className="space-y-3 md:hidden">
                    {results.map((item) => (
                      <li
                        key={item.id}
                        className="flex gap-3 rounded-xl border border-border p-3 text-sm"
                      >
                        <Checkbox
                          checked={selected.has(item.id)}
                          onCheckedChange={() => toggle(item.id)}
                          aria-label={`Selecionar ${item.name}`}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{item.name}</p>
                          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="size-3" />
                            {[item.neighborhood, item.city].filter(Boolean).join(" · ") || "—"}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">{item.phone ?? "—"}</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {item.rating !== null ? (
                              <Badge variant="outline">
                                {item.rating.toFixed(1)} ★ ({item.reviewCount ?? 0})
                              </Badge>
                            ) : null}
                            {item.websiteUrl ? null : <Badge variant="outline">Sem site</Badge>}
                            {item.imported ? (
                              <Badge className="bg-success-soft text-success-strong">
                                Importado
                              </Badge>
                            ) : null}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Prospecções recentes</CardTitle>
          </CardHeader>
          <CardContent>
            {history.isPending ? (
              <LoadingState label="Carregando histórico..." />
            ) : history.isError ? (
              <ErrorState
                message={toUserMessage(history.error)}
                onRetry={() => void history.refetch()}
              />
            ) : (history.data ?? []).length === 0 ? (
              <EmptyState
                title="Nenhuma prospecção ainda"
                description="Inicie sua primeira busca no formulário acima."
              />
            ) : (
              <ul className="divide-y divide-border">
                {(history.data ?? []).map((item) => (
                  <li key={item.id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
                    <span className="min-w-0 flex-1 truncate font-medium">{item.name}</span>
                    <Badge className={STATUS_VARIANT[item.status] ?? ""}>
                      {PROSPECTION_STATUS_LABELS[item.status]}
                    </Badge>
                    <span className="text-muted-foreground">
                      {item.foundCount} encontrados · {item.importedCount} importados
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
