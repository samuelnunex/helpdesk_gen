/** Valores do enum PostgreSQL `tipo_chamado` (ITIL / gestão de serviços). */
export const TIPO_CHAMADO_PG = ["requisicao", "incidente", "mudanca", "solicitacao_informacao"] as const;

export type TipoChamado = (typeof TIPO_CHAMADO_PG)[number];

export const LABEL_TIPO_CHAMADO: Record<TipoChamado, string> = {
  requisicao: "Requisição",
  incidente: "Incidente",
  mudanca: "Mudança",
  solicitacao_informacao: "Solicitação de informação",
};

export function labelTipoChamado(v: string | null | undefined): string {
  if (v && v in LABEL_TIPO_CHAMADO) return LABEL_TIPO_CHAMADO[v as TipoChamado];
  return "—";
}
