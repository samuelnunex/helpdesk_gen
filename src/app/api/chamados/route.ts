import { NextResponse } from "next/server";

import { and, desc, eq, gt, inArray, ne, or, sql } from "drizzle-orm";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { andComFiltrosLista, scopeListaChamadosParaUsuario } from "@/lib/chamados/scope-lista-para-usuario";
import { db } from "@/lib/db";
import {
  categorias,
  chamadoAcompanhadores,
  chamadoComentarios,
  chamadoLeituraComentarios,
  chamados,
  setores,
  users,
} from "@/lib/db/schema";
import { criarNotificacoes } from "@/lib/notificacoes";
import { idsUsuariosTIAtivos } from "@/lib/notificacoes-chamado-destinatarios";

const CreateChamadoSchema = z.object({
  titulo: z.string().min(1).max(300),
  descricao: z.string().min(1),
  prioridade: z.enum(["baixa", "media", "alta", "urgente"]).default("media"),
  setorId: z.string().uuid(),
  categoriaId: z.string().uuid(),
  acompanhadores: z.array(z.string().uuid()).optional(),
});

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const prioridade = searchParams.get("prioridade");
  const setorId = searchParams.get("setorId");
  const buscaParam = searchParams.get("busca")?.trim();
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const limit = 20;
  const offset = (page - 1) * limit;

  try {
    const scope = await scopeListaChamadosParaUsuario(user);
    if (scope.kind === "nenhum") {
      return NextResponse.json({ chamados: [], total: 0 });
    }

    const filtros: Parameters<typeof andComFiltrosLista>[1] = {};
    if (status) filtros.status = eq(chamados.status, status as "aberto" | "em_progresso" | "fechado" | "cancelado");
    if (prioridade) filtros.prioridade = eq(chamados.prioridade, prioridade as "baixa" | "media" | "alta" | "urgente");
    if (setorId) filtros.setorId = eq(chamados.setorId, setorId);
    if (buscaParam && buscaParam.length <= 200) {
      const needle = buscaParam.toLowerCase();
      const matchTitulo = sql`strpos(lower(${chamados.titulo}), ${needle}) > 0`;
      if (/^\d+$/.test(buscaParam)) {
        const n = Number(buscaParam);
        if (n > 0 && n <= 2_147_483_647) {
          filtros.busca = or(eq(chamados.numero, n), matchTitulo)!;
        } else {
          filtros.busca = matchTitulo;
        }
      } else {
        filtros.busca = matchTitulo;
      }
    }

    const where = andComFiltrosLista(scope, filtros);

    const lista = await db
      .select({
        id: chamados.id,
        numero: chamados.numero,
        titulo: chamados.titulo,
        status: chamados.status,
        prioridade: chamados.prioridade,
        setorId: chamados.setorId,
        setorNome: setores.nome,
        categoriaId: chamados.categoriaId,
        categoriaNome: categorias.nome,
        criadorId: chamados.criadorId,
        atribuidoA: chamados.atribuidoA,
        criadoEm: chamados.criadoEm,
        atualizadoEm: chamados.atualizadoEm,
        fechadoEm: chamados.fechadoEm,
      })
      .from(chamados)
      .leftJoin(setores, eq(chamados.setorId, setores.id))
      .leftJoin(categorias, eq(chamados.categoriaId, categorias.id))
      .where(where)
      .orderBy(desc(chamados.criadoEm))
      .limit(limit)
      .offset(offset);

    const comentarioNaoVistoPorChamado = new Set<string>();
    const envolvidosPorChamado = new Map<
      string,
      { id: string; name: string | null; email: string; fotoPerfil: string | null }[]
    >();

    if (lista.length > 0) {
      const ids = lista.map((c) => c.id);

      const naoVistos = await db
        .select({ chamadoId: chamadoComentarios.chamadoId })
        .from(chamadoComentarios)
        .innerJoin(chamados, eq(chamadoComentarios.chamadoId, chamados.id))
        .leftJoin(
          chamadoLeituraComentarios,
          and(eq(chamadoLeituraComentarios.chamadoId, chamados.id), eq(chamadoLeituraComentarios.usuarioId, user.id)),
        )
        .where(
          and(
            inArray(chamados.id, ids),
            ne(chamadoComentarios.autorId, user.id),
            gt(chamadoComentarios.criadoEm, sql`COALESCE(${chamadoLeituraComentarios.vistoAte}, ${chamados.criadoEm})`),
          ),
        );
      for (const row of naoVistos) {
        comentarioNaoVistoPorChamado.add(row.chamadoId);
      }

      const acomps = await db
        .select({
          chamadoId: chamadoAcompanhadores.chamadoId,
          usuarioId: users.id,
        })
        .from(chamadoAcompanhadores)
        .innerJoin(users, eq(chamadoAcompanhadores.usuarioId, users.id))
        .where(inArray(chamadoAcompanhadores.chamadoId, ids));

      const userIdSet = new Set<string>();
      for (const c of lista) {
        userIdSet.add(c.criadorId);
        if (c.atribuidoA) userIdSet.add(c.atribuidoA);
      }
      for (const a of acomps) {
        userIdSet.add(a.usuarioId);
      }

      const userRows =
        userIdSet.size > 0
          ? await db
              .select({
                id: users.id,
                name: users.name,
                email: users.email,
                fotoPerfil: users.fotoPerfil,
              })
              .from(users)
              .where(inArray(users.id, [...userIdSet]))
          : [];

      const userById = new Map(userRows.map((u) => [u.id, u]));

      const acompsPorChamado = new Map<string, typeof acomps>();
      for (const a of acomps) {
        const list = acompsPorChamado.get(a.chamadoId) ?? [];
        list.push(a);
        acompsPorChamado.set(a.chamadoId, list);
      }

      for (const c of lista) {
        const seen = new Set<string>();
        const out: { id: string; name: string | null; email: string; fotoPerfil: string | null }[] = [];
        const pushId = (uid: string | null) => {
          if (!uid || seen.has(uid)) return;
          const u = userById.get(uid);
          if (!u) return;
          seen.add(uid);
          out.push({ id: u.id, name: u.name, email: u.email, fotoPerfil: u.fotoPerfil });
        };
        pushId(c.criadorId);
        pushId(c.atribuidoA!);
        for (const a of acompsPorChamado.get(c.id) ?? []) {
          pushId(a.usuarioId);
        }
        envolvidosPorChamado.set(c.id, out);
      }
    }

    return NextResponse.json({
      chamados: lista.map((c) => ({
        ...c,
        temComentarioNaoVisto: comentarioNaoVistoPorChamado.has(c.id),
        envolvidos: envolvidosPorChamado.get(c.id) ?? [],
      })),
    });
  } catch (err) {
    console.error("Chamados GET error:", err);
    return NextResponse.json({ error: "Erro ao listar chamados." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  try {
    const body = await request.json();
    const parsed = CreateChamadoSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos.", details: parsed.error.flatten() }, { status: 400 });
    }

    const [setor] = await db
      .select({ id: setores.id, gestorId: setores.gestorId })
      .from(setores)
      .where(eq(setores.id, parsed.data.setorId))
      .limit(1);
    if (!setor) {
      return NextResponse.json({ error: "Setor não encontrado." }, { status: 404 });
    }

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
    if (!cat.responsavelPadraoId) {
      return NextResponse.json(
        { error: "A categoria não possui técnico responsável padrão. Configure em Configurações → Categorias." },
        { status: 400 },
      );
    }

    const [chamado] = await db
      .insert(chamados)
      .values({
        titulo: parsed.data.titulo,
        descricao: parsed.data.descricao,
        prioridade: parsed.data.prioridade,
        setorId: parsed.data.setorId,
        categoriaId: parsed.data.categoriaId,
        criadorId: user.id,
        atribuidoA: cat.responsavelPadraoId,
      })
      .returning();

    const rawAcomp = parsed.data.acompanhadores ?? [];
    const acompIds = [...new Set(rawAcomp)].filter((uid) => uid !== user.id);

    if (acompIds.length > 0) {
      await db.insert(chamadoAcompanhadores).values(acompIds.map((uid) => ({ chamadoId: chamado.id, usuarioId: uid })));
      await criarNotificacoes(
        acompIds,
        "acompanhamento",
        `Você foi adicionado como acompanhador do chamado "${chamado.titulo}".`,
        chamado.id,
      );
    }

    const tiIds = await idsUsuariosTIAtivos();
    const avisarNovoChamado = new Set<string>(tiIds);
    if (setor.gestorId && !acompIds.includes(setor.gestorId)) {
      avisarNovoChamado.add(setor.gestorId);
    }
    avisarNovoChamado.delete(user.id);
    if (avisarNovoChamado.size > 0) {
      await criarNotificacoes(
        [...avisarNovoChamado],
        "acompanhamento",
        `Novo chamado nº ${chamado.numero} aberto: "${chamado.titulo}".`,
        chamado.id,
      );
    }

    return NextResponse.json({ chamado }, { status: 201 });
  } catch (err) {
    console.error("Chamados POST error:", err);
    return NextResponse.json({ error: "Erro ao criar chamado." }, { status: 500 });
  }
}
