ALTER TABLE public.prospections
  ADD COLUMN IF NOT EXISTS neighborhood text,
  ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'GOOGLE_PLACES',
  ADD COLUMN IF NOT EXISTS found_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS imported_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS error_message text,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;

ALTER TABLE public.prospection_results
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS website_url text,
  ADD COLUMN IF NOT EXISTS rating numeric(2,1),
  ADD COLUMN IF NOT EXISTS review_count integer,
  ADD COLUMN IF NOT EXISTS provider_category text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS neighborhood text,
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision;

CREATE UNIQUE INDEX IF NOT EXISTS prospection_results_unique_place
  ON public.prospection_results (prospection_id, google_place_id)
  WHERE google_place_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS prospections_user_created_idx
  ON public.prospections (user_id, created_at DESC);