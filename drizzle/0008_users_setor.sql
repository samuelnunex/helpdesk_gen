ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "setor_id" uuid;
--> statement-breakpoint
INSERT INTO "setores" ("id", "nome", "descricao", "gestor_id", "criado_em", "atualizado_em")
SELECT gen_random_uuid(), 'Geral', 'Setor padrão', NULL, now(), now()
WHERE NOT EXISTS (SELECT 1 FROM "setores");
--> statement-breakpoint
UPDATE "usuarios"
SET "setor_id" = (SELECT "id" FROM "setores" ORDER BY "criado_em" ASC LIMIT 1)
WHERE "setor_id" IS NULL;
--> statement-breakpoint
ALTER TABLE "usuarios" ALTER COLUMN "setor_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_setor_id_setores_id_fk" FOREIGN KEY ("setor_id") REFERENCES "public"."setores"("id") ON DELETE restrict ON UPDATE no action;

