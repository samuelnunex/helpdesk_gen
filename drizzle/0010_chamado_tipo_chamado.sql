DO $$ BEGIN
  CREATE TYPE "tipo_chamado" AS ENUM (
    'requisicao',
    'incidente',
    'mudanca',
    'solicitacao_informacao'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "chamados" ADD COLUMN IF NOT EXISTS "tipo_chamado" "tipo_chamado" NOT NULL DEFAULT 'requisicao';
