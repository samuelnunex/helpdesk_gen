-- Enums para tipo e status da conta
DO $$ BEGIN
  CREATE TYPE tipo_conta AS ENUM ('admin', 'gestor', 'usuario');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  CREATE TYPE status_conta AS ENUM ('ativo', 'inativo', 'verificado', 'pendente');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Novas colunas em usuarios (se a tabela já existir com estrutura antiga)
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS username text UNIQUE;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS bio text;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS tipo_conta tipo_conta DEFAULT 'usuario' NOT NULL;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS status_conta status_conta DEFAULT 'ativo' NOT NULL;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS notif_email boolean DEFAULT true NOT NULL;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS notif_push boolean DEFAULT false NOT NULL;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS notif_sms boolean DEFAULT false NOT NULL;

-- Tabela histórico de login
CREATE TABLE IF NOT EXISTS historico_login (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  usuario_id uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  ip text,
  user_agent text,
  criado_em timestamp with time zone DEFAULT now() NOT NULL
);

-- Tabela sessões ativas
CREATE TABLE IF NOT EXISTS sessoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  usuario_id uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  user_agent text,
  criado_em timestamp with time zone DEFAULT now() NOT NULL,
  expira_em timestamp with time zone NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_historico_login_usuario ON historico_login(usuario_id);
CREATE INDEX IF NOT EXISTS idx_sessoes_usuario ON sessoes(usuario_id);
