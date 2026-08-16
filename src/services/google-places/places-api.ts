import { AppError } from "@/lib/errors";
import { redactSecrets } from "@/lib/security/redact";
import { PROSPECTION_LIMITS } from "@/types/prospecting";

import type { GoogleSearchTextResponse, SearchPageParams } from "./types";

/**
 * Isolated Google Places access layer.
 *
 * - Never imported by React components: only prospecting services use it.
 * - Credentials are read from the server environment at call time and are
 *   never logged, returned or exposed to the client.
 * - Requests go through the Lovable connector gateway (server side only).
 */

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_maps";

const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.nationalPhoneNumber",
  "places.internationalPhoneNumber",
  "places.websiteUri",
  "places.rating",
  "places.userRatingCount",
  "places.primaryTypeDisplayName",
  "places.location",
  "places.addressComponents",
  "nextPageToken",
].join(",");

export class PlacesApiError extends AppError {
  constructor(message: string, status = 502) {
    super(message, { code: "PLACES_API_ERROR", status });
    this.name = "PlacesApiError";
  }
}

function credentials(): { lovableApiKey: string; connectionKey: string } {
  const lovableApiKey = process.env["LOVABLE_API_KEY"];
  const connectionKey = process.env["GOOGLE_MAPS_API_KEY"];
  if (!lovableApiKey || !connectionKey) {
    throw new PlacesApiError(
      "Integração com o Google Places não está configurada. Conecte o Google Maps Platform.",
      503,
    );
  }
  return { lovableApiKey, connectionKey };
}

/** Logs provider failures without ever leaking credentials. */
function logFailure(scope: string, status: number, body: string): void {
  console.error(
    `[google-places] ${scope} failed [${status}]: ${redactSecrets(body).slice(0, 500)}`,
  );
}

async function gatewayFetch(
  path: string,
  init: { method: "GET" | "POST"; headers?: Record<string, string>; body?: string | undefined },
  scope: string,
): Promise<unknown> {
  const { lovableApiKey, connectionKey } = credentials();

  let response: Response;
  try {
    response = await fetch(`${GATEWAY_URL}${path}`, {
      method: init.method,
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "X-Connection-Api-Key": connectionKey,
        "Content-Type": "application/json",
        ...init.headers,
      },
      ...(init.body === undefined ? {} : { body: init.body }),
      signal: AbortSignal.timeout(PROSPECTION_LIMITS.requestTimeoutMs),
    });
  } catch (error) {
    const aborted = error instanceof Error && /timeout|abort/i.test(error.name + error.message);
    console.error(`[google-places] ${scope} network error: ${aborted ? "timeout" : "unreachable"}`);
    throw new PlacesApiError(
      aborted
        ? "A busca no Google Places excedeu o tempo limite. Tente novamente."
        : "Não foi possível contatar o Google Places agora. Tente novamente.",
      504,
    );
  }

  if (!response.ok) {
    const body = await response.text();
    logFailure(scope, response.status, body);
    if (response.status === 429) {
      throw new PlacesApiError("Limite de uso do Google Places atingido. Tente mais tarde.", 429);
    }
    if (response.status === 403) {
      throw new PlacesApiError(
        "Acesso ao Google Places foi negado. Verifique as restrições da chave de API.",
        403,
      );
    }
    throw new PlacesApiError("O Google Places retornou um erro ao processar a busca.");
  }

  try {
    return (await response.json()) as unknown;
  } catch {
    logFailure(scope, response.status, "invalid json");
    throw new PlacesApiError("Resposta inválida do Google Places.");
  }
}

/** Text search, one page at a time (provider pagination via `pageToken`). */
export async function searchTextPage(params: SearchPageParams): Promise<GoogleSearchTextResponse> {
  const body: Record<string, unknown> = {
    textQuery: params.textQuery,
    pageSize: Math.min(PROSPECTION_LIMITS.pageSize, Math.max(1, params.pageSize)),
    languageCode: "pt-BR",
    regionCode: "BR",
  };
  if (params.pageToken) body["pageToken"] = params.pageToken;
  if (params.bias) {
    body["locationBias"] = {
      circle: {
        center: { latitude: params.bias.latitude, longitude: params.bias.longitude },
        radius: Math.min(50_000, Math.max(1, params.bias.radiusMeters)),
      },
    };
  }

  const json = await gatewayFetch(
    "/places/v1/places:searchText",
    { method: "POST", headers: { "X-Goog-FieldMask": FIELD_MASK }, body: JSON.stringify(body) },
    "searchText",
  );

  return (json ?? {}) as GoogleSearchTextResponse;
}

/** Geocodes "neighborhood, city, state" so the radius can bias the search. */
export async function geocodeArea(query: string): Promise<{
  latitude: number;
  longitude: number;
} | null> {
  const json = (await gatewayFetch(
    `/maps/api/geocode/json?address=${encodeURIComponent(query.slice(0, 200))}&language=pt-BR&region=br`,
    { method: "GET" },
    "geocode",
  )) as {
    status?: string;
    results?: Array<{ geometry?: { location?: { lat?: number; lng?: number } } }>;
  };

  const location = json.results?.[0]?.geometry?.location;
  if (!location || typeof location.lat !== "number" || typeof location.lng !== "number") {
    return null;
  }
  return { latitude: location.lat, longitude: location.lng };
}
