import nodemailer from "nodemailer";

import { getSmtpConfig } from "./smtp-config";

let cachedTransport: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  const cfg = getSmtpConfig();
  if (!cfg) {
    cachedTransport = null;
    return null;
  }
  if (!cachedTransport) {
    cachedTransport = nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.secure,
      ...(cfg.user && cfg.pass ? { auth: { user: cfg.user, pass: cfg.pass } } : {}),
    });
  }
  return cachedTransport;
}

export type SendMailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export async function sendMail(input: SendMailInput): Promise<{ ok: true } | { ok: false; error: string }> {
  const cfg = getSmtpConfig();
  const transport = getTransporter();
  if (!cfg || !transport) {
    return { ok: false, error: "SMTP não configurado ou desativado." };
  }

  try {
    await transport.sendMail({
      from: cfg.from,
      to: input.to,
      subject: input.subject,
      text: input.text,
      ...(input.html ? { html: input.html } : {}),
    });
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[email] Falha ao enviar:", msg);
    return { ok: false, error: msg };
  }
}
