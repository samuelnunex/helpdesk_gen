"use client";

import { Badge } from "@/components/ui/badge";
import { type ChamadoSlaCampos, slaResumoVisual } from "@/lib/sla/status-ui";

export function SlaStatusBadge({ chamado }: { chamado: ChamadoSlaCampos }) {
  const { kind, label, title } = slaResumoVisual(chamado);

  if (kind === "sem") {
    return (
      <span className="text-muted-foreground text-xs tabular-nums" title={title}>
        —
      </span>
    );
  }

  const variant = kind === "estourado" ? "destructive" : kind === "proximo" ? "secondary" : "outline";
  const className =
    kind === "proximo"
      ? "border-amber-500/60 bg-amber-500/15 text-amber-950 dark:text-amber-100 font-normal text-xs"
      : kind === "ok"
        ? "border-emerald-600/40 bg-emerald-600/10 text-emerald-950 dark:text-emerald-100 font-normal text-xs"
        : "text-xs font-normal";

  return (
    <Badge variant={variant} className={className} title={title}>
      {label}
    </Badge>
  );
}
