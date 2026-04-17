import { NextResponse } from "next/server";

import { eq } from "drizzle-orm";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { canAlterarStatus, canAtribuirChamado } from "@/lib/auth/permissions";
import { getChamadoSeUsuarioTemAcesso } from "@/lib/chamados/acesso-chamado";
import { touchChamadoAtualizado } from "@/lib/chamados/touch-chamado";
import { db } from "@/lib/db";
import {
  categorias,
  chamadoAcompanhadores,
  chamadoAnexos,
  chamadoComentarios,
  chamados,
  setores,
  usuarioCategorias,
  users,
} from "@/lib/db/schema";
import { criarNotificacoes } from "@/lib/notificacoes";
import { destinatariosNotificacaoChamado } from "@/lib/notificacoes-chamado-destinatarios";
import { calcularLimitesSla } from "@/lib/sla/calcular-prazos";
import { adicionarMinutosUteis } from "@/lib/sla/horario-comercial";
import { buscarPoliticaSla, type PrioridadeChamado } from "@/lib/sla/politica-db";
import { TIPO_CHAMADO_PG } from "@/lib/chamados/tipo-chamado";

const PatchChamadoSchema = z.object({
  status: z.enum(["aberto", "em_progresso", "fechado", "cancelado"]).optional(),
  prioridade: z.enum(["baixa", "media", "alta", "urgente"]).optional(),
  tipoChamado: z.enum(TIPO_CHAMADO_PG).optional(),
  atribuidoA: z.string().uuid().optional(),
  categoriaId: z.string().uuid().optional(),
  titulo: z.string().min(1).max(300).optional(),
  descricao: z.string().min(1).optional(),
});

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const { id } = await params;
  const chamado = await getChamadoSeUsuarioTemAcesso(id, user);
  if (!chamado) return NextResponse.json({ error: "Chamado não encontrado." }, { status: 404 });

  const [setor] = await db
    .select({ id: setores.id, nome: setores.nome })
    .from(setores)
    .where(eq(setores.id, chamado.setorId))
    .limit(1);

  const [criador] = await db
    .select({ id: users.id, name: users.name, fotoPerfil: users.fotoPerfil })
    .from(users)
    .where(eq(users.id, chamado.criadorId))
    .limit(1);

  const [atribuido] = await db
    .select({ id: users.id, name: users.name, fotoPerfil: users.fotoPerfil })
    .from(users)
    .where(eq(users.id, chamado.atribuidoA))
    .limit(1);

  const [categoria] = await db
    .select({ id: categorias.id, nome: categorias.nome })
    .from(categorias)
    .where(eq(categorias.id, chamado.categoriaId))
    .limit(1);

  const acompanhadores = await db
    .select({ id: users.id, name: users.name, fotoPerfil: users.fotoPerfil, tipoConta: users.tipoConta })
    .from(chamadoAcompanhadores)
    .innerJoin(users, eq(chamadoAcompanhadores.usuarioId, users.id))
    .where(eq(chamadoAcompanhadores.chamadoId, id));

  const comentarios = await db
    .select({
      id: chamadoComentarios.id,
      conteudo: chamadoComentarios.conteudo,
      criadoEm: chamadoComentarios.criadoEm,
      atualizadoEm: chamadoComentarios.atualizadoEm,
      autorId: chamadoComentarios.autorId,
      autorNome: users.name,
      autorFoto: users.fotoPerfil,
    })
    .from(chamadoComentarios)
    .innerJoin(users, eq(chamadoComentarios.autorId, users.id))
    .where(eq(chamadoComentarios.chamadoId, id))
    .orderBy(chamadoComentarios.criadoEm);

  const anexos = await db
    .select()
    .from(chamadoAnexos)
    .where(eq(chamadoAnexos.chamadoId, id))
    .orderBy(chamadoAnexos.criadoEm);

  return NextResponse.json({
    chamado: {
      ...chamado,
      setor,
      categoria: categoria ?? null,
      criador,
      atribuido: atribuido ?? null,
      acompanhadores,
      comentarios,
      anexos,
    },
  });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const { id } = await params;
  const chamado = await getChamadoSeUsuarioTemAcesso(id, user);
  if (!chamado) return NextResponse.json({ error: "Chamado não encontrado." }, { status: 404 });

  const body = await request.json();
  const parsed = PatchChamadoSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos.", details: parsed.error.flatten() }, { status: 400 });
  }

  if (parsed.data.status && !canAlterarStatus(user)) {
    return NextResponse.json({ error: "Sem permissão para alterar status." }, { status: 403 });
  }
  if (parsed.data.atribuidoA !== undefined && !canAtribuirChamado(user)) {
    return NextResponse.json({ error: "Sem permissão para atribuir chamado." }, { status: 403 });
  }
  if (parsed.data.categoriaId !== undefined && !canAtribuirChamado(user)) {
    return NextResponse.json({ error: "Sem permissão para alterar a categoria." }, { status: 403 });
  }
  if (parsed.data.tipoChamado !== undefined && !canAtribuirChamado(user)) {
    return NextResponse.json({ error: "Sem permissão para alterar o tipo do chamado." }, { status: 403 });
  }

  if (parsed.data.categoriaId !== undefined) {
    const [cat] = await db
      .select({
        id: categorias.id,
        responsavelPadraoId: categorias.responsavelPadraoId,
        ativo: categorias.ativo,
      })
      .from(categorias)
      .where(eq(categorias.id, parsed.data.categoriaId))
      .limit(1);
    if (!cat || !cat.ativo) {
      return NextResponse.json({ error: "Categoria não encontrada ou inativa." }, { status: 404 });
    }
    if (parsed.data.atribuidoA === undefined && !cat.responsavelPadraoId) {
      const responsaveisRows = await db
        .select({ usuarioId: usuarioCategorias.usuarioId })
        .from(usuarioCategorias)
        .where(eq(usuarioCategorias.categoriaId, cat.id));
      if (responsaveisRows.length === 0) {
        return NextResponse.json(
          { error: "A categoria não possui técnicos responsáveis. Configure antes de usar." },
          { status: 400 },
        );
      }
    }
  }

  const updates: Partial<typeof chamados.$inferInsert> = { atualizadoEm: new Date() };
  if (parsed.data.status !== undefined) {
    updates.status = parsed.data.status;
    if (parsed.data.status === "fechado" || parsed.data.status === "cancelado") {
      updates.fechadoEm = new Date();
    }
  }
  if (parsed.data.prioridade !== undefined) updates.prioridade = parsed.data.prioridade;
  if (parsed.data.tipoChamado !== undefined) updates.tipoChamado = parsed.data.tipoChamado;
  if (parsed.data.atribuidoA !== undefined) updates.atribuidoA = parsed.data.atribuidoA;
  if (parsed.data.categoriaId !== undefined) {
    updates.categoriaId = parsed.data.categoriaId;
    if (parsed.data.atribuidoA === undefined) {
      const [cat] = await db
        .select({ responsavelPadraoId: categorias.responsavelPadraoId })
        .from(categorias)
        .where(eq(categorias.id, parsed.data.categoriaId))
        .limit(1);
      if (cat?.responsavelPadraoId) {
        updates.atribuidoA = cat.responsavelPadraoId;
      } else {
        const responsaveisRows = await db
          .select({ usuarioId: usuarioCategorias.usuarioId })
          .from(usuarioCategorias)
          .where(eq(usuarioCategorias.categoriaId, parsed.data.categoriaId));
        if (responsaveisRows.length > 0) {
          updates.atribuidoA = responsaveisRows[0].usuarioId;
        }
      }
    }
  }
  if (parsed.data.titulo !== undefined) updates.titulo = parsed.data.titulo;
  if (parsed.data.descricao !== undefined) updates.descricao = parsed.data.descricao;

  const newCategoriaId = parsed.data.categoriaId ?? chamado.categoriaId;
  const newPrioridade = (parsed.data.prioridade ?? chamado.prioridade) as PrioridadeChamado;
  const categoriaOuPrioridadeMudou =
    (parsed.data.categoriaId !== undefined && parsed.data.categoriaId !== chamado.categoriaId) ||
    (parsed.data.prioridade !== undefined && parsed.data.prioridade !== chamado.prioridade);

  if (
    categoriaOuPrioridadeMudou &&
    chamado.status !== "fechado" &&
    chamado.status !== "cancelado"
  ) {
    const politica = await buscarPoliticaSla(db, newCategoriaId, newPrioridade);
    if (!politica) {
      Object.assign(updates, {
        slaMetaRespostaMinutos: null,
        slaMetaResolucaoMinutos: null,
        slaRespostaLimiteEm: null,
        slaResolucaoLimiteEm: null,
      });
    } else if (!chamado.slaPrimeiraRespostaEm) {
      const inicio = new Date();
      const lim = calcularLimitesSla(inicio, politica);
      Object.assign(updates, {
        slaMetaRespostaMinutos: politica.metaRespostaMinutos,
        slaMetaResolucaoMinutos: politica.metaResolucaoMinutos,
        slaRespostaLimiteEm: lim.slaRespostaLimiteEm,
        slaResolucaoLimiteEm: lim.slaResolucaoLimiteEm,
      });
    } else {
      Object.assign(updates, {
        slaMetaResolucaoMinutos: politica.metaResolucaoMinutos,
        slaResolucaoLimiteEm: adicionarMinutosUteis(new Date(), politica.metaResolucaoMinutos),
      });
    }
  }

  if (parsed.data.status === "fechado") {
    updates.slaResolucaoEm = new Date();
  }
  if (parsed.data.status === "cancelado") {
    updates.slaResolucaoEm = null;
  }

  const [updated] = await db.update(chamados).set(updates).where(eq(chamados.id, id)).returning();

  if (
    parsed.data.categoriaId !== undefined ||
    parsed.data.atribuidoA !== undefined ||
    parsed.data.tipoChamado !== undefined
  ) {
    await touchChamadoAtualizado(id);
  }

  const responsavelMudou =
    updated.atribuidoA !== chamado.atribuidoA &&
    (parsed.data.atribuidoA !== undefined || parsed.data.categoriaId !== undefined);

  if (responsavelMudou) {
    const newA = updated.atribuidoA;
    const oldA = chamado.atribuidoA;

    if (newA !== user.id) {
      await criarNotificacoes(
        [newA],
        "atribuicao",
        `Você foi designado para o chamado nº ${updated.numero} "${updated.titulo}".`,
        id,
      );
    }
    const broadcastIds = (
      await destinatariosNotificacaoChamado(id, {
        excluirUsuarioId: user.id,
        incluirUsuarioIds: oldA !== newA ? [oldA] : [],
      })
    ).filter((uid) => uid !== newA);
    if (broadcastIds.length > 0) {
      const [assignee] = await db.select({ name: users.name }).from(users).where(eq(users.id, newA)).limit(1);
      const nome = assignee?.name ?? "um técnico";
      await criarNotificacoes(broadcastIds, "atribuicao", `Chamado nº ${updated.numero} atribuído a ${nome}.`, id);
    }
  }

  if (parsed.data.status && parsed.data.status !== chamado.status) {
    const ids = await destinatariosNotificacaoChamado(id, { excluirUsuarioId: user.id });
    if (ids.length > 0) {
      await criarNotificacoes(
        ids,
        "status_alterado",
        `Status do chamado nº ${updated.numero} alterado para "${parsed.data.status}".`,
        id,
      );
    }
  }

  if (parsed.data.prioridade !== undefined && parsed.data.prioridade !== chamado.prioridade) {
    const ids = await destinatariosNotificacaoChamado(id, { excluirUsuarioId: user.id });
    if (ids.length > 0) {
      await criarNotificacoes(
        ids,
        "status_alterado",
        `Prioridade do chamado nº ${updated.numero} alterada para "${parsed.data.prioridade}".`,
        id,
      );
    }
  }

  const tituloMudou = parsed.data.titulo !== undefined && parsed.data.titulo !== chamado.titulo;
  const descricaoMudou = parsed.data.descricao !== undefined && parsed.data.descricao !== chamado.descricao;
  if (tituloMudou || descricaoMudou) {
    const ids = await destinatariosNotificacaoChamado(id, { excluirUsuarioId: user.id });
    if (ids.length > 0) {
      await criarNotificacoes(
        ids,
        "status_alterado",
        `O chamado nº ${updated.numero} foi atualizado (${updated.titulo}).`,
        id,
      );
    }
  }

  return NextResponse.json({ chamado: updated });
}
