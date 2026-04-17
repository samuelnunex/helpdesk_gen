"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Prioridade = "baixa" | "media" | "alta" | "urgente";

const configMap: Record<Prioridade, { label: string; className: string }> = {
  baixa: { label: "Baixa", className: "bg-green-100 text-green-800 border-green-200" },
  media: { label: "Média", className: "bg-blue-100 text-blue-800 border-blue-200" },
  alta: { label: "Alta", className: "bg-orange-100 text-orange-800 border-orange-200" },
  urgente: { label: "Urgente", className: "bg-red-100 text-red-800 border-red-200" },
};

export function PrioridadeBadge({ prioridade }: { prioridade: string }) {
  const config = configMap[prioridade as Prioridade] ?? { label: prioridade, className: "" };
  return (
    <Badge variant="outline" className={cn(config.className)}>
      {config.label}
    </Badge>
  );
}
