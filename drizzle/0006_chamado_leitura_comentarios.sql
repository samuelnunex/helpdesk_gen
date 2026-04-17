CREATE TABLE IF NOT EXISTS "chamado_leitura_comentarios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chamado_id" uuid NOT NULL,
	"usuario_id" uuid NOT NULL,
	"visto_ate" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chamado_leitura_comentarios" ADD CONSTRAINT "chamado_leitura_comentarios_chamado_id_chamados_id_fk" FOREIGN KEY ("chamado_id") REFERENCES "public"."chamados"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "chamado_leitura_comentarios" ADD CONSTRAINT "chamado_leitura_comentarios_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "chamado_leitura_comentarios_chamado_id_usuario_id_unique" ON "chamado_leitura_comentarios" ("chamado_id","usuario_id");
