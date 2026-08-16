import { Globe, Loader2, RefreshCw, Sparkles, Star } from "lucide-react";

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Separator,
} from "@/components/ds";
import type { EnrichmentResult, SocialActivity, WebsiteQuality } from "@/types/enrichment";
import {
  SOCIAL_ACTIVITY_LABELS,
  SOCIAL_NETWORK_LABELS,
  WEBSITE_QUALITY_LABELS,
} from "@/types/enrichment";
import type { Lead } from "@/types/lead";

/**
 * Presentation only. Every indicator comes from the enrichment service; the
 * component never fetches or classifies anything itself.
 */

const QUALITY_CLASSES: Record<WebsiteQuality, string> = {
  EXCELLENT: "bg-score-very-high/15 text-score-very-high border-score-very-high/30",
  GOOD: "bg-score-high/15 text-score-high border-score-high/30",
  AVERAGE: "bg-score-medium/15 text-score-medium border-score-medium/30",
  WEAK: "bg-score-low/15 text-score-low border-score-low/30",
  NO_WEBSITE: "bg-muted text-muted-foreground border-border",
  UNKNOWN: "bg-muted text-muted-foreground border-border",
};

const ACTIVITY_CLASSES: Record<SocialActivity, string> = {
  VERY_ACTIVE: "bg-score-very-high/15 text-score-very-high border-score-very-high/30",
  ACTIVE: "bg-score-high/15 text-score-high border-score-high/30",
  MODERATE: "bg-score-medium/15 text-score-medium border-score-medium/30",
  INACTIVE: "bg-score-low/15 text-score-low border-score-low/30",
  UNKNOWN: "bg-muted text-muted-foreground border-border",
};

export interface LeadEnrichmentPanelProps {
  lead: Lead;
  result?: EnrichmentResult | undefined;
  pending: boolean;
  onEnrich: () => void;
}

export function LeadEnrichmentPanel({
  lead,
  result,
  pending,
  onEnrich,
}: LeadEnrichmentPanelProps) {
  const websiteQuality = result?.website.quality ?? lead.websiteQuality;
  const rating = result?.google.rating ?? lead.googleRating;
  const reviews = result?.google.reviewCount ?? lead.googleReviewCount;
  const categories = result?.google.categories ?? [];
  const social =
    result?.social ??
    (lead.instagramUrl || lead.instagramUsername
      ? [
          {
            network: "INSTAGRAM" as const,
            profileUrl: lead.instagramUrl,
            username: lead.instagramUsername,
            followers: lead.instagramFollowers,
            postCount: lead.instagramPostCount,
            lastPostAt: lead.instagramLastPostAt,
            activityLevel: "UNKNOWN" as SocialActivity,
          },
        ]
      : []);
  const whatsappAvailable = result?.whatsapp.available ?? (lead.hasWhatsapp ? true : null);

  return (
    <Card className="shadow-soft md:col-span-2">
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="size-4 text-brand" aria-hidden />
            Perfil comercial enriquecido
          </CardTitle>
          <CardDescription>
            Indicadores obtidos de fontes públicas permitidas. Sem dado disponível: “—” ou
            “Desconhecido”.
          </CardDescription>
        </div>
        <Button onClick={onEnrich} disabled={pending} variant="secondary">
          {pending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <RefreshCw className="size-4" aria-hidden />
          )}
          {pending ? "Enriquecendo..." : "Enriquecer"}
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Qualidade do site">
            <Badge variant="outline" className={QUALITY_CLASSES[websiteQuality]}>
              {WEBSITE_QUALITY_LABELS[websiteQuality]}
            </Badge>
          </Metric>

          <Metric label="Acessibilidade">
            <span className="text-sm">
              {result?.website.reachable === true
                ? `Online (${result.website.statusCode ?? "200"})`
                : result?.website.reachable === false
                  ? `Indisponível (${result.website.statusCode ?? "erro"})`
                  : "Não verificada"}
            </span>
          </Metric>

          <Metric label="Google">
            <span className="flex items-center gap-1 text-sm">
              <Star className="size-3.5 text-score-medium" aria-hidden />
              {rating !== null && rating !== undefined ? rating.toFixed(1) : "—"}
              <span className="text-muted-foreground">({reviews ?? 0})</span>
            </span>
          </Metric>

          <Metric label="WhatsApp">
            <span className="text-sm">
              {whatsappAvailable === true
                ? "Disponível"
                : whatsappAvailable === false
                  ? "Não disponível"
                  : "Desconhecido"}
            </span>
          </Metric>
        </div>

        {result?.website.url ? (
          <div className="flex items-start gap-2 rounded-lg border border-border bg-surface p-3">
            <Globe className="mt-0.5 size-4 text-muted-foreground" aria-hidden />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{result.website.title ?? result.website.url}</p>
              <p className="line-clamp-2 text-xs text-muted-foreground">
                {result.website.description ?? "Sem meta descrição publicada."}
              </p>
            </div>
          </div>
        ) : null}

        {categories.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <Badge key={category} variant="outline">
                {category}
              </Badge>
            ))}
          </div>
        ) : null}

        <Separator />

        <div className="space-y-2">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Redes sociais</p>
          {social.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum perfil identificado.</p>
          ) : (
            <ul className="space-y-2">
              {social.map((profile) => (
                <li
                  key={profile.network}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {SOCIAL_NETWORK_LABELS[profile.network]}
                      {profile.username ? (
                        <span className="text-muted-foreground"> · @{profile.username}</span>
                      ) : null}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {profile.followers ?? "—"} seguidores · {profile.postCount ?? "—"} posts ·
                      última atividade{" "}
                      {profile.lastPostAt
                        ? new Date(profile.lastPostAt).toLocaleDateString("pt-BR")
                        : "—"}
                    </p>
                  </div>
                  <Badge variant="outline" className={ACTIVITY_CLASSES[profile.activityLevel]}>
                    {SOCIAL_ACTIVITY_LABELS[profile.activityLevel]}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </div>

        {result?.providers.length ? (
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Fontes</p>
            {result.providers.map((provider) => (
              <p key={provider.provider} className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{provider.label}:</span>{" "}
                {provider.message}
              </p>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function Metric({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      {children}
    </div>
  );
}
