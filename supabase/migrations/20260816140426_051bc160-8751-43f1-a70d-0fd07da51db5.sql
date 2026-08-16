DROP INDEX IF EXISTS public.prospection_results_unique_place;
CREATE UNIQUE INDEX IF NOT EXISTS prospection_results_unique_place
  ON public.prospection_results (prospection_id, google_place_id);