-- ============================================================
-- Migration: Helpdesk Module - Part 2: Tables and Data Migration
-- Runs after 0003 so new enum values are committed and usable
-- ============================================================

-- 1. Create new enum types
DO $$ BEGIN
  CREATE TYPE "public"."status_chamado" AS ENUM('aberto', 'em_progresso', 'fechado', 'cancelado');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."prioridade_chamado" AS ENUM('baixa', 'media', 'alta', 'urgente');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."tipo_notificacao" AS ENUM('atribuicao', 'comentario', 'status_alterado', 'acompanhamento', 'mencao');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint

-- 3. Create app_settings table (may already exist)
CREATE TABLE IF NOT EXISTS "app_settings" (
	"chave" text PRIMARY KEY NOT NULL,
	"valor" text NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

INSERT INTO "app_settings" ("chave", "valor") VALUES
  ('app_name', 'Nuxx Dashboard'),
  ('app_logo', ''),
  ('auth_hero_image', '')
ON CONFLICT ("chave") DO NOTHING;
--> statement-breakpoint

-- 4. Create setores table
CREATE TABLE IF NOT EXISTS "setores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"descricao" text,
	"gestor_id" uuid,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- 5. Create chamados table
CREATE TABLE IF NOT EXISTS "chamados" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"titulo" text NOT NULL,
	"descricao" text NOT NULL,
	"status" "status_chamado" DEFAULT 'aberto' NOT NULL,
	"prioridade" "prioridade_chamado" DEFAULT 'media' NOT NULL,
	"setor_id" uuid NOT NULL,
	"criador_id" uuid NOT NULL,
	"atribuido_a" uuid,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"fechado_em" timestamp with time zone
);
--> statement-breakpoint

-- 6. Create chamado_acompanhadores table
CREATE TABLE IF NOT EXISTS "chamado_acompanhadores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chamado_id" uuid NOT NULL,
	"usuario_id" uuid NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chamado_acompanhadores_chamado_id_usuario_id_unique" UNIQUE("chamado_id","usuario_id")
);
--> statement-breakpoint

-- 7. Create chamado_comentarios table
CREATE TABLE IF NOT EXISTS "chamado_comentarios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chamado_id" uuid NOT NULL,
	"autor_id" uuid NOT NULL,
	"conteudo" text NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- 8. Create chamado_anexos table
CREATE TABLE IF NOT EXISTS "chamado_anexos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chamado_id" uuid NOT NULL,
	"comentario_id" uuid,
	"url" text NOT NULL,
	"nome_arquivo" text NOT NULL,
	"tipo" text NOT NULL,
	"tamanho" integer NOT NULL,
	"enviado_por" uuid NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- 9. Create notificacoes table
CREATE TABLE IF NOT EXISTS "notificacoes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"tipo" "tipo_notificacao" NOT NULL,
	"mensagem" text NOT NULL,
	"lida" boolean DEFAULT false NOT NULL,
	"chamado_id" uuid,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- 10. Foreign key constraints
DO $$ BEGIN
  ALTER TABLE "setores" ADD CONSTRAINT "setores_gestor_id_usuarios_id_fk"
    FOREIGN KEY ("gestor_id") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "chamados" ADD CONSTRAINT "chamados_setor_id_setores_id_fk"
    FOREIGN KEY ("setor_id") REFERENCES "public"."setores"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "chamados" ADD CONSTRAINT "chamados_criador_id_usuarios_id_fk"
    FOREIGN KEY ("criador_id") REFERENCES "public"."usuarios"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "chamados" ADD CONSTRAINT "chamados_atribuido_a_usuarios_id_fk"
    FOREIGN KEY ("atribuido_a") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "chamado_acompanhadores" ADD CONSTRAINT "chamado_acompanhadores_chamado_id_chamados_id_fk"
    FOREIGN KEY ("chamado_id") REFERENCES "public"."chamados"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "chamado_acompanhadores" ADD CONSTRAINT "chamado_acompanhadores_usuario_id_usuarios_id_fk"
    FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "chamado_comentarios" ADD CONSTRAINT "chamado_comentarios_chamado_id_chamados_id_fk"
    FOREIGN KEY ("chamado_id") REFERENCES "public"."chamados"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "chamado_comentarios" ADD CONSTRAINT "chamado_comentarios_autor_id_usuarios_id_fk"
    FOREIGN KEY ("autor_id") REFERENCES "public"."usuarios"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "chamado_anexos" ADD CONSTRAINT "chamado_anexos_chamado_id_chamados_id_fk"
    FOREIGN KEY ("chamado_id") REFERENCES "public"."chamados"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "chamado_anexos" ADD CONSTRAINT "chamado_anexos_comentario_id_chamado_comentarios_id_fk"
    FOREIGN KEY ("comentario_id") REFERENCES "public"."chamado_comentarios"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "chamado_anexos" ADD CONSTRAINT "chamado_anexos_enviado_por_usuarios_id_fk"
    FOREIGN KEY ("enviado_por") REFERENCES "public"."usuarios"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "notificacoes" ADD CONSTRAINT "notificacoes_usuario_id_usuarios_id_fk"
    FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "notificacoes" ADD CONSTRAINT "notificacoes_chamado_id_chamados_id_fk"
    FOREIGN KEY ("chamado_id") REFERENCES "public"."chamados"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
