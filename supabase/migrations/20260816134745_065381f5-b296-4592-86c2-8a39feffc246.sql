ALTER TABLE public.business_categories
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

ALTER TABLE public.business_subcategories
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

CREATE UNIQUE INDEX IF NOT EXISTS business_categories_slug_key
  ON public.business_categories (slug);
CREATE UNIQUE INDEX IF NOT EXISTS business_subcategories_category_slug_key
  ON public.business_subcategories (category_id, slug);

GRANT SELECT ON public.business_categories TO anon, authenticated;
GRANT SELECT ON public.business_subcategories TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.business_categories TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.business_subcategories TO authenticated;
GRANT ALL ON public.business_categories TO service_role;
GRANT ALL ON public.business_subcategories TO service_role;

DROP POLICY IF EXISTS business_categories_admin_write ON public.business_categories;
CREATE POLICY business_categories_admin_write ON public.business_categories
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS business_subcategories_admin_write ON public.business_subcategories;
CREATE POLICY business_subcategories_admin_write ON public.business_subcategories
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS set_business_categories_updated_at ON public.business_categories;
CREATE TRIGGER set_business_categories_updated_at
  BEFORE UPDATE ON public.business_categories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_business_subcategories_updated_at ON public.business_subcategories;
CREATE TRIGGER set_business_subcategories_updated_at
  BEFORE UPDATE ON public.business_subcategories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.business_categories (slug, name, sort_order) VALUES
  ('ALIMENTACAO', 'Alimentação', 10),
  ('SAUDE_E_BEM_ESTAR', 'Saúde e Bem-estar', 20),
  ('BELEZA', 'Beleza', 30),
  ('AUTOMOTIVO', 'Automotivo', 40),
  ('MOTOS', 'Motos', 50),
  ('CASA_E_DECORACAO', 'Casa e Decoração', 60),
  ('MODA', 'Moda', 70),
  ('TECNOLOGIA', 'Tecnologia', 80),
  ('IMOBILIARIO', 'Imobiliário', 90),
  ('SERVICOS', 'Serviços', 100),
  ('EDUCACAO', 'Educação', 110),
  ('TURISMO', 'Turismo', 120),
  ('ANIMAIS', 'Animais', 130),
  ('EVENTOS', 'Eventos', 140),
  ('OUTROS', 'Outros', 150)
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, sort_order = EXCLUDED.sort_order;

INSERT INTO public.business_subcategories (category_id, slug, name, sort_order)
SELECT c.id, s.slug, s.name, s.sort_order
FROM (VALUES
  ('ALIMENTACAO','ACAITERIA','Açaiteria',10),
  ('ALIMENTACAO','RESTAURANTE','Restaurante',20),
  ('ALIMENTACAO','PIZZARIA','Pizzaria',30),
  ('ALIMENTACAO','HAMBURGUERIA','Hamburgueria',40),
  ('ALIMENTACAO','LANCHONETE','Lanchonete',50),
  ('ALIMENTACAO','DOCERIA','Doceria',60),
  ('ALIMENTACAO','CONFEITARIA','Confeitaria',70),
  ('ALIMENTACAO','SALGADERIA','Salgaderia',80),
  ('ALIMENTACAO','CAFETERIA','Cafeteria',90),
  ('ALIMENTACAO','PADARIA','Padaria',100),
  ('ALIMENTACAO','DELIVERY','Delivery',110),
  ('SAUDE_E_BEM_ESTAR','ACADEMIA','Academia',10),
  ('SAUDE_E_BEM_ESTAR','CROSSFIT','CrossFit',20),
  ('SAUDE_E_BEM_ESTAR','PILATES','Pilates',30),
  ('SAUDE_E_BEM_ESTAR','YOGA','Yoga',40),
  ('SAUDE_E_BEM_ESTAR','FISIOTERAPIA','Fisioterapia',50),
  ('SAUDE_E_BEM_ESTAR','NUTRICAO','Nutrição',60),
  ('SAUDE_E_BEM_ESTAR','CLINICA','Clínica',70),
  ('SAUDE_E_BEM_ESTAR','ODONTOLOGIA','Odontologia',80),
  ('SAUDE_E_BEM_ESTAR','ESTETICA','Estética',90),
  ('BELEZA','BARBEARIA','Barbearia',10),
  ('BELEZA','SALAO','Salão',20),
  ('BELEZA','MANICURE','Manicure',30),
  ('BELEZA','NAIL_DESIGNER','Nail designer',40),
  ('BELEZA','CABELEIREIRO','Cabeleireiro',50),
  ('BELEZA','SOBRANCELHA','Sobrancelha',60),
  ('BELEZA','MAQUIAGEM','Maquiagem',70),
  ('AUTOMOTIVO','LOJA_DE_CARROS','Loja de carros',10),
  ('AUTOMOTIVO','SEMINOVOS','Seminovos',20),
  ('AUTOMOTIVO','CONCESSIONARIA','Concessionária',30),
  ('AUTOMOTIVO','OFICINA','Oficina',40),
  ('AUTOMOTIVO','AUTOPECAS','Autopeças',50),
  ('AUTOMOTIVO','PNEUS','Pneus',60),
  ('AUTOMOTIVO','ACESSORIOS','Acessórios',70),
  ('AUTOMOTIVO','LAVA_JATO','Lava-jato',80),
  ('AUTOMOTIVO','FUNILARIA','Funilaria',90),
  ('MOTOS','LOJA_DE_MOTOS','Loja de motos',10),
  ('MOTOS','CONCESSIONARIA_MOTOS','Concessionária',20),
  ('MOTOS','MOTOS_USADAS','Motos usadas',30),
  ('MOTOS','OFICINA_DE_MOTOS','Oficina de motos',40),
  ('MOTOS','PECAS_PARA_MOTOS','Peças para motos',50),
  ('MOTOS','ACESSORIOS_PARA_MOTOS','Acessórios para motos',60),
  ('CASA_E_DECORACAO','MOVEIS','Móveis',10),
  ('CASA_E_DECORACAO','MOVEIS_PLANEJADOS','Móveis planejados',20),
  ('CASA_E_DECORACAO','DECORACAO','Decoração',30),
  ('CASA_E_DECORACAO','COLCHOES','Colchões',40),
  ('CASA_E_DECORACAO','ELETRODOMESTICOS','Eletrodomésticos',50),
  ('CASA_E_DECORACAO','MATERIAL_DE_CONSTRUCAO','Material de construção',60),
  ('CASA_E_DECORACAO','PISOS','Pisos',70),
  ('CASA_E_DECORACAO','ILUMINACAO','Iluminação',80),
  ('CASA_E_DECORACAO','TINTAS','Tintas',90),
  ('CASA_E_DECORACAO','CORTINAS','Cortinas',100),
  ('CASA_E_DECORACAO','VIDRACARIA','Vidraçaria',110),
  ('CASA_E_DECORACAO','MARMORARIA','Marmoraria',120),
  ('MODA','LOJA_DE_ROUPAS','Loja de roupas',10),
  ('MODA','MODA_FEMININA','Moda feminina',20),
  ('MODA','MODA_MASCULINA','Moda masculina',30),
  ('MODA','MODA_INFANTIL','Moda infantil',40),
  ('MODA','CALCADOS','Calçados',50),
  ('MODA','BOLSAS','Bolsas',60),
  ('MODA','ACESSORIOS_MODA','Acessórios',70),
  ('MODA','JOIAS','Joias',80),
  ('MODA','SEMIJOIAS','Semijoias',90),
  ('MODA','MODA_FITNESS','Moda fitness',100),
  ('MODA','MODA_PRAIA','Moda praia',110),
  ('TECNOLOGIA','CELULARES','Celulares',10),
  ('TECNOLOGIA','INFORMATICA','Informática',20),
  ('TECNOLOGIA','COMPUTADORES','Computadores',30),
  ('TECNOLOGIA','GAMES','Games',40),
  ('TECNOLOGIA','ELETRONICOS','Eletrônicos',50),
  ('TECNOLOGIA','ASSISTENCIA_TECNICA','Assistência técnica',60),
  ('IMOBILIARIO','IMOBILIARIA','Imobiliária',10),
  ('IMOBILIARIO','CORRETOR','Corretor',20),
  ('IMOBILIARIO','CONSTRUTORA','Construtora',30),
  ('IMOBILIARIO','LOTEAMENTO','Loteamento',40),
  ('IMOBILIARIO','ALUGUEL_DE_IMOVEIS','Aluguel de imóveis',50),
  ('SERVICOS','CONTABILIDADE','Contabilidade',10),
  ('SERVICOS','ADVOCACIA','Advocacia',20),
  ('SERVICOS','FOTOGRAFIA','Fotografia',30),
  ('SERVICOS','MARKETING','Marketing',40),
  ('SERVICOS','LIMPEZA','Limpeza',50),
  ('SERVICOS','MANUTENCAO','Manutenção',60),
  ('SERVICOS','SEGURANCA','Segurança',70),
  ('SERVICOS','CLIMATIZACAO','Climatização',80)
) AS s(category_slug, slug, name, sort_order)
JOIN public.business_categories c ON c.slug = s.category_slug
ON CONFLICT (category_id, slug) DO UPDATE SET name = EXCLUDED.name, sort_order = EXCLUDED.sort_order;