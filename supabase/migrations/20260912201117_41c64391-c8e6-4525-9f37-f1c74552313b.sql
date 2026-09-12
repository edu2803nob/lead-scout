CREATE TYPE public.outreach_style AS ENUM ('CONSULTIVE', 'DIRECT', 'OPPORTUNITY');

CREATE TABLE public.lead_outreach_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  batch_id UUID NOT NULL,
  style public.outreach_style NOT NULL,
  message TEXT NOT NULL,
  reason TEXT NOT NULL,
  is_edited BOOLEAN NOT NULL DEFAULT false,
  used_at TIMESTAMPTZ,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  business_profile TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (batch_id, style)
);

CREATE INDEX lead_outreach_messages_lead_idx
  ON public.lead_outreach_messages (user_id, lead_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_outreach_messages TO authenticated;
GRANT ALL ON public.lead_outreach_messages TO service_role;

ALTER TABLE public.lead_outreach_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own outreach messages"
  ON public.lead_outreach_messages FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own outreach messages"
  ON public.lead_outreach_messages FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own outreach messages"
  ON public.lead_outreach_messages FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own outreach messages"
  ON public.lead_outreach_messages FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE TRIGGER lead_outreach_messages_set_updated_at BEFORE UPDATE ON public.lead_outreach_messages
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();