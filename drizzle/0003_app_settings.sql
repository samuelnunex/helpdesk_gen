CREATE TABLE IF NOT EXISTS app_settings (
  chave text PRIMARY KEY NOT NULL,
  valor text NOT NULL,
  atualizado_em timestamp with time zone DEFAULT now() NOT NULL
);

-- Valores iniciais (podem ser sobrescritos pela página de configurações)
INSERT INTO app_settings (chave, valor) VALUES
  ('auth_hero_image', 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&q=80'),
  ('theme_default', 'light'),
  ('app_name', 'Studio Admin'),
  ('logo_sidebar_url', ''),
  ('logo_auth_url', '')
ON CONFLICT (chave) DO NOTHING;
