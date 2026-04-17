import { format, parse } from "date-fns";
import { ptBR } from "date-fns/locale";
import { and, gte, inArray, isNotNull, type SQL, sql } from "drizzle-orm";

import type { CurrentUser } from "@/lib/auth/get-current-user";
import { andComFiltrosLista, scopeListaChamadosParaUsuario } from "@/lib/chamados/scope-lista-para-usuario";
import { db } from "@/lib/db";
import { chamados } from "@/lib/db/schema";

export type ChamadosDashboardEscopo = "todos" | "setor" | "meus_e_acompanhados" | "vazio";

export type FaixasTempoBucket = {
  ate24h: number;
  de24a72h: number;
  de72a168h: number;
  acima168h: number;
};

export type ChamadosDashboardStats = {
  escopo: ChamadosDashboardEscopo;
  total: number;
  aberto: number;
  emProgresso: number;
  fechado: number;
  cancelado: number;
  ativos: number;
  altaUrgenteEmAtivos: number;
  criadosUltimos7Dias: number;
  encerradosUltimos7Dias: number;
  /** Encerrados (fechado/cancelado) nos últimos 90 dias — tempo da abertura até o encerramento */
  slaEncerrados90d: {
    amostra: number;
    medianaHoras: number;
    mediaHoras: number;
    percentualAte48h: number;
    faixas: FaixasTempoBucket;
  };
  /** Chamados ainda abertos ou em progresso — há quanto tempo estão abertos (risco de SLA) */
  idadeChamadosAtivos: {
    total: number;
    faixas: FaixasTempoBucket;
  };
  /** Por semana (início segunda-feira, fuso do banco): chamados criados e encerrados nos últimos ~8 semanas */
  serieSemanal8Semanas: { chave: string; label: string; criados: number; encerrados: number }[];
};

function escopoLabel(
  user: CurrentUser,
  scope: Awaited<ReturnType<typeof scopeListaChamadosParaUsuario>>,
): ChamadosDashboardEscopo {
  if (scope.kind === "nenhum") return "vazio";
  if (scope.kind === "todos") return "todos";
  if (user.tipoConta === "gestor_setor") return "setor";
  return "meus_e_acompanhados";
}

function num(v: unknown): number {
  if (v === null || v === undefined) return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function labelSemana(chave: string): string {
  try {
    const d = parse(chave, "yyyy-MM-dd", new Date());
    return format(d, "dd/MM", { locale: ptBR });
  } catch {
    return chave;
  }
}

const faixasZero: FaixasTempoBucket = { ate24h: 0, de24a72h: 0, de72a168h: 0, acima168h: 0 };

export async function getChamadosDashboardStats(user: CurrentUser): Promise<ChamadosDashboardStats> {
  const scope = await scopeListaChamadosParaUsuario(user);
  const escopo = escopoLabel(user, scope);

  const emptySla = {
    amostra: 0,
    medianaHoras: 0,
    mediaHoras: 0,
    percentualAte48h: 0,
    faixas: { ...faixasZero },
  };

  const empty: ChamadosDashboardStats = {
    escopo,
    total: 0,
    aberto: 0,
    emProgresso: 0,
    fechado: 0,
    cancelado: 0,
    ativos: 0,
    altaUrgenteEmAtivos: 0,
    criadosUltimos7Dias: 0,
    encerradosUltimos7Dias: 0,
    slaEncerrados90d: emptySla,
    idadeChamadosAtivos: { total: 0, faixas: { ...faixasZero } },
    serieSemanal8Semanas: [],
  };

  if (scope.kind === "nenhum") {
    return empty;
  }

  const base: SQL = andComFiltrosLista(scope, {}) ?? sql`true`;
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const eightWeeksAgo = new Date(Date.now() - 56 * 24 * 60 * 60 * 1000);

  const fechadoOuCancelado = inArray(chamados.status, ["fechado", "cancelado"]);
  const horasResolucao = sql`extract(epoch from (${chamados.fechadoEm} - ${chamados.criadoEm})) / 3600.0`;
  const slaWhere = and(base, fechadoOuCancelado, isNotNull(chamados.fechadoEm), gte(chamados.fechadoEm, ninetyDaysAgo));

  const horasEmAberto = sql`extract(epoch from (now() - ${chamados.criadoEm})) / 3600.0`;
  const ativosWhere = and(base, inArray(chamados.status, ["aberto", "em_progresso"]));

  const [
    statusRows,
    altaUrgRows,
    novosRows,
    encerradosRows,
    slaAggRows,
    idadeAggRows,
    criadosSemRows,
    encerradosSemRows,
  ] = await Promise.all([
    db
      .select({
        status: chamados.status,
        n: sql<number>`count(*)::int`,
      })
      .from(chamados)
      .where(base)
      .groupBy(chamados.status),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(chamados)
      .where(
        and(
          base,
          inArray(chamados.status, ["aberto", "em_progresso"]),
          inArray(chamados.prioridade, ["alta", "urgente"]),
        ),
      ),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(chamados)
      .where(and(base, gte(chamados.criadoEm, sevenDaysAgo))),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(chamados)
      .where(and(base, isNotNull(chamados.fechadoEm), gte(chamados.fechadoEm, sevenDaysAgo), fechadoOuCancelado)),
    db
      .select({
        amostra: sql<number>`count(*)::int`,
        medianaHoras: sql<number>`coalesce(percentile_cont(0.5) within group (order by ${horasResolucao}), 0)::double precision`,
        mediaHoras: sql<number>`coalesce(avg(${horasResolucao}), 0)::double precision`,
        ate48h: sql<number>`count(*) filter (where ${horasResolucao} < 48)::int`,
        ate24h: sql<number>`count(*) filter (where ${horasResolucao} < 24)::int`,
        de24a72h: sql<number>`count(*) filter (where ${horasResolucao} >= 24 and ${horasResolucao} < 72)::int`,
        de72a168h: sql<number>`count(*) filter (where ${horasResolucao} >= 72 and ${horasResolucao} < 168)::int`,
        acima168h: sql<number>`count(*) filter (where ${horasResolucao} >= 168)::int`,
      })
      .from(chamados)
      .where(slaWhere),
    db
      .select({
        total: sql<number>`count(*)::int`,
        ate24h: sql<number>`count(*) filter (where ${horasEmAberto} < 24)::int`,
        de24a72h: sql<number>`count(*) filter (where ${horasEmAberto} >= 24 and ${horasEmAberto} < 72)::int`,
        de72a168h: sql<number>`count(*) filter (where ${horasEmAberto} >= 72 and ${horasEmAberto} < 168)::int`,
        acima168h: sql<number>`count(*) filter (where ${horasEmAberto} >= 168)::int`,
      })
      .from(chamados)
      .where(ativosWhere),
    db
      .select({
        semana: sql<string>`to_char(date_trunc('week', ${chamados.criadoEm}), 'YYYY-MM-DD')`,
        criados: sql<number>`count(*)::int`,
      })
      .from(chamados)
      .where(and(base, gte(chamados.criadoEm, eightWeeksAgo)))
      .groupBy(sql`date_trunc('week', ${chamados.criadoEm})`)
      .orderBy(sql`date_trunc('week', ${chamados.criadoEm})`),
    db
      .select({
        semana: sql<string>`to_char(date_trunc('week', ${chamados.fechadoEm}), 'YYYY-MM-DD')`,
        encerrados: sql<number>`count(*)::int`,
      })
      .from(chamados)
      .where(and(base, isNotNull(chamados.fechadoEm), fechadoOuCancelado, gte(chamados.fechadoEm, eightWeeksAgo)))
      .groupBy(sql`date_trunc('week', ${chamados.fechadoEm})`)
      .orderBy(sql`date_trunc('week', ${chamados.fechadoEm})`),
  ]);

  const byStatus = Object.fromEntries(statusRows.map((r) => [r.status, r.n])) as Record<string, number>;
  const aberto = byStatus.aberto ?? 0;
  const emProgresso = byStatus.em_progresso ?? 0;
  const fechado = byStatus.fechado ?? 0;
  const cancelado = byStatus.cancelado ?? 0;
  const total = statusRows.reduce((acc, r) => acc + r.n, 0);
  const ativos = aberto + emProgresso;

  const slaAgg = slaAggRows[0];
  const amostraSla = num(slaAgg?.amostra);
  const medianaHoras = num(slaAgg?.medianaHoras);
  const mediaHoras = num(slaAgg?.mediaHoras);
  const ate48h = num(slaAgg?.ate48h);
  const percentualAte48h = amostraSla > 0 ? Math.round((ate48h / amostraSla) * 1000) / 10 : 0;

  const idade = idadeAggRows[0];

  const semMap = new Map<string, { criados: number; encerrados: number }>();
  for (const r of criadosSemRows) {
    semMap.set(r.semana, { criados: num(r.criados), encerrados: 0 });
  }
  for (const r of encerradosSemRows) {
    const cur = semMap.get(r.semana) ?? { criados: 0, encerrados: 0 };
    cur.encerrados = num(r.encerrados);
    semMap.set(r.semana, cur);
  }
  const serieSemanal8Semanas = [...semMap.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([chave, v]) => ({
      chave,
      label: labelSemana(chave),
      criados: v.criados,
      encerrados: v.encerrados,
    }));

  return {
    escopo,
    total,
    aberto,
    emProgresso,
    fechado,
    cancelado,
    ativos,
    altaUrgenteEmAtivos: num(altaUrgRows[0]?.n),
    criadosUltimos7Dias: num(novosRows[0]?.n),
    encerradosUltimos7Dias: num(encerradosRows[0]?.n),
    slaEncerrados90d: {
      amostra: amostraSla,
      medianaHoras,
      mediaHoras,
      percentualAte48h,
      faixas: {
        ate24h: num(slaAgg?.ate24h),
        de24a72h: num(slaAgg?.de24a72h),
        de72a168h: num(slaAgg?.de72a168h),
        acima168h: num(slaAgg?.acima168h),
      },
    },
    idadeChamadosAtivos: {
      total: num(idade?.total),
      faixas: {
        ate24h: num(idade?.ate24h),
        de24a72h: num(idade?.de24a72h),
        de72a168h: num(idade?.de72a168h),
        acima168h: num(idade?.acima168h),
      },
    },
    serieSemanal8Semanas,
  };
}
