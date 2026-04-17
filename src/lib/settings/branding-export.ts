import type { AppSettingsValues } from "@/lib/settings/types";

/** Resolve URL absoluta para o browser; se `siteBase` vazio, devolve o path (`/uploads/...`) para o cliente completar com `origin`. */
export function absoluteUrlForExport(pathOrUrl: string | null | undefined, siteBase: string): string | null {
  const v = pathOrUrl?.trim();
  if (!v) return null;
  if (v.startsWith("http://") || v.startsWith("https://")) return v;
  if (v.startsWith("/")) {
    const base = siteBase.replace(/\/$/, "");
    return base ? `${base}${v}` : v;
  }
  return null;
}

/** Logomarca para PDF/cabeçalho (fundo claro): mesma ordem que e-mails. */
export function logoUrlForPdfHeader(settings: AppSettingsValues, siteBase: string): string | null {
  const ordem = [
    settings.logo_sidebar_url,
    settings.logo_auth_url,
    settings.logo_sidebar_url_dark,
    settings.logo_auth_url_dark,
  ];
  for (const c of ordem) {
    const u = absoluteUrlForExport(c, siteBase);
    if (u) return u;
  }
  return null;
}
