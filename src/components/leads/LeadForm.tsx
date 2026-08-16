import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { leadInputSchema, type LeadFormValues, type LeadInput } from "@/lib/validation/lead";
import { LEAD_STATUSES, LEAD_STATUS_LABELS, type LeadStatus } from "@/types/lead";

export const emptyLeadForm: LeadFormValues = {
  companyName: "",
  businessCategory: "",
  businessSubcategory: "",
  description: "",
  phone: "",
  email: "",
  address: "",
  city: "",
  state: "",
  country: "Brasil",
  latitude: "",
  longitude: "",
  websiteUrl: "",
  hasWebsite: false,
  status: "NEW",
  source: "MANUAL",
};

interface LeadFormProps {
  initialValues?: LeadFormValues;
  submitLabel: string;
  pending?: boolean;
  onSubmit: (data: LeadInput) => void;
  onCancel?: () => void;
}

export function LeadForm({
  initialValues = emptyLeadForm,
  submitLabel,
  pending = false,
  onSubmit,
  onCancel,
}: LeadFormProps) {
  const [values, setValues] = useState<LeadFormValues>(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function setField<K extends keyof LeadFormValues>(key: K, value: LeadFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const result = leadInputSchema.safeParse(values);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const path = issue.path.join(".");
        if (!fieldErrors[path]) fieldErrors[path] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    onSubmit(result.data);
  }

  const text = (
    key: keyof LeadFormValues,
    label: string,
    props: React.InputHTMLAttributes<HTMLInputElement> = {},
  ) => (
    <div className="space-y-2">
      <Label htmlFor={String(key)}>{label}</Label>
      <Input
        id={String(key)}
        value={(values[key] as string | number | undefined) ?? ""}
        onChange={(event) => setField(key, event.target.value as LeadFormValues[typeof key])}
        {...props}
      />
      {errors[key] ? <p className="text-xs text-destructive">{errors[key]}</p> : null}
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <section className="grid gap-5 md:grid-cols-2">
        <div className="md:col-span-2">{text("companyName", "Nome da empresa *")}</div>
        {text("businessCategory", "Categoria")}
        {text("businessSubcategory", "Subcategoria")}
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="description">Descrição</Label>
          <Textarea
            id="description"
            rows={4}
            value={values.description ?? ""}
            onChange={(event) => setField("description", event.target.value)}
          />
          {errors["description"] ? (
            <p className="text-xs text-destructive">{errors["description"]}</p>
          ) : null}
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-2">
        {text("phone", "Telefone", { inputMode: "tel" })}
        {text("email", "E-mail", { type: "email" })}
        {text("websiteUrl", "Website", { placeholder: "https://..." })}
        <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
          <div>
            <Label htmlFor="hasWebsite">Possui site</Label>
            <p className="text-xs text-muted-foreground">Empresas sem site são prioridade.</p>
          </div>
          <Switch
            id="hasWebsite"
            checked={Boolean(values.hasWebsite)}
            onCheckedChange={(checked) => setField("hasWebsite", checked)}
          />
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-2">
        <div className="md:col-span-2">{text("address", "Endereço")}</div>
        {text("city", "Cidade")}
        {text("state", "Estado")}
        {text("country", "País")}
        <div className="grid grid-cols-2 gap-4">
          {text("latitude", "Latitude", { inputMode: "decimal" })}
          {text("longitude", "Longitude", { inputMode: "decimal" })}
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select
            value={(values.status as LeadStatus) ?? "NEW"}
            onValueChange={(value) => setField("status", value as LeadStatus)}
          >
            <SelectTrigger id="status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LEAD_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {LEAD_STATUS_LABELS[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {text("source", "Origem")}
      </section>

      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando..." : submitLabel}
        </Button>
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel} disabled={pending}>
            Cancelar
          </Button>
        ) : null}
      </div>
    </form>
  );
}
