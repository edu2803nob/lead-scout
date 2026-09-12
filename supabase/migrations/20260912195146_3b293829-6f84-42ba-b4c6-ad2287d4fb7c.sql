CREATE TABLE public.lead_offers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  offer_type TEXT NOT NULL,
  secondary_offer_type TEXT,
  offer_title TEXT NOT NULL,
  main_objective TEXT NOT NULL,
  recommended_sections JSONB NOT NULL DEFAULT '[]'::jsonb,
  conversion_strategy TEXT NOT NULL,
  primary_cta TEXT NOT NULL,
  secondary_cta TEXT,
  value_proposition TEXT NOT NULL,
  linked_problems JSONB NOT NULL DEFAULT '[]'::jsonb,
  business_profile TEXT,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_offers TO authenticated;
GRANT ALL ON public.lead_offers TO service_role;

ALTER TABLE public.lead_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own lead offers"
ON public.lead_offers FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE INDEX lead_offers_lead_created_idx ON public.lead_offers (user_id, lead_id, created_at DESC);

CREATE TRIGGER update_lead_offers_updated_at
BEFORE UPDATE ON public.lead_offers
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();