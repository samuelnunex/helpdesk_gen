"use client";

import type { ReactNode } from "react";
import { useMemo, useRef } from "react";

import Link from "next/link";

import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";

import { ExportarProcessoPdfButton } from "./exportar-processo-pdf-button";

function resolveLogoSrcForImg(logoUrl: string | null): string | null {
  if (!logoUrl?.trim()) return null;
  if (logoUrl.startsWith("http://") || logoUrl.startsWith("https://")) return logoUrl;
  if (typeof window === "undefined") return null;
  if (logoUrl.startsWith("/")) return `${window.location.origin}${logoUrl}`;
  return `${window.location.origin}/${logoUrl.replace(/^\//, "")}`;
}

/** Não usar crossOrigin em URLs da mesma origem: o servidor de estáticos costuma não mandar ACAO e a imagem falha ao carregar. */
function logoNeedsCrossOrigin(absoluteSrc: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return new URL(absoluteSrc).origin !== window.location.origin;
  } catch {
    return false;
  }
}

export function ProcessoChamadoShell({
  children,
  chamadoId,
  numeroChamado,
  pdfBranding,
}: {
  children: ReactNode;
  chamadoId: string;
  numeroChamado: string;
  pdfBranding: { appName: string; logoUrl: string | null };
}) {
  const captureRef = useRef<HTMLDivElement>(null);
  const logoSrc = useMemo(() => resolveLogoSrcForImg(pdfBranding.logoUrl), [pdfBranding.logoUrl]);
  const logoCrossOrigin = useMemo(
    () => (logoSrc && logoNeedsCrossOrigin(logoSrc) ? ("anonymous" as const) : undefined),
    [logoSrc],
  );

  return (
    <div className="flex min-w-0 max-w-full flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" size="sm" className="shrink-0 gap-1 px-2" asChild>
          <Link href={`/dashboard/chamados/${chamadoId}`}>
            <ArrowLeft className="size-4" />
            Voltar ao chamado
          </Link>
        </Button>
        <ExportarProcessoPdfButton captureRef={captureRef} numeroChamado={numeroChamado} />
      </div>

      <div
        ref={captureRef}
        id="processo-capture-root"
        className="box-border flex min-w-0 max-w-4xl flex-col gap-6 rounded-xl border border-border bg-background p-6 shadow-sm md:p-8"
      >
        <header className="flex flex-wrap items-center gap-3 border-border border-b pb-4">
          {logoSrc ? (
            <>
              {/* biome-ignore lint/performance/noImgElement: rasterização no PDF (html2canvas) com crossOrigin */}
              <img
                src={logoSrc}
                alt=""
                className="max-h-10 max-w-[160px] object-contain"
                crossOrigin={logoCrossOrigin}
                width={160}
                height={40}
              />
            </>
          ) : null}
          <span className="font-semibold text-foreground text-lg tracking-tight">{pdfBranding.appName}</span>
        </header>
        {children}
      </div>
    </div>
  );
}
