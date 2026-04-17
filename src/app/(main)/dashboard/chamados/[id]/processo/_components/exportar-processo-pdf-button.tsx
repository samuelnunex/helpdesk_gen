"use client";

import type { RefObject } from "react";
import { useCallback, useState } from "react";

import { jsPDF } from "jspdf";
import { FileDown } from "lucide-react";
import { domToCanvas } from "modern-screenshot";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

function mensagemErroPdf(err: unknown): string {
  if (err instanceof Error && err.message.trim()) {
    return err.message.trim();
  }
  return "Não foi possível gerar o PDF. Tente novamente.";
}

async function nodeToMultiPagePdf(el: HTMLElement, fileName: string): Promise<void> {
  const canvas = await domToCanvas(el, {
    scale: 2,
    backgroundColor: null,
    fetch: {
      requestInit: {
        credentials: "include",
        mode: "cors",
      },
    },
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
    } catch (err) {
      toast.error(mensagemErroPdf(err));
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
