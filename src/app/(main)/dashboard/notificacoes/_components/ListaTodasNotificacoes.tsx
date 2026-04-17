"use client";

import { useCallback, useEffect, useState } from "react";

import Link from "next/link";

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useNotificacoesStore } from "@/stores/notificacoes";

const TIPO_LABEL: Record<string, string> = {
  comentario: "Comentário",
  atribuicao: "Atribuição",
  status_alterado: "Status",
  acompanhamento: "Acompanhamento",
  mencao: "Menção",
};

type Notificacao = {
  id: string;
  tipo: string;
  mensagem: string;
  lida: boolean;
  chamadoId: string | null;
  criadoEm: string;
};

const PAGE_SIZE = 50;

export function ListaTodasNotificacoes() {
  const marcarComoLidaStore = useNotificacoesStore((s) => s.marcarComoLida);
  const marcarTodasLidasStore = useNotificacoesStore((s) => s.marcarTodasLidas);
  const [itens, setItens] = useState<Notificacao[]>([]);
  const [total, setTotal] = useState(0);
  const [naoLidas, setNaoLidas] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMais, setLoadingMais] = useState(false);
  const [marcandoTodas, setMarcandoTodas] = useState(false);

  const carregar = useCallback(async (offset: number, append: boolean) => {
    const params = new URLSearchParams();
    params.set("limit", String(PAGE_SIZE));
    params.set("offset", String(offset));
    const res = await fetch(`/api/notificacoes?${params}`);
    const data = await res.json();
    if (!res.ok) return;
    const novas: Notificacao[] = data.notificacoes ?? [];
    setTotal(typeof data.total === "number" ? data.total : 0);
    setNaoLidas(typeof data.naoLidasCount === "number" ? data.naoLidasCount : 0);
    if (append) {
      setItens((prev) => [...prev, ...novas]);
    } else {
      setItens(novas);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      await carregar(0, false);
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [carregar]);

  async function carregarMais() {
    setLoadingMais(true);
    try {
      await carregar(itens.length, true);
    } finally {
      setLoadingMais(false);
    }
  }

  async function marcarLida(id: string) {
    const eraNaoLida = itens.some((n) => n.id === id && !n.lida);
    marcarComoLidaStore(id);
    setItens((prev) => prev.map((n) => (n.id === id ? { ...n, lida: true } : n)));
    if (eraNaoLida) setNaoLidas((c) => Math.max(0, c - 1));
    await fetch(`/api/notificacoes/${id}`, { method: "PATCH" });
  }

  async function marcarTodasLidas() {
    setMarcandoTodas(true);
    try {
      marcarTodasLidasStore();
      await fetch("/api/notificacoes/marcar-todas-lidas", { method: "POST" });
      await carregar(0, false);
    } finally {
      setMarcandoTodas(false);
    }
  }

  const temMais = itens.length < total;

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between space-y-0">
        <div>
          <CardTitle>Notificações</CardTitle>
          <CardDescription>
            {total === 0
              ? "Nenhuma notificação registrada."
              : `Exibindo ${itens.length} de ${total} notificação${total === 1 ? "" : "s"}.`}
          </CardDescription>
        </div>
        {naoLidas > 0 ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0"
            disabled={marcandoTodas}
            onClick={() => void marcarTodasLidas()}
          >
            {marcandoTodas ? "Salvando…" : "Marcar todas como lidas"}
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-0">
        {loading ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Carregando…</p>
        ) : itens.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Nenhuma notificação.</p>
        ) : (
          <ul className="divide-y rounded-md border">
            {itens.map((n) => (
              <li key={n.id} className="px-4 py-3 hover:bg-muted/40 transition-colors">
                {n.chamadoId ? (
                  <Link
                    href={`/dashboard/chamados/${n.chamadoId}`}
                    className="block"
                    onClick={() => {
                      if (!n.lida) void marcarLida(n.id);
                    }}
                  >
                    <div className="flex items-start gap-3">
                      {!n.lida ? (
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" aria-hidden />
                      ) : (
                        <span className="mt-1.5 w-2 shrink-0" aria-hidden />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm leading-snug">{n.mensagem}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(n.criadoEm), "dd/MM/yyyy HH:mm", { locale: ptBR })} ·{" "}
                          <span>{TIPO_LABEL[n.tipo] ?? n.tipo.replaceAll("_", " ")}</span>
                        </p>
                      </div>
                    </div>
                  </Link>
                ) : (
                  <button
                    type="button"
                    className="flex w-full items-start gap-3 text-left"
                    onClick={() => {
                      if (!n.lida) void marcarLida(n.id);
                    }}
                  >
                    {!n.lida ? (
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" aria-hidden />
                    ) : (
                      <span className="mt-1.5 w-2 shrink-0" aria-hidden />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm leading-snug">{n.mensagem}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(n.criadoEm), "dd/MM/yyyy HH:mm", { locale: ptBR })} ·{" "}
                        <span>{TIPO_LABEL[n.tipo] ?? n.tipo.replaceAll("_", " ")}</span>
                      </p>
                    </div>
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}

        {temMais && !loading ? (
          <>
            <Separator className="my-4" />
            <Button type="button" variant="outline" className="w-full" disabled={loadingMais} onClick={carregarMais}>
              {loadingMais ? "Carregando…" : "Carregar mais"}
            </Button>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
