import type { CurrentUser } from "./get-current-user";

export type TipoConta =
  | "admin"
  | "usuario_final"
  | "gestor_setor"
  | "diretor"
  | "ti"
  | "desenvolvedor";

export function isAdmin(user: CurrentUser) {
  return user.tipoConta === "admin";
}

export function isGestorSetor(user: CurrentUser) {
  return user.tipoConta === "gestor_setor";
}

export function isDiretor(user: CurrentUser) {
  return user.tipoConta === "diretor";
}

export function isTI(user: CurrentUser) {
  return user.tipoConta === "ti";
}

export function isDesenvolvedor(user: CurrentUser) {
  return user.tipoConta === "desenvolvedor";
}

export function isUsuarioFinal(user: CurrentUser) {
  return user.tipoConta === "usuario_final";
}

/** Pode alterar status de chamados */
export function canAlterarStatus(user: CurrentUser) {
  return ["admin", "gestor_setor", "diretor", "ti", "desenvolvedor"].includes(user.tipoConta);
}

/** Pode atribuir chamados a responsáveis */
export function canAtribuirChamado(user: CurrentUser) {
  return ["admin", "gestor_setor", "diretor", "ti"].includes(user.tipoConta);
}

/** Vê todos os chamados (sem filtro de setor ou criador) */
export function canVerTodosChamados(user: CurrentUser) {
  return ["admin", "diretor", "ti", "desenvolvedor"].includes(user.tipoConta);
}

/** Pode gerenciar setores (criar, editar, excluir) */
export function canGerenciarSetores(user: CurrentUser) {
  return user.tipoConta === "admin";
}

/** Pode ver relatórios gerais (todos os setores) */
export function canVerRelatoriosGerais(user: CurrentUser) {
  return ["admin", "diretor"].includes(user.tipoConta);
}

/** Pode ver relatórios do seu setor */
export function canVerRelatoriosSetor(user: CurrentUser) {
  return ["admin", "diretor", "gestor_setor"].includes(user.tipoConta);
}

/** Pode gerenciar usuários do sistema */
export function canGerenciarUsuarios(user: CurrentUser) {
  return user.tipoConta === "admin";
}

/** Linha do tempo / processo completo do chamado (gestão): admin, diretor ou gestor de setor. */
export function canVerProcessoCompletoChamado(user: CurrentUser) {
  return user.tipoConta === "admin" || user.tipoConta === "diretor" || user.tipoConta === "gestor_setor";
}
