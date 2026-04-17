import { create } from "zustand";

type ChamadosRealtimeState = {
  tick: number;
  lastChamadoIds: string[];
  notifyMutacao: (chamadoIds: string[]) => void;
};

export const useChamadosRealtimeStore = create<ChamadosRealtimeState>((set) => ({
  tick: 0,
  lastChamadoIds: [],
  notifyMutacao: (chamadoIds) =>
    set((s) => ({
      tick: s.tick + 1,
      lastChamadoIds: chamadoIds,
    })),
}));
