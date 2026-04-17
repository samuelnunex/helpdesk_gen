import { NextResponse } from "next/server";

import { count, eq, isNotNull } from "drizzle-orm";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { canVerRelatoriosGerais } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { chamados, setores } from "@/lib/db/schema";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  if (!canVerRelatoriosGerais(user)) {
    return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  }

  try {
    const [totalAbertos] = await db
      .select({ total: count() })
      .from(chamados)
      .where(eq(chamados.status, "aberto"));

    const [totalEmProgresso] = await db
      .select({ total: count() })
      .from(chamados)
      .where(eq(chamados.status, "em_progresso"));

    const [totalFechados] = await db
      .select({ total: count() })
      .from(chamados)
      .where(eq(chamados.status, "fechado"));

    const [totalCancelados] = await db
      .select({ total: count() })
      .from(chamados)
      .where(eq(chamados.status, "cancelado"));

    const [totalBaixa] = await db.select({ total: count() }).from(chamados).where(eq(chamados.prioridade, "baixa"));
    const [totalMedia] = await db.select({ total: count() }).from(chamados).where(eq(chamados.prioridade, "media"));
    const [totalAlta] = await db.select({ total: count() }).from(chamados).where(eq(chamados.prioridade, "alta"));
    const [totalUrgente] = await db.select({ total: count() }).from(chamados).where(eq(chamados.prioridade, "urgente"));

    const chamadosFechados = await db
      .select({ criadoEm: chamados.criadoEm, fechadoEm: chamados.fechadoEm })
      .from(chamados)
      .where(isNotNull(chamados.fechadoEm));

    let tempoMedioMs = 0;
    if (chamadosFechados.length > 0) {
      const soma = chamadosFechados.reduce((acc, c) => {
        return acc + (c.fechadoEm!.getTime() - c.criadoEm.getTime());
      }, 0);
      tempoMedioMs = soma / chamadosFechados.length;
    }

    const porSetor = await db
      .select({ setorId: chamados.setorId, setorNome: setores.nome, total: count() })
      .from(chamados)
      .leftJoin(setores, eq(chamados.setorId, setores.id))
      .groupBy(chamados.setorId, setores.nome);

    return NextResponse.json({
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
      porSetor,
    });
  } catch (err) {
    console.error("Relatórios geral error:", err);
    return NextResponse.json({ error: "Erro ao gerar relatório." }, { status: 500 });
  }
}
