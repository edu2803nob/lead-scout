-- ============ ENUMS (novos, aditivos) ============
CREATE TYPE public.website_quality AS ENUM ('NO_WEBSITE','WEAK','AVERAGE','GOOD','EXCELLENT','UNKNOWN');
CREATE TYPE public.social_activity AS ENUM ('VERY_ACTIVE','ACTIVE','MODERATE','INACTIVE','UNKNOWN');
CREATE TYPE public.business_model AS ENUM ('PRODUCT','SERVICE','PRODUCT_AND_SERVICE','SUBSCRIPTION','APPOINTMENT','DELIVERY','QUOTE','ONLINE_SALE','LOCAL_SALE','LEAD_GENERATION');
CREATE TYPE public.opportunity_type AS ENUM ('NO_WEBSITE','WEAK_WEBSITE','CONVERSION','CATALOG','LEAD_GENERATION','APPOINTMENT','QUOTE','DIGITAL_PRESENCE');
CREATE TYPE public.lead_classification AS ENUM ('COLD','WARM','HOT','PRIORITY','UNKNOWN');
CREATE TYPE public.prospection_status AS ENUM ('PENDING','RUNNING','COMPLETED','FAILED','CANCELLED');
CREATE TYPE public.task_status AS ENUM ('OPEN','IN_PROGRESS','DONE','CANCELLED');
CREATE TYPE public.task_priority AS ENUM ('LOW','MEDIUM','HIGH','URGENT');
CREATE TYPE public.campaign_status AS ENUM ('DRAFT','ACTIVE','PAUSED','COMPLETED','ARCHIVED');
CREATE TYPE public.interaction_type AS ENUM ('NOTE','CALL','WHATSAPP','EMAIL','MEETING','INSTAGRAM','VISIT','OTHER');
CREATE TYPE public.social_network AS ENUM ('INSTAGRAM','FACEBOOK','LINKEDIN','TIKTOK','YOUTUBE','X','OTHER');

-- ============ LEAD: colunas aditivas ============
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS google_place_id text,
  ADD COLUMN IF NOT EXISTS google_rating numeric(2,1),
  ADD COLUMN IF NOT EXISTS google_review_count integer,
  ADD COLUMN IF NOT EXISTS website_quality public.website_quality NOT NULL DEFAULT 'UNKNOWN',
  ADD COLUMN IF NOT EXISTS instagram_url text,
  ADD COLUMN IF NOT EXISTS instagram_username text,
  ADD COLUMN IF NOT EXISTS instagram_followers integer,
  ADD COLUMN IF NOT EXISTS instagram_post_count integer,
  ADD COLUMN IF NOT EXISTS instagram_last_post_at timestamptz,
  ADD COLUMN IF NOT EXISTS has_whatsapp boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS business_model public.business_model,
  ADD COLUMN IF NOT EXISTS sales_model text,
  ADD COLUMN IF NOT EXISTS average_ticket_range text;

CREATE UNIQUE INDEX IF NOT EXISTS leads_user_google_place_unique
  ON public.leads (user_id, google_place_id) WHERE google_place_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS leads_user_status_idx ON public.leads (user_id, status);
CREATE INDEX IF NOT EXISTS leads_user_created_idx ON public.leads (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS leads_user_city_idx ON public.leads (user_id, city);

-- ============ CATÁLOGO DE CATEGORIAS ============
CREATE TABLE public.business_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.business_categories TO anon, authenticated;
GRANT ALL ON public.business_categories TO service_role;
ALTER TABLE public.business_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY business_categories_read ON public.business_categories FOR SELECT USING (true);

CREATE TABLE public.business_subcategories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.business_categories(id) ON DELETE CASCADE,
  slug text NOT NULL,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (category_id, slug)
);
GRANT SELECT ON public.business_subcategories TO anon, authenticated;
GRANT ALL ON public.business_subcategories TO service_role;
ALTER TABLE public.business_subcategories ENABLE ROW LEVEL SECURITY;
CREATE POLICY business_subcategories_read ON public.business_subcategories FOR SELECT USING (true);
CREATE INDEX business_subcategories_category_idx ON public.business_subcategories (category_id);

-- ============ LEAD_SOCIAL_PROFILE ============
CREATE TABLE public.lead_social_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  network public.social_network NOT NULL,
  profile_url text,
  username text,
  followers integer,
  post_count integer,
  last_post_at timestamptz,
  activity_level public.social_activity NOT NULL DEFAULT 'UNKNOWN',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (lead_id, network)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_social_profiles TO authenticated;
GRANT ALL ON public.lead_social_profiles TO service_role;
ALTER TABLE public.lead_social_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY lead_social_profiles_all ON public.lead_social_profiles FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX lead_social_profiles_lead_idx ON public.lead_social_profiles (lead_id);
CREATE TRIGGER lead_social_profiles_set_updated_at BEFORE UPDATE ON public.lead_social_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ LEAD_SCORE ============
CREATE TABLE public.lead_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  digital_presence_score integer NOT NULL DEFAULT 0,
  audience_score integer NOT NULL DEFAULT 0,
  reputation_score integer NOT NULL DEFAULT 0,
  commercial_potential_score integer NOT NULL DEFAULT 0,
  conversion_opportunity_score integer NOT NULL DEFAULT 0,
  total_score integer NOT NULL DEFAULT 0,
  classification public.lead_classification NOT NULL DEFAULT 'UNKNOWN',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (lead_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_scores TO authenticated;
GRANT ALL ON public.lead_scores TO service_role;
ALTER TABLE public.lead_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY lead_scores_all ON public.lead_scores FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX lead_scores_user_total_idx ON public.lead_scores (user_id, total_score DESC);
CREATE TRIGGER lead_scores_set_updated_at BEFORE UPDATE ON public.lead_scores
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ OPPORTUNITY ============
CREATE TABLE public.opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  type public.opportunity_type NOT NULL,
  score integer NOT NULL DEFAULT 0,
  reason text,
  evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
  recommended_solution text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (lead_id, type)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.opportunities TO authenticated;
GRANT ALL ON public.opportunities TO service_role;
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;
CREATE POLICY opportunities_all ON public.opportunities FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX opportunities_lead_idx ON public.opportunities (lead_id);
CREATE INDEX opportunities_user_score_idx ON public.opportunities (user_id, score DESC);
CREATE TRIGGER opportunities_set_updated_at BEFORE UPDATE ON public.opportunities
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ LEAD_AI_ANALYSIS ============
CREATE TABLE public.lead_ai_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  model text NOT NULL,
  provider text NOT NULL,
  summary text,
  purchase_potential integer,
  confidence numeric(4,3),
  pain_points jsonb NOT NULL DEFAULT '[]'::jsonb,
  opportunities jsonb NOT NULL DEFAULT '[]'::jsonb,
  reasoning text,
  recommended_offer text,
  recommended_approach text,
  suggested_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_ai_analyses TO authenticated;
GRANT ALL ON public.lead_ai_analyses TO service_role;
ALTER TABLE public.lead_ai_analyses ENABLE ROW LEVEL SECURITY;
CREATE POLICY lead_ai_analyses_all ON public.lead_ai_analyses FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX lead_ai_analyses_lead_created_idx ON public.lead_ai_analyses (lead_id, created_at DESC);
CREATE TRIGGER lead_ai_analyses_set_updated_at BEFORE UPDATE ON public.lead_ai_analyses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ DIGITAL_AUDIT ============
CREATE TABLE public.digital_audits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  digital_presence_score integer NOT NULL DEFAULT 0,
  conversion_opportunity integer NOT NULL DEFAULT 0,
  landing_page_opportunity integer NOT NULL DEFAULT 0,
  audit_summary text,
  conversion_problems jsonb NOT NULL DEFAULT '[]'::jsonb,
  recommended_sections jsonb NOT NULL DEFAULT '[]'::jsonb,
  evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.digital_audits TO authenticated;
GRANT ALL ON public.digital_audits TO service_role;
ALTER TABLE public.digital_audits ENABLE ROW LEVEL SECURITY;
CREATE POLICY digital_audits_all ON public.digital_audits FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX digital_audits_lead_created_idx ON public.digital_audits (lead_id, created_at DESC);
CREATE TRIGGER digital_audits_set_updated_at BEFORE UPDATE ON public.digital_audits
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ MESSAGE_TEMPLATE / CAMPAIGN ============
CREATE TABLE public.message_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  channel public.interaction_type NOT NULL DEFAULT 'WHATSAPP',
  subject text,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.message_templates TO authenticated;
GRANT ALL ON public.message_templates TO service_role;
ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY message_templates_all ON public.message_templates FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER message_templates_set_updated_at BEFORE UPDATE ON public.message_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  status public.campaign_status NOT NULL DEFAULT 'DRAFT',
  channel public.interaction_type NOT NULL DEFAULT 'WHATSAPP',
  template_id uuid REFERENCES public.message_templates(id) ON DELETE SET NULL,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaigns TO authenticated;
GRANT ALL ON public.campaigns TO service_role;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY campaigns_all ON public.campaigns FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX campaigns_user_status_idx ON public.campaigns (user_id, status);
CREATE TRIGGER campaigns_set_updated_at BEFORE UPDATE ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ LEAD_INTERACTION ============
CREATE TABLE public.lead_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  campaign_id uuid REFERENCES public.campaigns(id) ON DELETE SET NULL,
  type public.interaction_type NOT NULL DEFAULT 'NOTE',
  subject text,
  content text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_interactions TO authenticated;
GRANT ALL ON public.lead_interactions TO service_role;
ALTER TABLE public.lead_interactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY lead_interactions_all ON public.lead_interactions FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX lead_interactions_lead_occurred_idx ON public.lead_interactions (lead_id, occurred_at DESC);
CREATE TRIGGER lead_interactions_set_updated_at BEFORE UPDATE ON public.lead_interactions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ TASK ============
CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  due_at timestamptz,
  priority public.task_priority NOT NULL DEFAULT 'MEDIUM',
  status public.task_status NOT NULL DEFAULT 'OPEN',
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated;
GRANT ALL ON public.tasks TO service_role;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY tasks_all ON public.tasks FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX tasks_user_status_due_idx ON public.tasks (user_id, status, due_at);
CREATE INDEX tasks_lead_idx ON public.tasks (lead_id);
CREATE TRIGGER tasks_set_updated_at BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ PROSPECTION / PROSPECTION_RESULT ============
CREATE TABLE public.prospections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text,
  subcategory text,
  city text,
  state text,
  radius integer,
  requested_limit integer NOT NULL DEFAULT 20,
  status public.prospection_status NOT NULL DEFAULT 'PENDING',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.prospections TO authenticated;
GRANT ALL ON public.prospections TO service_role;
ALTER TABLE public.prospections ENABLE ROW LEVEL SECURITY;
CREATE POLICY prospections_all ON public.prospections FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX prospections_user_created_idx ON public.prospections (user_id, created_at DESC);
CREATE TRIGGER prospections_set_updated_at BEFORE UPDATE ON public.prospections
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.prospection_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prospection_id uuid NOT NULL REFERENCES public.prospections(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  google_place_id text,
  raw_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  imported boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.prospection_results TO authenticated;
GRANT ALL ON public.prospection_results TO service_role;
ALTER TABLE public.prospection_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY prospection_results_all ON public.prospection_results FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE UNIQUE INDEX prospection_results_place_unique
  ON public.prospection_results (prospection_id, google_place_id) WHERE google_place_id IS NOT NULL;
CREATE INDEX prospection_results_prospection_idx ON public.prospection_results (prospection_id);
CREATE TRIGGER prospection_results_set_updated_at BEFORE UPDATE ON public.prospection_results
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();