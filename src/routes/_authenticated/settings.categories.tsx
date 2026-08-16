import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ChevronDown, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { AppShell } from "@/components/layout/AppShell";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  ErrorState,
  Input,
  Label,
  LoadingState,
  Switch,
  toast,
} from "@/components/ds";
import { toUserMessage } from "@/lib/errors";
import {
  createCategory,
  createSubcategory,
  deleteCategory,
  deleteSubcategory,
  updateCategory,
  updateSubcategory,
} from "@/lib/categories.functions";
import { categoryQueryKeys, categoryTreeQuery, isAdminQuery } from "@/lib/query/category-queries";
import { normalizeSlug } from "@/lib/validation/category";
import type { CategoryTreeNode } from "@/types/category";

export const Route = createFileRoute("/_authenticated/settings/categories")({
  head: () => ({
    meta: [
      { title: "Categorias de negócio — LeadHunter" },
      {
        name: "description",
        content:
          "Gerencie categorias e subcategorias de negócios locais usadas na prospecção do LeadHunter.",
      },
      { property: "og:title", content: "Categorias de negócio — LeadHunter" },
      {
        property: "og:description",
        content: "Configuração administrativa do catálogo de segmentos de prospecção.",
      },
    ],
  }),
  component: CategoriesSettingsPage,
});

function CategoriesSettingsPage() {
  const queryClient = useQueryClient();
  const admin = useQuery(isAdminQuery());
  const tree = useQuery(categoryTreeQuery(true));
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [dialog, setDialog] = useState<{ categoryId: string | null } | null>(null);

  const isAdmin = admin.data?.isAdmin === true;

  const invalidate = () => queryClient.invalidateQueries({ queryKey: categoryQueryKeys.all });

  const toggleActive = useMutation({
    mutationFn: (vars: { id: string; isActive: boolean; kind: "category" | "subcategory" }) =>
      vars.kind === "category"
        ? updateCategory({ data: { id: vars.id, data: { isActive: vars.isActive } } })
        : updateSubcategory({ data: { id: vars.id, data: { isActive: vars.isActive } } }),
    onSuccess: async () => {
      await invalidate();
    },
    onError: (error) => toast.error(toUserMessage(error)),
  });

  const remove = useMutation({
    mutationFn: (vars: { id: string; kind: "category" | "subcategory" }) =>
      vars.kind === "category"
        ? deleteCategory({ data: { id: vars.id } })
        : deleteSubcategory({ data: { id: vars.id } }),
    onSuccess: async () => {
      toast.success("Registro removido.");
      await invalidate();
    },
    onError: (error) => toast.error(toUserMessage(error)),
  });

  const create = useMutation({
    mutationFn: (vars: { name: string; slug: string; categoryId: string | null }) =>
      vars.categoryId
        ? createSubcategory({
            data: { name: vars.name, slug: vars.slug, categoryId: vars.categoryId },
          })
        : createCategory({ data: { name: vars.name, slug: vars.slug } }),
    onSuccess: async () => {
      toast.success("Registro criado.");
      setDialog(null);
      await invalidate();
    },
    onError: (error) => toast.error(toUserMessage(error)),
  });

  return (
    <AppShell
      title="Categorias de negócio"
      description="Catálogo de segmentos usados na prospecção. Novas categorias podem ser adicionadas sem alteração de código."
      actions={
        isAdmin ? (
          <Button onClick={() => setDialog({ categoryId: null })}>
            <Plus className="size-4" />
            Nova categoria
          </Button>
        ) : null
      }
    >
      {tree.isPending ? (
        <LoadingState label="Carregando catálogo..." />
      ) : tree.isError ? (
        <ErrorState message={toUserMessage(tree.error)} onRetry={() => void tree.refetch()} />
      ) : (tree.data ?? []).length === 0 ? (
        <EmptyState
          title="Nenhuma categoria cadastrada"
          description="Crie a primeira categoria para começar a organizar a prospecção."
        />
      ) : (
        <div className="flex flex-col gap-3">
          {!isAdmin ? (
            <p className="text-sm text-muted-foreground">
              Você está visualizando o catálogo em modo leitura. Apenas administradores podem
              editar.
            </p>
          ) : null}

          {(tree.data as CategoryTreeNode[]).map((category) => {
            const expanded = open[category.id] ?? false;
            return (
              <Card key={category.id} className="shadow-soft">
                <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
                  <button
                    type="button"
                    className="flex min-w-0 items-center gap-2 text-left"
                    onClick={() => setOpen((prev) => ({ ...prev, [category.id]: !expanded }))}
                    aria-expanded={expanded}
                  >
                    <ChevronDown
                      className={`size-4 shrink-0 transition-transform ${expanded ? "" : "-rotate-90"}`}
                    />
                    <CardTitle className="truncate text-base">{category.name}</CardTitle>
                    <Badge variant="secondary">{category.slug}</Badge>
                    <Badge variant="outline">{category.subcategories.length}</Badge>
                    {!category.isActive ? <Badge variant="outline">inativa</Badge> : null}
                  </button>

                  {isAdmin ? (
                    <div className="flex items-center gap-2">
                      <Switch
                        aria-label={`Ativar ${category.name}`}
                        checked={category.isActive}
                        onCheckedChange={(checked) =>
                          toggleActive.mutate({
                            id: category.id,
                            isActive: checked,
                            kind: "category",
                          })
                        }
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDialog({ categoryId: category.id })}
                      >
                        <Plus className="size-4" />
                        Subcategoria
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Remover ${category.name}`}
                        onClick={() => remove.mutate({ id: category.id, kind: "category" })}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  ) : null}
                </CardHeader>

                {expanded ? (
                  <CardContent className="flex flex-col gap-2 border-t border-border pt-4">
                    {category.subcategories.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Nenhuma subcategoria.</p>
                    ) : (
                      category.subcategories.map((sub) => (
                        <div
                          key={sub.id}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2"
                        >
                          <div className="flex min-w-0 items-center gap-2">
                            <span className="truncate text-sm font-medium">{sub.name}</span>
                            <Badge variant="secondary">{sub.slug}</Badge>
                            {!sub.isActive ? <Badge variant="outline">inativa</Badge> : null}
                          </div>
                          {isAdmin ? (
                            <div className="flex items-center gap-2">
                              <Switch
                                aria-label={`Ativar ${sub.name}`}
                                checked={sub.isActive}
                                onCheckedChange={(checked) =>
                                  toggleActive.mutate({
                                    id: sub.id,
                                    isActive: checked,
                                    kind: "subcategory",
                                  })
                                }
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label={`Remover ${sub.name}`}
                                onClick={() => remove.mutate({ id: sub.id, kind: "subcategory" })}
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </div>
                          ) : null}
                        </div>
                      ))
                    )}
                  </CardContent>
                ) : null}
              </Card>
            );
          })}
        </div>
      )}

      <CreateDialog
        open={dialog !== null}
        isSubcategory={Boolean(dialog?.categoryId)}
        pending={create.isPending}
        onClose={() => setDialog(null)}
        onSubmit={(values) => create.mutate({ ...values, categoryId: dialog?.categoryId ?? null })}
      />
    </AppShell>
  );
}

function CreateDialog({
  open,
  isSubcategory,
  pending,
  onClose,
  onSubmit,
}: {
  open: boolean;
  isSubcategory: boolean;
  pending: boolean;
  onClose: () => void;
  onSubmit: (values: { name: string; slug: string }) => void;
}) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");

  function close() {
    setName("");
    setSlug("");
    onClose();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) close();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isSubcategory ? "Nova subcategoria" : "Nova categoria"}</DialogTitle>
          <DialogDescription>
            O identificador é normalizado automaticamente (maiúsculas, sem acentos).
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="grid gap-2">
            <Label htmlFor="category-name">Nome</Label>
            <Input
              id="category-name"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setSlug(normalizeSlug(event.target.value));
              }}
              placeholder="Ex.: Pet shop"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="category-slug">Identificador</Label>
            <Input
              id="category-slug"
              value={slug}
              onChange={(event) => setSlug(normalizeSlug(event.target.value))}
              placeholder="PET_SHOP"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={close} disabled={pending}>
            Cancelar
          </Button>
          <Button
            onClick={() => onSubmit({ name: name.trim(), slug })}
            disabled={pending || name.trim().length < 2 || slug.length < 2}
          >
            Criar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
