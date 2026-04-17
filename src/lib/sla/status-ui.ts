import { minutosUteisEntre } from "./horario-comercial";

/** Campos SLA usados na UI (lista/detalhe). */
export type ChamadoSlaCampos = {
  status: string;
  slaMetaRespostaMinutos: number | null;
  slaMetaResolucaoMinutos: number | null;
  slaRespostaLimiteEm: string | Date | null;
  slaResolucaoLimiteEm: string | Date | null;
  slaPrimeiraRespostaEm: string | Date | null;
  slaResolucaoEm: string | Date | null;
};

export type SlaBadgeKind = "sem" | "ok" | "proximo" | "estourado";

function asDate(v: string | Date | null | undefined): Date | null {
  if (v == null) return null;
  return typeof v === "string" ? new Date(v) : v;
}

function temSlaConfigurado(f: ChamadoSlaCampos): boolean {
  return f.slaResolucaoLimiteEm != null && f.slaMetaResolucaoMinutos != null;
}

/** Prioridade visual: estourado > próximo > ok > sem. */
function maxRank(a: SlaBadgeKind, b: SlaBadgeKind): SlaBadgeKind {
  const r = (k: SlaBadgeKind) => (k === "estourado" ? 3 : k === "proximo" ? 2 : k === "ok" ? 1 : 0);
  return r(a) >= r(b) ? a : b;
}

/**
 * Estado agregado do SLA para badges (lista) e resumo (detalhe).
 * Usa minutos úteis para “Próximo” em chamados abertos.
 */
export function slaResumoVisual(f: ChamadoSlaCampos): {
  kind: SlaBadgeKind;
  label: string;
  title: string;
} {
  if (!temSlaConfigurado(f)) {
    return {
      kind: "sem",
      label: "—",
      title: "Sem SLA configurado para esta combinação de categoria e prioridade.",
    };
  }

  if (f.status === "cancelado") {
    return {
      kind: "sem",
      label: "—",
      title: "Chamado cancelado: SLA de resolução não é contabilizado como cumprimento.",
    };
  }

  const limResp = asDate(f.slaRespostaLimiteEm);
  const limRes = asDate(f.slaResolucaoLimiteEm);
  const primeira = asDate(f.slaPrimeiraRespostaEm);
  const resolucao = asDate(f.slaResolucaoEm);
  const now = new Date();

  if (f.status === "fechado") {
    let kind: SlaBadgeKind = "ok";
    if (limResp && primeira && primeira.getTime() > limResp.getTime()) {
      kind = maxRank(kind, "estourado");
    }
    if (limRes && resolucao && resolucao.getTime() > limRes.getTime()) {
      kind = maxRank(kind, "estourado");
    }
    return {
      kind,
      label: kind === "estourado" ? "Estourado" : "No prazo",
      title:
        kind === "estourado"
          ? "Pelo menos um marco SLA (1ª resposta ou resolução) ultrapassou o limite em horário comercial."
          : "Marcos de SLA dentro dos limites configurados.",
    };
  }

  let kind: SlaBadgeKind = "ok";

  if (limResp && primeira && primeira.getTime() > limResp.getTime()) {
    kind = maxRank(kind, "estourado");
  }

  if (limResp && !primeira) {
    if (now.getTime() > limResp.getTime()) {
      kind = maxRank(kind, "estourado");
    } else if (f.slaMetaRespostaMinutos) {
      const rest = minutosUteisEntre(now, limResp);
      const threshold = Math.max(8, Math.ceil(0.2 * f.slaMetaRespostaMinutos));
      if (rest > 0 && rest <= threshold) {
        kind = maxRank(kind, "proximo");
      }
    }
  }

  if (kind !== "estourado" && limRes) {
    if (now.getTime() > limRes.getTime()) {
      kind = maxRank(kind, "estourado");
    } else if (f.slaMetaResolucaoMinutos && kind === "ok") {
      const rest = minutosUteisEntre(now, limRes);
      const threshold = Math.max(15, Math.ceil(0.2 * f.slaMetaResolucaoMinutos));
      if (rest > 0 && rest <= threshold) {
        kind = maxRank(kind, "proximo");
      }
    }
  }

  const label = kind === "estourado" ? "Estourado" : kind === "proximo" ? "Próximo" : "No prazo";
  const title =
    kind === "estourado"
      ? "Limite de SLA ultrapassado (1ª resposta ou resolução, conforme aplicável)."
      : kind === "proximo"
        ? "Restam poucos minutos úteis até o próximo limite (≈20% da meta ou mínimo fixo)."
        : "Dentro dos limites de SLA em horário comercial (America/Sao_Paulo).";

  return { kind, label, title };
}
