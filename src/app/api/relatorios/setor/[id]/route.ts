import { NextResponse } from "next/server";

import { and, count, eq, isNotNull } from "drizzle-orm";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { db } from "@/lib/db";
import { chamados, setores } from "@/lib/db/schema";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const { id: setorId } = await params;

  const [setor] = await db
    .select({ id: setores.id, nome: setores.nome, gestorId: setores.gestorId })
    .from(setores)
    .where(eq(setores.id, setorId))
    .limit(1);
  if (!setor) return NextResponse.json({ error: "Setor não encontrado." }, { status: 404 });

  const podeVer =
    ["admin", "diretor"].includes(user.tipoConta) ||
    (user.tipoConta === "gestor_setor" && setor.gestorId === user.id);

  if (!podeVer) {
    return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  }

  try {
    const [totalAbertos] = await db
      .select({ total: count() })
      .from(chamados)
      .where(and(eq(chamados.setorId, setorId), eq(chamados.status, "aberto")));

    const [totalEmProgresso] = await db
      .select({ total: count() })
      .from(chamados)
      .where(and(eq(chamados.setorId, setorId), eq(chamados.status, "em_progresso")));

    const [totalFechados] = await db
      .select({ total: count() })
      .from(chamados)
      .where(and(eq(chamados.setorId, setorId), eq(chamados.status, "fechado")));

    const [totalCancelados] = await db
      .select({ total: count() })
      .from(chamados)
      .where(and(eq(chamados.setorId, setorId), eq(chamados.status, "cancelado")));

    const [totalBaixa] = await db.select({ total: count() }).from(chamados).where(and(eq(chamados.setorId, setorId), eq(chamados.prioridade, "baixa")));
    const [totalMedia] = await db.select({ total: count() }).from(chamados).where(and(eq(chamados.setorId, setorId), eq(chamados.prioridade, "media")));
    const [totalAlta] = await db.select({ total: count() }).from(chamados).where(and(eq(chamados.setorId, setorId), eq(chamados.prioridade, "alta")));
    const [totalUrgente] = await db.select({ total: count() }).from(chamados).where(and(eq(chamados.setorId, setorId), eq(chamados.prioridade, "urgente")));

    const chamadosFechados = await db
      .select({ criadoEm: chamados.criadoEm, fechadoEm: chamados.fechadoEm })
      .from(chamados)
      .where(and(eq(chamados.setorId, setorId), isNotNull(chamados.fechadoEm)));

    let tempoMedioMs = 0;
    if (chamadosFechados.length > 0) {
      const soma = chamadosFechados.reduce((acc, c) => {
        return acc + (c.fechadoEm!.getTime() - c.criadoEm.getTime());
      }, 0);
      tempoMedioMs = soma / chamadosFechados.length;
    }

    return NextResponse.json({
      setor,
      porStatus: {
        aberto: totalAbertos.total,
        em_progresso: totalEmProgresso.total,
        fechado: totalFechados.total,
        cancelado: totalCancelados.total,
      },
      porPrioridade: {
        baixa: totalBaixa.total,
        media: totalMedia.total,
        alta: totalAlta.total,
        urgente: totalUrgente.total,
      },
      tempoMedioResolucaoMs: tempoMedioMs,
      tempoMedioResolucaoHoras: Math.round(tempoMedioMs / (1000 * 60 * 60) * 10) / 10,
    });
  } catch (err) {
    console.error("Relatórios setor error:", err);
    return NextResponse.json({ error: "Erro ao gerar relatório." }, { status: 500 });
  }
}
