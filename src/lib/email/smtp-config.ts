/**
 * Configuração SMTP a partir de variáveis de ambiente.
 * Com NOTIFICATION_EMAIL_ENABLED=false ou sem SMTP_HOST, o envio fica desligado.
 */

export type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  pass?: string;
  from: string;
};

/** Retorna opções para nodemailer ou null se SMTP não estiver configurado / desativado. */
export function getSmtpConfig(): SmtpConfig | null {
  if (process.env.NOTIFICATION_EMAIL_ENABLED?.trim().toLowerCase() === "false") {
    return null;
  }

  const host = process.env.SMTP_HOST?.trim();
  if (!host) return null;

  const portRaw = process.env.SMTP_PORT ?? "587";
  const port = Number.parseInt(portRaw, 10);
  const portFinal = Number.isFinite(port) ? port : 587;

  const secureEnv = process.env.SMTP_SECURE?.trim().toLowerCase();
  const secure =
    secureEnv === "true" || secureEnv === "1"
      ? true
      : secureEnv === "false" || secureEnv === "0"
        ? false
        : portFinal === 465;

  const user = process.env.SMTP_USER?.trim() || undefined;
  const pass = process.env.SMTP_PASS?.trim() || undefined;
  const from = process.env.SMTP_FROM?.trim() || user || "noreply@localhost";

  return {
    host,
    port: portFinal,
    secure,
    user,
    pass,
    from,
  };
}
