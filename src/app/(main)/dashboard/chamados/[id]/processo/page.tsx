import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { APP_CONFIG } from "@/config/app-config";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { canVerProcessoCompletoChamado } from "@/lib/auth/permissions";
import { getChamadoSeUsuarioTemAcesso } from "@/lib/chamados/acesso-chamado";
import { getProcessoChamadoPayload } from "@/lib/chamados/processo-chamado";
import { getAppSettings } from "@/lib/settings/app-settings";
import { logoUrlForPdfHeader } from "@/lib/settings/branding-export";

import { ProcessoChamadoCorpo } from "./_components/processo-chamado-corpo";
import { ProcessoChamadoShell } from "./_components/processo-chamado-shell";

export const metadata = { title: "Processo do chamado" };

export default async function ProcessoChamadoPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login?from=/dashboard/chamados");

  if (!canVerProcessoCompletoChamado(user)) {
    redirect("/dashboard/chamados");
  }

  const { id } = await params;
  const chamado = await getChamadoSeUsuarioTemAcesso(id, user);
  if (!chamado) {
    redirect("/dashboard/chamados");
  }

  const payload = await getProcessoChamadoPayload(id);
  if (!payload) {
    redirect("/dashboard/chamados");
  }

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const proto = h.get("x-forwarded-proto") ?? "http";
  const siteBase = host ? `${proto}://${host}` : "";
  const settings = await getAppSettings();
  const pdfBranding = {
    appName: settings.app_name?.trim() || APP_CONFIG.name,
    logoUrl: logoUrlForPdfHeader(settings, siteBase),
  };

  return (
    <ProcessoChamadoShell chamadoId={id} numeroChamado={String(payload.chamado.numero)} pdfBranding={pdfBranding}>
      <ProcessoChamadoCorpo data={payload} />
    </ProcessoChamadoShell>
  );
}
