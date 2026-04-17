import { create } from "zustand";

export type Notificacao = {
  id: string;
  tipo: string;
  mensagem: string;
  lida: boolean;
  chamadoId: string | null;
  criadoEm: string;
};

type NotificacoesStore = {
  notificacoes: Notificacao[];
  naoLidasCount: number;
  setNotificacoes: (notificacoes: Notificacao[], naoLidasCount: number) => void;
  addNotificacoes: (novas: Notificacao[]) => void;
  marcarComoLida: (id: string) => void;
  marcarTodasLidas: () => void;
};

export const useNotificacoesStore = create<NotificacoesStore>((set) => ({
  notificacoes: [],
  naoLidasCount: 0,

  setNotificacoes: (notificacoes, naoLidasCount) => set({ notificacoes, naoLidasCount }),

  addNotificacoes: (novas) =>
    set((state) => {
      const existingIds = new Set(state.notificacoes.map((n) => n.id));
      const newOnly = novas.filter((n) => !existingIds.has(n.id));
      if (newOnly.length === 0) return state;
      return {
        notificacoes: [...newOnly, ...state.notificacoes].slice(0, 50),
        naoLidasCount: state.naoLidasCount + newOnly.filter((n) => !n.lida).length,
      };
    }),

  marcarComoLida: (id) =>
    set((state) => ({
      notificacoes: state.notificacoes.map((n) =>
        n.id === id ? { ...n, lida: true } : n,
      ),
      naoLidasCount: Math.max(0, state.naoLidasCount - 1),
    })),

  marcarTodasLidas: () =>
    set((state) => ({
      notificacoes: state.notificacoes.map((n) => ({ ...n, lida: true })),
      naoLidasCount: 0,
    })),
}));
