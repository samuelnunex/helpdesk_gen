CREATE TABLE IF NOT EXISTS "sla_politicas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"categoria_id" uuid NOT NULL,
	"prioridade" "prioridade_chamado" NOT NULL,
	"meta_resposta_minutos" integer NOT NULL,
	"meta_resolucao_minutos" integer NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sla_politicas_categoria_id_prioridade_unique" UNIQUE("categoria_id","prioridade")
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "sla_politicas" ADD CONSTRAINT "sla_politicas_categoria_id_categorias_id_fk"
    FOREIGN KEY ("categoria_id") REFERENCES "public"."categorias"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
ALTER TABLE "chamados" ADD COLUMN IF NOT EXISTS "sla_meta_resposta_minutos" integer;
--> statement-breakpoint
ALTER TABLE "chamados" ADD COLUMN IF NOT EXISTS "sla_meta_resolucao_minutos" integer;
--> statement-breakpoint
ALTER TABLE "chamados" ADD COLUMN IF NOT EXISTS "sla_resposta_limite_em" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "chamados" ADD COLUMN IF NOT EXISTS "sla_resolucao_limite_em" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "chamados" ADD COLUMN IF NOT EXISTS "sla_primeira_resposta_em" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "chamados" ADD COLUMN IF NOT EXISTS "sla_resolucao_em" timestamp with time zone;
