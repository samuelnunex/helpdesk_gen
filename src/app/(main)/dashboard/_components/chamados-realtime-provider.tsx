"use client";

import type { ReactNode } from "react";

import { useChamadosRealtimeStream } from "@/hooks/use-chamados-realtime-stream";

export function ChamadosRealtimeProvider({ children }: { children: ReactNode }) {
  useChamadosRealtimeStream();
  return <>{children}</>;
}
