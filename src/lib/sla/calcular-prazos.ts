import { adicionarMinutosUteis } from "./horario-comercial";

export type PoliticaSlaMinutos = {
  metaRespostaMinutos: number;
  metaResolucaoMinutos: number;
};

/** Calcula instantes limite (UTC) a partir do início do chamado e das metas em minutos úteis. */
export function calcularLimitesSla(inicioUtc: Date, politica: PoliticaSlaMinutos) {
  return {
    slaRespostaLimiteEm: adicionarMinutosUteis(inicioUtc, politica.metaRespostaMinutos),
    slaResolucaoLimiteEm: adicionarMinutosUteis(inicioUtc, politica.metaResolucaoMinutos),
  };
}
