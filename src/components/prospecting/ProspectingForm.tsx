import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Search } from "lucide-react";
import { useForm } from "react-hook-form";

import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ds";
import { startProspectionSchema, type ProspectionFormValues } from "@/lib/validation/prospecting";
import { PROSPECTION_LIMITS } from "@/types/prospecting";
import type { BusinessSubcategory, CategoryTreeNode } from "@/types/category";

export interface ProspectingFormProps {
  categories: CategoryTreeNode[];
  isRunning: boolean;
  onSubmit: (values: ProspectionFormValues) => void;
}

const RADIUS_OPTIONS = [1, 3, 5, 10, 20, 30, 50];
const LIMIT_OPTIONS = [20, 40, 60, 100, PROSPECTION_LIMITS.maxResults];

/** Presentation-only form: all provider access happens on the server. */
export function ProspectingForm({ categories, isRunning, onSubmit }: ProspectingFormProps) {
  const form = useForm<ProspectionFormValues>({
    resolver: zodResolver(startProspectionSchema) as never,
    defaultValues: {
      category: "",
      subcategory: "",
      city: "",
      state: "",
      neighborhood: "",
      radiusKm: 10,
      limit: 60,
    },
  });

  const selectedCategory = form.watch("category");
  const subcategories: BusinessSubcategory[] =
    categories.find((item) => item.name === selectedCategory)?.subcategories ?? [];
  const errors = form.formState.errors;

  return (
    <form
      className="grid gap-4 sm:grid-cols-2"
      onSubmit={form.handleSubmit((values) => onSubmit(values))}
    >
      <div className="space-y-2">
        <Label htmlFor="category">Categoria</Label>
        <Select
          value={selectedCategory ?? ""}
          onValueChange={(value) => {
            form.setValue("category", value, { shouldValidate: true });
            form.setValue("subcategory", "");
          }}
        >
          <SelectTrigger id="category">
            <SelectValue placeholder="Selecione a categoria" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.name}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.category && <p className="text-sm text-destructive">{errors.category.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="subcategory">Subcategoria (opcional)</Label>
        <Select
          value={form.watch("subcategory") ?? ""}
          onValueChange={(value) => form.setValue("subcategory", value)}
          disabled={subcategories.length === 0}
        >
          <SelectTrigger id="subcategory">
            <SelectValue
              placeholder={
                subcategories.length === 0 ? "Selecione uma categoria" : "Selecione a subcategoria"
              }
            />
          </SelectTrigger>
          <SelectContent>
            {subcategories.map((sub) => (
              <SelectItem key={sub.id} value={sub.name}>
                {sub.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="city">Cidade</Label>
        <Input id="city" placeholder="Fortaleza" {...form.register("city")} />
        {errors.city && <p className="text-sm text-destructive">{errors.city.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="state">Estado</Label>
        <Input id="state" placeholder="CE" {...form.register("state")} />
        {errors.state && <p className="text-sm text-destructive">{errors.state.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="neighborhood">Bairro (opcional)</Label>
        <Input id="neighborhood" placeholder="Aldeota" {...form.register("neighborhood")} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="radius">Raio</Label>
          <Select
            value={String(form.watch("radiusKm"))}
            onValueChange={(value) => form.setValue("radiusKm", Number(value))}
          >
            <SelectTrigger id="radius">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RADIUS_OPTIONS.map((option) => (
                <SelectItem key={option} value={String(option)}>
                  {option} km
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="limit">Quantidade</Label>
          <Select
            value={String(form.watch("limit"))}
            onValueChange={(value) => form.setValue("limit", Number(value))}
          >
            <SelectTrigger id="limit">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LIMIT_OPTIONS.map((option) => (
                <SelectItem key={option} value={String(option)}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="sm:col-span-2">
        <Button type="submit" disabled={isRunning} className="w-full sm:w-auto">
          {isRunning ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <Search className="mr-2 size-4" />
          )}
          {isRunning ? "Buscando empresas..." : "Iniciar prospecção"}
        </Button>
      </div>
    </form>
  );
}
