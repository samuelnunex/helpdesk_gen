"use client";

import type { RefObject } from "react";
import { useCallback, useState } from "react";

import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { FileDown } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Falha ao ler imagem"));
    reader.readAsDataURL(blob);
  });
}

/**
 * Troca temporariamente `src` de `<img>` por data URL (fetch same-origin / CORS quando possível),
 * para o canvas não ficar “tainted” e o html2canvas não falhar em logos em `/uploads/...`.
 */
async function prepareImagesForHtml2Canvas(root: HTMLElement): Promise<() => void> {
  const imgs = Array.from(root.querySelectorAll("img")) as HTMLImageElement[];
  type Rollback = () => void;
  const rollbacks: Rollback[] = [];

  for (const img of imgs) {
    const raw = img.currentSrc || img.getAttribute("src") || "";
    if (!raw || raw.startsWith("data:") || raw.startsWith("blob:")) continue;

    let abs: string;
    try {
      abs = new URL(raw, window.location.href).href;
    } catch {
      continue;
    }

    const prevSrc = img.src;
    const prevCrossOrigin = img.crossOrigin;
    const prevVisibility = img.style.visibility;

    try {
      const res = await fetch(abs, { credentials: "include", mode: "cors" });
      if (!res.ok) throw new Error(String(res.status));
      const dataUrl = await blobToDataUrl(await res.blob());
      img.removeAttribute("crossorigin");
      img.src = dataUrl;
      await img.decode().catch(() => undefined);
      rollbacks.push(() => {
        img.src = prevSrc;
        if (prevCrossOrigin) img.crossOrigin = prevCrossOrigin;
        else img.removeAttribute("crossorigin");
        img.style.visibility = prevVisibility;
      });
    } catch {
      img.style.visibility = "hidden";
      rollbacks.push(() => {
        img.style.visibility = prevVisibility;
      });
    }
  }

  return () => {
    for (const rb of rollbacks.reverse()) rb();
  };
}

async function nodeToMultiPagePdf(el: HTMLElement, fileName: string): Promise<void> {
  const restoreImages = await prepareImagesForHtml2Canvas(el);
  try {
    const canvas = await html2canvas(el, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: null,
      scrollX: 0,
      scrollY: 0,
      windowWidth: el.scrollWidth,
      windowHeight: el.scrollHeight,
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position -= pageHeight;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    pdf.save(fileName);
  } finally {
    restoreImages();
  }
}

export function ExportarProcessoPdfButton({
  captureRef,
  numeroChamado,
}: {
  captureRef: RefObject<HTMLElement | null>;
  numeroChamado: string;
}) {
  const [loading, setLoading] = useState(false);

  const exportar = useCallback(async () => {
    const el = captureRef.current;
    if (!el) {
      toast.error("Não foi possível localizar o conteúdo para exportar.");
      return;
    }

    setLoading(true);
    try {
      await nodeToMultiPagePdf(el, `chamado-${numeroChamado}-processo.pdf`);
      toast.success("PDF gerado.");
    } catch {
      toast.error("Não foi possível gerar o PDF. Tente novamente ou verifique se há imagens bloqueadas por CORS.");
    } finally {
      setLoading(false);
    }
  }, [captureRef, numeroChamado]);

  return (
    <Button type="button" variant="outline" size="sm" className="shrink-0 gap-2" disabled={loading} onClick={exportar}>
      <FileDown className="size-4" />
      {loading ? "Gerando…" : "Exportar PDF"}
    </Button>
  );
}
