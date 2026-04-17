import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import { labelTipoChamado } from "@/lib/chamados/tipo-chamado";

export type TipoNotificacaoChamado = "atribuicao" | "comentario" | "status_alterado" | "acompanhamento" | "mencao";

export type ChamadoResumoEmail = {
  id: string;
  numero: number;
  titulo: string;
  status: string;
  prioridade: string;
  tipoChamado: string | null;
  criadoEm: Date;
  setorNome: string | null;
  categoriaNome: string | null;
};

export type BrandingEmail = {
  appName: string;
  /** URL absoluta da logomarca (https ou base + /uploads/...). */
  logoUrl: string | null;
};

const TIPO_ETIQUETA: Record<
  TipoNotificacaoChamado,
  { titulo: string; badgeBg: string; badgeText: string; accent: string }
> = {
  atribuicao: { titulo: "Atribuição", badgeBg: "#eff6ff", badgeText: "#1d4ed8", accent: "#2563eb" },
  comentario: { titulo: "Comentário", badgeBg: "#f5f3ff", badgeText: "#5b21b6", accent: "#7c3aed" },
  status_alterado: { titulo: "Status alterado", badgeBg: "#fefce8", badgeText: "#a16207", accent: "#ca8a04" },
  acompanhamento: { titulo: "Acompanhamento", badgeBg: "#f0fdfa", badgeText: "#0f766e", accent: "#0d9488" },
  mencao: { titulo: "Menção", badgeBg: "#fdf2f8", badgeText: "#9d174d", accent: "#db2777" },
};

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

function escapeHtml(s: string): string {
  return s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function labelStatus(v: string): string {
  return STATUS_LABEL[v] ?? v;
}

function labelPrioridade(v: string): string {
  return PRIORIDADE_LABEL[v] ?? v;
}

function formatarDataPt(d: Date): string {
  return format(d, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
}

/** Texto padrão informativo (rodapé legal / ajuda). */
export const TEXTO_PADRAO_NOTIFICACAO_CHAMADO = [
  "Este e-mail foi enviado automaticamente pelo sistema de chamados.",
  "Você recebe porque as notificações por e-mail estão ativadas na sua conta.",
  "Para alterar preferências, acesse o painel: Conta / perfil ou configurações de notificação.",
  "Não responda a este e-mail; use os comentários do chamado no painel para interagir com a equipe.",
].join(" ");

export function buildNotificacaoChamadoEmail(params: {
  branding: BrandingEmail;
  tipo: TipoNotificacaoChamado;
  mensagem: string;
  destinatarioNome: string | null;
  chamado: ChamadoResumoEmail | null;
  linkAbsoluto: string;
  linkRelativo: string;
}): { html: string; text: string } {
  const { branding, tipo, mensagem, destinatarioNome, chamado, linkAbsoluto, linkRelativo } = params;
  const meta = TIPO_ETIQUETA[tipo] ?? {
    titulo: "Notificação",
    badgeBg: "#f4f4f5",
    badgeText: "#3f3f46",
    accent: "#52525b",
  };
  const saudacao = destinatarioNome?.trim() ? `Olá, ${destinatarioNome.trim()}` : "Olá";
  const linkLinha =
    linkAbsoluto !== ""
      ? `\nAbrir chamado: ${linkAbsoluto}`
      : linkRelativo !== ""
        ? `\nAbrir chamado no painel: ${linkRelativo}`
        : "";

  const blocoChamadoTexto = chamado
    ? [
        "",
        "--- Chamado ---",
        `Nº: ${chamado.numero}`,
        `Assunto: ${chamado.titulo}`,
        `Status: ${labelStatus(chamado.status)}`,
        `Prioridade: ${labelPrioridade(chamado.prioridade)}`,
        chamado.tipoChamado ? `Tipo: ${labelTipoChamado(chamado.tipoChamado)}` : "",
        chamado.setorNome ? `Setor: ${chamado.setorNome}` : "",
        chamado.categoriaNome ? `Categoria: ${chamado.categoriaNome}` : "",
        `Aberto em: ${formatarDataPt(chamado.criadoEm)}`,
      ]
        .filter(Boolean)
        .join("\n")
    : "";

  const text = [
    `${branding.appName} — ${meta.titulo}`,
    "",
    saudacao,
    "",
    mensagem.trim(),
    blocoChamadoTexto,
    linkLinha,
    "",
    "---",
    TEXTO_PADRAO_NOTIFICACAO_CHAMADO,
  ]
    .filter((l) => l !== "")
    .join("\n");

  const logoBlock =
    branding.logoUrl != null
      ? `<img src="${escapeHtml(branding.logoUrl)}" alt="${escapeHtml(branding.appName)}" width="200" style="max-width:200px;max-height:48px;height:auto;display:block;border:0;outline:none;text-decoration:none;" />`
      : `<div style="font-size:22px;font-weight:700;color:#18181b;letter-spacing:-0.02em;line-height:1.2;">${escapeHtml(branding.appName)}</div>`;

  const headerSub =
    branding.logoUrl != null
      ? `<p style="margin:10px 0 0;font-size:12px;color:#71717a;font-weight:500;">${escapeHtml(branding.appName)}</p>`
      : "";

  const chamadoCard = chamado
    ? `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0 0;border:1px solid #e4e4e7;border-radius:10px;overflow:hidden;background:#fafafa;">
  <tr>
    <td style="padding:14px 18px;background:#f4f4f5;border-bottom:1px solid #e4e4e7;font-size:11px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:#71717a;">Dados do chamado</td>
  </tr>
  <tr>
    <td style="padding:18px 20px;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;">
      <p style="margin:0 0 8px;font-size:13px;color:#71717a;">Chamado nº <strong style="color:#18181b;">#${chamado.numero}</strong></p>
      <p style="margin:0 0 14px;font-size:16px;font-weight:600;color:#18181b;line-height:1.35;">${escapeHtml(chamado.titulo)}</p>
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="font-size:13px;color:#3f3f46;">
        <tr><td style="padding:4px 0;width:38%;color:#71717a;">Status</td><td style="padding:4px 0;"><strong>${escapeHtml(labelStatus(chamado.status))}</strong></td></tr>
        <tr><td style="padding:4px 0;color:#71717a;">Prioridade</td><td style="padding:4px 0;"><strong>${escapeHtml(labelPrioridade(chamado.prioridade))}</strong></td></tr>
        ${chamado.tipoChamado ? `<tr><td style="padding:4px 0;color:#71717a;">Tipo</td><td style="padding:4px 0;">${escapeHtml(labelTipoChamado(chamado.tipoChamado))}</td></tr>` : ""}
        ${chamado.setorNome ? `<tr><td style="padding:4px 0;color:#71717a;">Setor</td><td style="padding:4px 0;">${escapeHtml(chamado.setorNome)}</td></tr>` : ""}
        ${chamado.categoriaNome ? `<tr><td style="padding:4px 0;color:#71717a;">Categoria</td><td style="padding:4px 0;">${escapeHtml(chamado.categoriaNome)}</td></tr>` : ""}
        <tr><td style="padding:4px 0;color:#71717a;">Aberto em</td><td style="padding:4px 0;">${escapeHtml(formatarDataPt(chamado.criadoEm))}</td></tr>
      </table>
    </td>
  </tr>
</table>`
    : "";

  const ctaHref = linkAbsoluto || (linkRelativo ? linkRelativo : "");
  const ctaButton =
    ctaHref && linkAbsoluto
      ? `<a href="${escapeHtml(linkAbsoluto)}" style="display:inline-block;margin-top:22px;padding:12px 22px;background:#18181b;color:#fafafa !important;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;">Abrir chamado no painel</a>`
      : ctaHref
        ? `<p style="margin-top:20px;font-size:13px;color:#52525b;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;">Acesse o chamado em: <code style="background:#f4f4f5;padding:2px 6px;border-radius:4px;">${escapeHtml(linkRelativo)}</code><br/><span style="font-size:12px;color:#a1a1aa;">Defina <strong>APP_BASE_URL</strong> no ambiente para um botão com link direto.</span></p>`
        : "";

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(meta.titulo)} — ${escapeHtml(branding.appName)}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:28px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e4e4e7;box-shadow:0 1px 2px rgba(0,0,0,0.04);">
          <tr>
            <td style="padding:22px 26px 18px;border-bottom:1px solid #f4f4f5;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td valign="middle" style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;">
                    ${logoBlock}
                    ${headerSub}
                  </td>
                  <td valign="middle" align="right" style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;">
                    <span style="display:inline-block;padding:6px 12px;border-radius:9999px;font-size:11px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;background:${meta.badgeBg};color:${meta.badgeText};border:1px solid rgba(0,0,0,0.06);">${escapeHtml(meta.titulo)}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:22px 26px 8px;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;">
              <p style="margin:0 0 14px;font-size:15px;color:#18181b;">${escapeHtml(saudacao)},</p>
              <div style="font-size:15px;line-height:1.55;color:#3f3f46;border-left:3px solid ${meta.accent};padding:12px 0 12px 16px;background:#fafafa;border-radius:0 8px 8px 0;">
                ${escapeHtml(mensagem).replaceAll("\n", "<br/>")}
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:0 26px 24px;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;">
              ${chamadoCard}
              <div style="text-align:left;">${ctaButton}</div>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 26px;background:#fafafa;border-top:1px solid #f4f4f5;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;">
              <p style="margin:0;font-size:11px;line-height:1.6;color:#a1a1aa;">${escapeHtml(TEXTO_PADRAO_NOTIFICACAO_CHAMADO)}</p>
              <p style="margin:12px 0 0;font-size:11px;color:#d4d4d8;">${escapeHtml(branding.appName)}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { html, text };
}
