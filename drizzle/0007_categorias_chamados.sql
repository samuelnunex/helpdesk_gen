-- Categorias de chamado, vínculo usuário↔categoria, coluna em chamados e responsável obrigatório

CREATE TABLE IF NOT EXISTS "categorias" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL UNIQUE,
	"ativo" boolean DEFAULT true NOT NULL,
	"responsavel_padrao_id" uuid,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "categorias" ADD CONSTRAINT "categorias_responsavel_padrao_id_usuarios_id_fk"
    FOREIGN KEY ("responsavel_padrao_id") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "usuario_categorias" (
	"usuario_id" uuid NOT NULL,
	"categoria_id" uuid NOT NULL,
	CONSTRAINT "usuario_categorias_usuario_id_categoria_id_pk" PRIMARY KEY("usuario_id","categoria_id")
);
--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "usuario_categorias" ADD CONSTRAINT "usuario_categorias_usuario_id_usuarios_id_fk"
    FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "usuario_categorias" ADD CONSTRAINT "usuario_categorias_categoria_id_categorias_id_fk"
    FOREIGN KEY ("categoria_id") REFERENCES "public"."categorias"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint

ALTER TABLE "chamados" ADD COLUMN IF NOT EXISTS "categoria_id" uuid;
--> statement-breakpoint

INSERT INTO "categorias" ("nome", "ativo")
SELECT 'Geral', true
WHERE NOT EXISTS (SELECT 1 FROM "categorias" WHERE "nome" = 'Geral');
--> statement-breakpoint

UPDATE "chamados" SET "categoria_id" = (SELECT "id" FROM "categorias" WHERE "nome" = 'Geral' LIMIT 1) WHERE "categoria_id" IS NULL;
--> statement-breakpoint

UPDATE "chamados" SET "atribuido_a" = "criador_id" WHERE "atribuido_a" IS NULL;
--> statement-breakpoint

UPDATE "categorias" c
SET "responsavel_padrao_id" = sub."id"
FROM (
  SELECT u."id"
  FROM "usuarios" u
  WHERE u."status_conta" = 'ativo'
    AND u."tipo_conta" IN ('ti', 'admin', 'desenvolvedor')
  ORDER BY u."criado_em"
  LIMIT 1
) sub
WHERE c."nome" = 'Geral' AND c."responsavel_padrao_id" IS NULL;
--> statement-breakpoint

UPDATE "categorias" c
SET "responsavel_padrao_id" = sub."id"
FROM (
  SELECT u."id"
  FROM "usuarios" u
  WHERE u."status_conta" = 'ativo'
  ORDER BY u."criado_em"
  LIMIT 1
) sub
WHERE c."nome" = 'Geral' AND c."responsavel_padrao_id" IS NULL;
--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "chamados" ADD CONSTRAINT "chamados_categoria_id_categorias_id_fk"
    FOREIGN KEY ("categoria_id") REFERENCES "public"."categorias"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint

ALTER TABLE "chamados" ALTER COLUMN "categoria_id" SET NOT NULL;
--> statement-breakpoint

ALTER TABLE "chamados" ALTER COLUMN "atribuido_a" SET NOT NULL;
--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "chamados" DROP CONSTRAINT "chamados_atribuido_a_usuarios_id_fk";
EXCEPTION WHEN undefined_object THEN NULL;
END $$;
--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "chamados" ADD CONSTRAINT "chamados_atribuido_a_usuarios_id_fk"
    FOREIGN KEY ("atribuido_a") REFERENCES "public"."usuarios"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
