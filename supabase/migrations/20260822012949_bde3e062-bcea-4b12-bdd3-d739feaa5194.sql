ALTER TABLE public.lead_ai_analyses
  ADD COLUMN IF NOT EXISTS reasoning_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS business_profile text;