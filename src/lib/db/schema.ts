import { boolean, integer, pgEnum, pgTable, primaryKey, serial, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

export const tipoContaEnum = pgEnum("tipo_conta", [
  "admin",
  "usuario_final",
  "gestor_setor",
  "diretor",
  "ti",
  "desenvolvedor",
]);
export const statusContaEnum = pgEnum("status_conta", ["ativo", "inativo", "verificado", "pendente"]);
export const statusChamadoEnum = pgEnum("status_chamado", ["aberto", "em_progresso", "fechado", "cancelado"]);
export const prioridadeChamadoEnum = pgEnum("prioridade_chamado", ["baixa", "media", "alta", "urgente"]);
export const tipoNotificacaoEnum = pgEnum("tipo_notificacao", [
  "atribuicao",
  "comentario",
  "status_alterado",
  "acompanhamento",
  "mencao",
]);

export const users = pgTable("usuarios", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("senha_hash").notNull(),
  name: text("nome"),
  username: text("username").unique(),
  bio: text("bio"),
  fotoPerfil: text("foto_perfil"),
  setorId: uuid("setor_id").notNull(),
  tipoConta: tipoContaEnum("tipo_conta").default("usuario_final").notNull(),
  status: statusContaEnum("status_conta").default("ativo").notNull(),
  notifEmail: boolean("notif_email").default(true).notNull(),
  notifPush: boolean("notif_push").default(false).notNull(),
  notifSms: boolean("notif_sms").default(false).notNull(),
  createdAt: timestamp("criado_em", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("atualizado_em", { withTimezone: true }).defaultNow().notNull(),
});

export const historicoLogin = pgTable("historico_login", {
  id: uuid("id").primaryKey().defaultRandom(),
  usuarioId: uuid("usuario_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  ip: text("ip"),
  userAgent: text("user_agent"),
  createdAt: timestamp("criado_em", { withTimezone: true }).defaultNow().notNull(),
});

export const sessoes = pgTable("sessoes", {
  id: uuid("id").primaryKey().defaultRandom(),
  usuarioId: uuid("usuario_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  userAgent: text("user_agent"),
  createdAt: timestamp("criado_em", { withTimezone: true }).defaultNow().notNull(),
  expiraEm: timestamp("expira_em", { withTimezone: true }).notNull(),
});

export const appSettings = pgTable("app_settings", {
  chave: text("chave").primaryKey(),
  valor: text("valor").notNull(),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).defaultNow().notNull(),
});

export const setores = pgTable("setores", {
  id: uuid("id").primaryKey().defaultRandom(),
  nome: text("nome").notNull(),
  descricao: text("descricao"),
  gestorId: uuid("gestor_id").references(() => users.id, { onDelete: "set null" }),
  criadoEm: timestamp("criado_em", { withTimezone: true }).defaultNow().notNull(),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).defaultNow().notNull(),
});

export const categorias = pgTable("categorias", {
  id: uuid("id").primaryKey().defaultRandom(),
  nome: text("nome").notNull().unique(),
  ativo: boolean("ativo").default(true).notNull(),
  responsavelPadraoId: uuid("responsavel_padrao_id").references(() => users.id, { onDelete: "set null" }),
  criadoEm: timestamp("criado_em", { withTimezone: true }).defaultNow().notNull(),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).defaultNow().notNull(),
});

export const usuarioCategorias = pgTable(
  "usuario_categorias",
  {
    usuarioId: uuid("usuario_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    categoriaId: uuid("categoria_id")
      .notNull()
      .references(() => categorias.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.usuarioId, t.categoriaId] })],
);

export const chamados = pgTable("chamados", {
  id: uuid("id").primaryKey().defaultRandom(),
  numero: serial("numero").notNull(),
  titulo: text("titulo").notNull(),
  descricao: text("descricao").notNull(),
  status: statusChamadoEnum("status").default("aberto").notNull(),
  prioridade: prioridadeChamadoEnum("prioridade").default("media").notNull(),
  setorId: uuid("setor_id")
    .notNull()
    .references(() => setores.id, { onDelete: "restrict" }),
  categoriaId: uuid("categoria_id")
    .notNull()
    .references(() => categorias.id, { onDelete: "restrict" }),
  criadorId: uuid("criador_id")
    .notNull()
    .references(() => users.id, { onDelete: "restrict" }),
  atribuidoA: uuid("atribuido_a")
    .notNull()
    .references(() => users.id, { onDelete: "restrict" }),
  criadoEm: timestamp("criado_em", { withTimezone: true }).defaultNow().notNull(),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).defaultNow().notNull(),
  fechadoEm: timestamp("fechado_em", { withTimezone: true }),
});

export const chamadoAcompanhadores = pgTable(
  "chamado_acompanhadores",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    chamadoId: uuid("chamado_id")
      .notNull()
      .references(() => chamados.id, { onDelete: "cascade" }),
    usuarioId: uuid("usuario_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    criadoEm: timestamp("criado_em", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [unique().on(t.chamadoId, t.usuarioId)],
);

export const chamadoComentarios = pgTable("chamado_comentarios", {
  id: uuid("id").primaryKey().defaultRandom(),
  chamadoId: uuid("chamado_id")
    .notNull()
    .references(() => chamados.id, { onDelete: "cascade" }),
  autorId: uuid("autor_id")
    .notNull()
    .references(() => users.id, { onDelete: "restrict" }),
  conteudo: text("conteudo").notNull(),
  criadoEm: timestamp("criado_em", { withTimezone: true }).defaultNow().notNull(),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).defaultNow().notNull(),
});

/** Última vez que o usuário “viu” os comentários do chamado (aba detalhes). */
export const chamadoLeituraComentarios = pgTable(
  "chamado_leitura_comentarios",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    chamadoId: uuid("chamado_id")
      .notNull()
      .references(() => chamados.id, { onDelete: "cascade" }),
    usuarioId: uuid("usuario_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    vistoAte: timestamp("visto_ate", { withTimezone: true }).notNull(),
  },
  (t) => [unique().on(t.chamadoId, t.usuarioId)],
);

export const chamadoAnexos = pgTable("chamado_anexos", {
  id: uuid("id").primaryKey().defaultRandom(),
  chamadoId: uuid("chamado_id")
    .notNull()
    .references(() => chamados.id, { onDelete: "cascade" }),
  comentarioId: uuid("comentario_id").references(() => chamadoComentarios.id, {
    onDelete: "cascade",
  }),
  url: text("url").notNull(),
  nomeArquivo: text("nome_arquivo").notNull(),
  tipo: text("tipo").notNull(),
  tamanho: integer("tamanho").notNull(),
  enviadoPor: uuid("enviado_por")
    .notNull()
    .references(() => users.id, { onDelete: "restrict" }),
  criadoEm: timestamp("criado_em", { withTimezone: true }).defaultNow().notNull(),
});

export const notificacoes = pgTable("notificacoes", {
  id: uuid("id").primaryKey().defaultRandom(),
  usuarioId: uuid("usuario_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  tipo: tipoNotificacaoEnum("tipo").notNull(),
  mensagem: text("mensagem").notNull(),
  lida: boolean("lida").default(false).notNull(),
  chamadoId: uuid("chamado_id").references(() => chamados.id, { onDelete: "cascade" }),
  criadoEm: timestamp("criado_em", { withTimezone: true }).defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type HistoricoLogin = typeof historicoLogin.$inferSelect;
export type Sessao = typeof sessoes.$inferSelect;
export type AppSetting = typeof appSettings.$inferSelect;
export type Setor = typeof setores.$inferSelect;
export type NewSetor = typeof setores.$inferInsert;
export type Categoria = typeof categorias.$inferSelect;
export type NewCategoria = typeof categorias.$inferInsert;
export type Chamado = typeof chamados.$inferSelect;
export type NewChamado = typeof chamados.$inferInsert;
export type ChamadoComentario = typeof chamadoComentarios.$inferSelect;
export type ChamadoAnexo = typeof chamadoAnexos.$inferSelect;
export type Notificacao = typeof notificacoes.$inferSelect;
