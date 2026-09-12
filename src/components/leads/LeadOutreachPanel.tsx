import { Check, Copy, Loader2, MessageSquareQuote, Pencil, RefreshCw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Separator,
  Textarea,
} from "@/components/ds";
import { OUTREACH_LIMITS, OUTREACH_STYLE_LABELS, type OutreachStyle } from "@/config/outreach";
import type { StoredOutreachMessage } from "@/types/outreach";

/**
 * Presentation only. Messages are suggestions for human review: the panel never
 * sends anything — it copies, edits, regenerates and registers usage.
 */

export interface LeadOutreachPanelProps {
  messages?: StoredOutreachMessage[] | null | undefined;
  loading: boolean;
  pendingStyle: OutreachStyle | "ALL" | null;
  savingId: string | null;
  onGenerate: (style?: OutreachStyle) => void;
  onSave: (id: string, message: string) => void;
  onMarkUsed: (id: string) => void;
}

export function LeadOutreachPanel({
  messages,
  loading,
  pendingStyle,
  savingId,
  onGenerate,
  onSave,
  onMarkUsed,
}: LeadOutreachPanelProps) {
  const items = messages ?? [];
  const generating = pendingStyle === "ALL";

  return (
    <Card className="shadow-soft md:col-span-2">
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquareQuote className="size-4 text-brand" aria-hidden />
            Abordagem comercial
          </CardTitle>
          <CardDescription>
            Sugestões de mensagem para revisão humana. Nada é enviado pelo sistema — você copia e
            envia pelo canal que preferir.
          </CardDescription>
        </div>
        <Button variant="secondary" onClick={() => onGenerate()} disabled={generating || loading}>
          {generating ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
          {generating ? "Gerando abordagem..." : "Gerar abordagem"}
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando abordagens salvas...</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma abordagem gerada. As mensagens usam apenas os dados observados do lead e a
            auditoria/análise já existentes.
          </p>
        ) : (
          items.map((item, index) => (
            <div key={item.id} className="space-y-3">
              {index > 0 ? <Separator /> : null}
              <OutreachMessageCard
                item={item}
                pending={pendingStyle === item.style}
                saving={savingId === item.id}
                onRegenerate={() => onGenerate(item.style)}
                onSave={(message) => onSave(item.id, message)}
                onMarkUsed={() => onMarkUsed(item.id)}
              />
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function OutreachMessageCard({
  item,
  pending,
  saving,
  onRegenerate,
  onSave,
  onMarkUsed,
}: {
  item: StoredOutreachMessage;
  pending: boolean;
  saving: boolean;
  onRegenerate: () => void;
  onSave: (message: string) => void;
  onMarkUsed: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.message);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(item.message);
      toast.success("Mensagem copiada.");
    } catch {
      toast.error("Não foi possível copiar a mensagem.");
    }
  };

  return (
    <div className="space-y-3 rounded-lg border border-border/70 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge>{OUTREACH_STYLE_LABELS[item.style]}</Badge>
        {item.isEdited ? <Badge variant="outline">Editada</Badge> : null}
        {item.usedAt ? <Badge variant="secondary">Utilizada</Badge> : null}
      </div>

      {editing ? (
        <div className="space-y-2">
          <Textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={5}
            maxLength={OUTREACH_LIMITS.maxMessageChars}
            aria-label={`Editar abordagem ${OUTREACH_STYLE_LABELS[item.style]}`}
          />
          <p className="text-xs text-muted-foreground">
            {draft.trim().length}/{OUTREACH_LIMITS.maxMessageChars} caracteres
          </p>
        </div>
      ) : (
        <p className="whitespace-pre-line text-sm text-foreground">{item.message}</p>
      )}

      <p className="text-xs text-muted-foreground">
        <span className="font-medium">Por que esta abordagem: </span>
        {item.reason}
      </p>

      <div className="flex flex-wrap gap-2">
        {editing ? (
          <>
            <Button
              size="sm"
              onClick={() => {
                onSave(draft.trim());
                setEditing(false);
              }}
              disabled={saving || draft.trim().length < OUTREACH_LIMITS.minMessageChars}
            >
              {saving ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
              Salvar
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setDraft(item.message);
                setEditing(false);
              }}
            >
              Cancelar
            </Button>
          </>
        ) : (
          <>
            <Button size="sm" variant="outline" onClick={() => void copy()}>
              <Copy className="size-4" aria-hidden />
              Copiar
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setDraft(item.message);
                setEditing(true);
              }}
            >
              <Pencil className="size-4" aria-hidden />
              Editar
            </Button>
            <Button size="sm" variant="outline" onClick={onRegenerate} disabled={pending}>
              {pending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <RefreshCw className="size-4" aria-hidden />
              )}
              Regenerar
            </Button>
            <Button size="sm" variant="ghost" onClick={onMarkUsed} disabled={Boolean(item.usedAt)}>
              <Check className="size-4" aria-hidden />
              {item.usedAt ? "Registrada" : "Marcar como utilizada"}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
