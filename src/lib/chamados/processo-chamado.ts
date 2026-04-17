import { format, formatDistance } from "date-fns";
import { ptBR } from "date-fns/locale";
import { asc, eq, inArray } from "drizzle-orm";

import { labelTipoChamado } from "@/lib/chamados/tipo-chamado";
import { db } from "@/lib/db";
import {
  categorias,
  chamadoAcompanhadores,
  chamadoAnexos,
  chamadoComentarios,
  chamados,
  setores,
  users,
} from "@/lib/db/schema";
import { slaResumoVisual } from "@/lib/sla/status-ui";

function fmtDataHora(d: Date): string {
  return format(d, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
}

function fmtDuracao(de: Date, ate: Date): string {
  return formatDistance(de, ate, { locale: ptBR, addSuffix: false });
}

const STATUS_LABEL: Record<string, string> = {
  aberto: "Aberto",
  em_progresso: "Em progresso",
  fechado: "Fechado",
  cancelado: "Cancelado",
};

const PRIORIDADE_LABEL: Record<string, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
  urgente: "Urgente",
};

export type ProcessoChamadoEvento = {
  id: string;
  quandoIso: string;
  tipo: "abertura" | "acompanhador" | "anexo" | "comentario" | "sla_primeira_resposta" | "fechamento";
  titulo: string;
  detalhe?: string;
  usuarioNome: string | null;
};

export type ProcessoChamadoMetricas = {
  atePrimeiraInteracao: string | null;
  atePrimeiraRespostaEquipe: string | null;
  atePrimeiraRespostaSla: string | null;
  tempoAteResolucao: string | null;
};

export type ProcessoChamadoPayload = {
  chamado: {
    id: string;
    numero: number;
    titulo: string;
    status: string;
    prioridade: string;
    tipoChamado: string;
    criadoEm: string;
    atualizadoEm: string;
    fechadoEm: string | null;
    criadorNome: string | null;
    atribuidoNome: string | null;
    setorNome: string | null;
    categoriaNome: string | null;
    slaPrimeiraRespostaEm: string | null;
    slaResolucaoEm: string | null;
    slaResolucaoLimiteEm: string | null;
  };
  situacaoResumo: string;
  metricas: ProcessoChamadoMetricas;
  eventos: ProcessoChamadoEvento[];
};

export async function getProcessoChamadoPayload(chamadoId: string): Promise<ProcessoChamadoPayload | null> {
  const [row] = await db.select().from(chamados).where(eq(chamados.id, chamadoId)).limit(1);
  if (!row) return null;

  const [criador] = await db
    .select({ name: users.name, email: users.email })
    .from(users)
    .where(eq(users.id, row.criadorId))
    .limit(1);
  const [atrib] = await db.select({ name: users.name }).from(users).where(eq(users.id, row.atribuidoA)).limit(1);
  const [setor] = await db.select({ nome: setores.nome }).from(setores).where(eq(setores.id, row.setorId)).limit(1);
  const [cat] = await db
    .select({ nome: categorias.nome })
    .from(categorias)
    .where(eq(categorias.id, row.categoriaId))
    .limit(1);

  const comentarios = await db
    .select({
      id: chamadoComentarios.id,
      conteudo: chamadoComentarios.conteudo,
      criadoEm: chamadoComentarios.criadoEm,
      autorId: chamadoComentarios.autorId,
      autorNome: users.name,
    })
    .from(chamadoComentarios)
    .innerJoin(users, eq(chamadoComentarios.autorId, users.id))
    .where(eq(chamadoComentarios.chamadoId, chamadoId))
    .orderBy(asc(chamadoComentarios.criadoEm));

  const anexos = await db
    .select({
      id: chamadoAnexos.id,
      nomeArquivo: chamadoAnexos.nomeArquivo,
      criadoEm: chamadoAnexos.criadoEm,
      comentarioId: chamadoAnexos.comentarioId,
      enviadoPor: chamadoAnexos.enviadoPor,
    })
    .from(chamadoAnexos)
    .where(eq(chamadoAnexos.chamadoId, chamadoId))
    .orderBy(asc(chamadoAnexos.criadoEm));

  const enviadoresIds = [...new Set(anexos.map((a) => a.enviadoPor))];
  const nomesPorId = new Map<string, string | null>();
  if (enviadoresIds.length > 0) {
    const urows = await db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(inArray(users.id, enviadoresIds));
    for (const u of urows) nomesPorId.set(u.id, u.name);
  }

  const acomps = await db
    .select({
      criadoEm: chamadoAcompanhadores.criadoEm,
      usuarioId: chamadoAcompanhadores.usuarioId,
      nome: users.name,
    })
    .from(chamadoAcompanhadores)
    .innerJoin(users, eq(chamadoAcompanhadores.usuarioId, users.id))
    .where(eq(chamadoAcompanhadores.chamadoId, chamadoId))
    .orderBy(asc(chamadoAcompanhadores.criadoEm));

  const criado = row.criadoEm;
  const criadorNome = criador?.name?.trim() || criador?.email || "Usuário";

  const eventos: ProcessoChamadoEvento[] = [];

  eventos.push({
    id: "abertura",
    quandoIso: criado.toISOString(),
    tipo: "abertura",
    titulo: "Chamado aberto",
    detalhe: `Prioridade: ${PRIORIDADE_LABEL[row.prioridade] ?? row.prioridade} · Tipo: ${labelTipoChamado(row.tipoChamado)}`,
    usuarioNome: criadorNome,
  });

  for (const a of acomps) {
    eventos.push({
      id: `acomp-${a.usuarioId}-${a.criadoEm.toISOString()}`,
      quandoIso: a.criadoEm.toISOString(),
      tipo: "acompanhador",
      titulo: "Acompanhador adicionado",
      detalhe: undefined,
      usuarioNome: a.nome?.trim() || "Usuário",
    });
  }

  for (const an of anexos) {
    const quem = nomesPorId.get(an.enviadoPor) ?? "Usuário";
    eventos.push({
      id: `anexo-${an.id}`,
      quandoIso: an.criadoEm.toISOString(),
      tipo: "anexo",
      titulo: an.comentarioId ? "Anexo em comentário" : "Anexo no chamado",
      detalhe: an.nomeArquivo,
      usuarioNome: quem,
    });
  }

  for (const c of comentarios) {
    const n = c.autorNome?.trim() || "Usuário";
    eventos.push({
      id: `com-${c.id}`,
      quandoIso: c.criadoEm.toISOString(),
      tipo: "comentario",
      titulo: c.autorId === row.criadorId ? "Comentário do requerente" : "Comentário da equipe",
      detalhe: c.conteudo,
      usuarioNome: n,
    });
  }

  if (row.slaPrimeiraRespostaEm) {
    eventos.push({
      id: "sla-pr",
      quandoIso: row.slaPrimeiraRespostaEm.toISOString(),
      tipo: "sla_primeira_resposta",
      titulo: "Primeira resposta (SLA registrada)",
      detalhe: undefined,
      usuarioNome: null,
    });
  }

  if (row.fechadoEm) {
    const encerrado =
      row.status === "cancelado"
        ? "Chamado cancelado"
        : row.status === "fechado"
          ? "Chamado fechado"
          : "Chamado encerrado";
    eventos.push({
      id: "fechamento",
      quandoIso: row.fechadoEm.toISOString(),
      tipo: "fechamento",
      titulo: encerrado,
      detalhe: undefined,
      usuarioNome: null,
    });
  }

  eventos.sort((a, b) => new Date(a.quandoIso).getTime() - new Date(b.quandoIso).getTime());

  const primeiroComentarioData = comentarios[0]?.criadoEm;
  const primeiroAnexoData = anexos[0]?.criadoEm;
  const candidatosInteracao = [primeiroComentarioData, primeiroAnexoData].filter(Boolean) as Date[];
  const primeiraInteracaoData =
    candidatosInteracao.length > 0 ? new Date(Math.min(...candidatosInteracao.map((d) => d.getTime()))) : null;

  const primeiroComentarioEquipe = comentarios.find((c) => c.autorId !== row.criadorId);
  const primeiraRespostaEquipeEm = primeiroComentarioEquipe?.criadoEm ?? null;

  const metricas: ProcessoChamadoMetricas = {
    atePrimeiraInteracao:
      primeiraInteracaoData && primeiraInteracaoData > criado ? fmtDuracao(criado, primeiraInteracaoData) : null,
    atePrimeiraRespostaEquipe:
      primeiraRespostaEquipeEm && primeiraRespostaEquipeEm > criado
        ? fmtDuracao(criado, primeiraRespostaEquipeEm)
        : null,
    atePrimeiraRespostaSla:
      row.slaPrimeiraRespostaEm && row.slaPrimeiraRespostaEm > criado
        ? fmtDuracao(criado, row.slaPrimeiraRespostaEm)
        : null,
    tempoAteResolucao:
      row.fechadoEm && row.fechadoEm > criado && (row.status === "fechado" || row.status === "cancelado")
        ? fmtDuracao(criado, row.fechadoEm)
        : null,
  };

  const slaVis = slaResumoVisual({
    status: row.status,
    slaMetaRespostaMinutos: row.slaMetaRespostaMinutos,
    slaMetaResolucaoMinutos: row.slaMetaResolucaoMinutos,
    slaRespostaLimiteEm: row.slaRespostaLimiteEm,
    slaResolucaoLimiteEm: row.slaResolucaoLimiteEm,
    slaPrimeiraRespostaEm: row.slaPrimeiraRespostaEm,
    slaResolucaoEm: row.slaResolucaoEm,
  });

  const situacaoResumo = [
    `Status atual: ${STATUS_LABEL[row.status] ?? row.status}.`,
    `Responsável técnico: ${atrib?.name?.trim() ?? "—"}.`,
    `Setor: ${setor?.nome ?? "—"} · Categoria: ${cat?.nome ?? "—"}.`,
    `Última atualização no registro: ${fmtDataHora(row.atualizadoEm)}.`,
    slaVis.kind !== "sem" ? `SLA: ${slaVis.title}` : "Sem metas de SLA para este chamado.",
  ].join(" ");

  return {
    chamado: {
      id: row.id,
      numero: row.numero,
      titulo: row.titulo,
      status: row.status,
      prioridade: row.prioridade,
      tipoChamado: row.tipoChamado,
      criadoEm: row.criadoEm.toISOString(),
      atualizadoEm: row.atualizadoEm.toISOString(),
      fechadoEm: row.fechadoEm?.toISOString() ?? null,
      criadorNome,
      atribuidoNome: atrib?.name?.trim() ?? null,
      setorNome: setor?.nome ?? null,
      categoriaNome: cat?.nome ?? null,
      slaPrimeiraRespostaEm: row.slaPrimeiraRespostaEm?.toISOString() ?? null,
      slaResolucaoEm: row.slaResolucaoEm?.toISOString() ?? null,
      slaResolucaoLimiteEm: row.slaResolucaoLimiteEm?.toISOString() ?? null,
    },
    situacaoResumo,
    metricas,
    eventos,
  };
}
