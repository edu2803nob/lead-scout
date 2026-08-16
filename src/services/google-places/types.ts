/** Minimal shape of the Places API (New) payloads we consume. */

export interface GoogleAddressComponent {
  longText?: string | null;
  shortText?: string | null;
  types?: string[];
}

export interface GooglePlace {
  id?: string | null;
  displayName?: { text?: string | null } | null;
  formattedAddress?: string | null;
  nationalPhoneNumber?: string | null;
  internationalPhoneNumber?: string | null;
  websiteUri?: string | null;
  rating?: number | null;
  userRatingCount?: number | null;
  primaryTypeDisplayName?: { text?: string | null } | null;
  location?: { latitude?: number | null; longitude?: number | null } | null;
  addressComponents?: GoogleAddressComponent[] | null;
}

export interface GoogleSearchTextResponse {
  places?: GooglePlace[] | null;
  nextPageToken?: string | null;
}

export interface SearchPageParams {
  textQuery: string;
  pageSize: number;
  pageToken?: string | null;
  /** Optional bias circle (radius in metres). */
  bias?: { latitude: number; longitude: number; radiusMeters: number } | null;
}
