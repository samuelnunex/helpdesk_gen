"use client";

import { Badge } from "@/components/ui/badge";

type Status = "aberto" | "em_progresso" | "fechado" | "cancelado";

const configMap: Record<Status, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  aberto: { label: "Aberto", variant: "default" },
  em_progresso: { label: "Em Progresso", variant: "secondary" },
  fechado: { label: "Fechado", variant: "outline" },
  cancelado: { label: "Cancelado", variant: "destructive" },
};

export function StatusBadge({ status }: { status: string }) {
  const config = configMap[status as Status] ?? { label: status, variant: "outline" as const };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
