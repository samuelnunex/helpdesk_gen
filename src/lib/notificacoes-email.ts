import { and, eq, inArray } from "drizzle-orm";

import { APP_CONFIG } from "@/config/app-config";
import { db } from "@/lib/db";
import { categorias, chamados, setores, users } from "@/lib/db/schema";
import { sendMail } from "@/lib/email/mailer";
import { getSmtpConfig } from "@/lib/email/smtp-config";
import {
  buildNotificacaoChamadoEmail,
  type ChamadoResumoEmail,
  type TipoNotificacaoChamado,
} from "@/lib/email/templates/notificacao-chamado";
import { getAppSettings } from "@/lib/settings/app-settings";
import type { AppSettingsValues } from "@/lib/settings/types";

type TipoNotificacao = TipoNotificacaoChamado;

const ASSUNTO_POR_TIPO: Record<TipoNotificacao, string> = {
  atribuicao: "Atribuição de chamado",
  comentario: "Novo comentário no chamado",
  status_alterado: "Status do chamado alterado",
  acompanhamento: "Atualização no chamado",
  mencao: "Menção no chamado",
};

function baseUrl(): string {
  const raw = process.env.APP_BASE_URL?.trim() || process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (raw) return raw.replace(/\/$/, "");
  return "";
}

function resolvePublicUrl(pathOrUrl: string | undefined | null, base: string): string | null {
  const v = pathOrUrl?.trim();
  if (!v) return null;
  if (v.startsWith("http://") || v.startsWith("https://")) return v;
  if (v.startsWith("/")) {
    if (!base) return null;
    return `${base}${v}`;
  }
  return null;
}

/** Logomarca para e-mail (fundo claro): tenta URLs de login e da barra lateral. */
function logoUrlParaEmail(settings: AppSettingsValues, base: string): string | null {
  const ordem = [
    settings.logo_auth_url,
    settings.logo_sidebar_url,
    settings.logo_auth_url_dark,
    settings.logo_sidebar_url_dark,
  ];
  for (const c of ordem) {
    const u = resolvePublicUrl(c, base);
    if (u) return u;
  }
  return null;
}

async function carregarBranding(): Promise<{ appName: string; logoUrl: string | null }> {
  const base = baseUrl();
  try {
    const s = await getAppSettings();
    return {
      appName: s.app_name?.trim() || APP_CONFIG.name,
      logoUrl: logoUrlParaEmail(s, base),
    };
  } catch {
    return { appName: APP_CONFIG.name, logoUrl: null };
  }
}

async function carregarChamadoParaEmail(chamadoId: string): Promise<ChamadoResumoEmail | null> {
  const [row] = await db
    .select({
      id: chamados.id,
      numero: chamados.numero,
      titulo: chamados.titulo,
      status: chamados.status,
      prioridade: chamados.prioridade,
      criadoEm: chamados.criadoEm,
      setorNome: setores.nome,
      categoriaNome: categorias.nome,
    })
    .from(chamados)
    .leftJoin(setores, eq(chamados.setorId, setores.id))
    .leftJoin(categorias, eq(chamados.categoriaId, categorias.id))
    .where(eq(chamados.id, chamadoId))
    .limit(1);
  if (!row) return null;
  return {
    id: row.id,
    numero: row.numero,
    titulo: row.titulo,
    status: row.status,
    prioridade: row.prioridade,
    criadoEm: row.criadoEm,
    setorNome: row.setorNome,
    categoriaNome: row.categoriaNome,
  };
}

/**
 * Envia e-mail (SMTP) para usuários que têm notificações por e-mail ativas.
 * Não lança exceção: falhas são apenas logadas para não quebrar a API.
 */
export async function dispararEmailNotificacoes(
  usuarioIds: string[],
  tipo: TipoNotificacao,
  mensagem: string,
  chamadoId?: string,
): Promise<void> {
  if (!getSmtpConfig()) return;

  const ids = [...new Set(usuarioIds)].filter(Boolean);
  if (ids.length === 0) return;

  try {
    const destinatarios = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
      })
      .from(users)
      .where(and(inArray(users.id, ids), eq(users.notifEmail, true)));

    if (destinatarios.length === 0) return;

    const urlBase = baseUrl();
    const linkAbsoluto = chamadoId && urlBase ? `${urlBase}/dashboard/chamados/${chamadoId}` : "";
    const linkRelativo = chamadoId ? `/dashboard/chamados/${chamadoId}` : "";

    const [branding, chamado] = await Promise.all([
      carregarBranding(),
      chamadoId ? carregarChamadoParaEmail(chamadoId) : Promise.resolve(null),
    ]);

    const numeroChamado = chamado?.numero ?? null;
    const assuntoBase = ASSUNTO_POR_TIPO[tipo] ?? "Notificação";
    const prefixo = process.env.NOTIFICATION_EMAIL_SUBJECT_PREFIX?.trim() || "[Helpdesk]";
    const assunto =
      numeroChamado != null ? `${prefixo} ${assuntoBase} — chamado nº ${numeroChamado}` : `${prefixo} ${assuntoBase}`;

    await Promise.allSettled(
      destinatarios.map(async (u) => {
        const { html, text } = buildNotificacaoChamadoEmail({
          branding,
          tipo,
          mensagem,
          destinatarioNome: u.name,
          chamado,
          linkAbsoluto,
          linkRelativo,
        });
        const r = await sendMail({
          to: u.email,
          subject: assunto,
          text,
          html,
        });
        if (!r.ok) {
          console.error(`[email] Falha para ${u.email}:`, r.error);
        }
      }),
    );
  } catch (e) {
    console.error("[email] Erro ao preparar envio de notificações:", e);
  }
}
