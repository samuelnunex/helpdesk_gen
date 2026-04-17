"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { format, formatDistance } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Bell, MessageCircle, Search, User, X } from "lucide-react";
import { toast } from "sonner";
import { useShallow } from "zustand/react/shallow";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useChamadosRealtimeStore } from "@/stores/chamados-realtime";
import { useNotificacoesStore } from "@/stores/notificacoes";

import { PrioridadeBadge } from "./PrioridadeBadge";
import { StatusBadge } from "./StatusBadge";

type EnvolvidoLista = { id: string; name: string | null; email?: string; fotoPerfil: string | null };

type SetorOption = { id: string; nome: string };

type Chamado = {
  id: string;
  numero: number;
  titulo: string;
  status: string;
  prioridade: string;
  setorNome: string | null;
  categoriaId: string;
  categoriaNome: string | null;
  criadorId: string;
  atribuidoA: string;
  criadoEm: string;
  atualizadoEm: string;
  fechadoEm: string | null;
  temComentarioNaoVisto?: boolean;
  envolvidos?: EnvolvidoLista[];
};

const STATUS_OPTIONS = [
  { value: "aberto", label: "Aberto" },
  { value: "em_progresso", label: "Em Progresso" },
  { value: "fechado", label: "Fechado" },
  { value: "cancelado", label: "Cancelado" },
];

const CAN_ALTER_STATUS = ["admin", "gestor_setor", "diretor", "ti", "desenvolvedor"];

const MAX_AVATARES_LISTA = 5;

function formatDuracao(chamado: Chamado): string {
  const inicio = new Date(chamado.criadoEm);
  const fim = chamado.fechadoEm ? new Date(chamado.fechadoEm) : new Date();
  return formatDistance(inicio, fim, { locale: ptBR, addSuffix: false });
}

/** Duração desde a criação até agora (chamados ainda abertos). */
function textoAbertoHa(chamado: Chamado): string {
  return formatDistance(new Date(chamado.criadoEm), new Date(), { locale: ptBR, addSuffix: false });
}

function formatDataHoraCriacao(criadoEm: string): string {
  return format(new Date(criadoEm), "dd/MM/yyyy HH:mm", { locale: ptBR });
}

function rotuloEnvolvido(p: EnvolvidoLista) {
  const n = p.name?.trim();
  if (n) return n;
  if (p.email?.trim()) return p.email;
  return "Usuário";
}

function rotuloRequerente(chamado: Chamado): string | null {
  const p = chamado.envolvidos?.find((e) => e.id === chamado.criadorId);
  if (!p) return null;
  return rotuloEnvolvido(p);
}

function rotuloTecnicoResponsavel(chamado: Chamado): string | null {
  const p = chamado.envolvidos?.find((e) => e.id === chamado.atribuidoA);
  if (!p) return null;
  return rotuloEnvolvido(p);
}

function AvataresEnvolvidos({ pessoas }: { pessoas: EnvolvidoLista[] }) {
  if (pessoas.length === 0) {
    return <span className="text-muted-foreground text-xs">—</span>;
  }
  const visiveis = pessoas.slice(0, MAX_AVATARES_LISTA);
  const restante = pessoas.length - visiveis.length;
  const ocultos = restante > 0 ? pessoas.slice(MAX_AVATARES_LISTA) : [];
  const tituloMais = ocultos.map(rotuloEnvolvido).join(", ");
  return (
    <div className="flex items-center justify-end sm:justify-start">
      <div className="flex -space-x-2">
        {visiveis.map((p) => (
          <Avatar key={p.id} className="h-7 w-7 border-2 border-background text-xs" title={rotuloEnvolvido(p)}>
            <AvatarImage src={p.fotoPerfil ?? undefined} alt="" />
            <AvatarFallback>{p.name?.charAt(0).toUpperCase() ?? <User className="h-3 w-3" />}</AvatarFallback>
          </Avatar>
        ))}
        {restante > 0 ? (
          <div
            className="z-10 flex h-7 w-7 items-center justify-center rounded-full border-2 border-background bg-muted text-[10px] font-medium"
            title={tituloMais ? `Também: ${tituloMais}` : undefined}
          >
            +{restante}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function ListaChamados({ tipoConta }: { tipoConta: string }) {
  const router = useRouter();
  const pathname = usePathname();
  /** Atualizado pelo SSE do layout (sino); reflete notificações não lidas por chamado em tempo real. */
  const chamadosComNotificacaoNaoLida = useNotificacoesStore(
    useShallow((s) => {
      const ids = new Set<string>();
      for (const n of s.notificacoes) {
        if (!n.lida && n.chamadoId) ids.add(n.chamadoId);
      }
      return ids;
    }),
  );

  const mutacaoTick = useChamadosRealtimeStore((s) => s.tick);
  const prevMutacaoTick = useRef(0);

  const [chamados, setChamados] = useState<Chamado[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState<string>("todos");
  const [filtroPrioridade, setFiltroPrioridade] = useState<string>("todas");
  const [filtroSetor, setFiltroSetor] = useState<string>("todos");
  const [setores, setSetores] = useState<SetorOption[]>([]);
  const [buscaInput, setBuscaInput] = useState("");
  const [buscaFiltro, setBuscaFiltro] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const podeAlterarStatus = CAN_ALTER_STATUS.includes(tipoConta);

  const fetchChamados = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filtroStatus !== "todos") params.set("status", filtroStatus);
    if (filtroPrioridade !== "todas") params.set("prioridade", filtroPrioridade);
    if (filtroSetor !== "todos") params.set("setorId", filtroSetor);
    if (buscaFiltro) params.set("busca", buscaFiltro);

    const res = await fetch(`/api/chamados?${params}`);
    const data = await res.json();
    setChamados(data.chamados ?? []);
    setLoading(false);
  }, [filtroStatus, filtroPrioridade, filtroSetor, buscaFiltro]);

  function aplicarBusca() {
    const t = buscaInput.trim();
    if (t === "") {
      setBuscaFiltro(null);
      return;
    }
    if (t.length > 200) {
      toast.error("Busca muito longa (máximo 200 caracteres).");
      return;
    }
    setBuscaFiltro(t);
  }

  useEffect(() => {
    if (pathname !== "/dashboard/chamados") return;
    void (async () => {
      try {
        const res = await fetch("/api/setores");
        const data = await res.json();
        const lista = (data.setores ?? []) as { id: string; nome: string }[];
        lista.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
        setSetores(lista.map((s) => ({ id: s.id, nome: s.nome })));
      } catch {
        toast.error("Não foi possível carregar os setores.");
      }
    })();
  }, [pathname]);

  useEffect(() => {
    if (pathname === "/dashboard/chamados") {
      void fetchChamados();
    }
  }, [fetchChamados, pathname]);

  useEffect(() => {
    if (pathname !== "/dashboard/chamados") return;
    if (mutacaoTick === 0 || mutacaoTick === prevMutacaoTick.current) return;
    prevMutacaoTick.current = mutacaoTick;
    void fetchChamados();
  }, [mutacaoTick, fetchChamados, pathname]);

  async function alterarStatus(id: string, novoStatus: string) {
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/chamados/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: novoStatus }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Erro ao alterar status.");
        return;
      }
      setChamados((prev) =>
        prev.map((c) =>
          c.id === id
            ? {
                ...c,
                status: novoStatus,
                fechadoEm:
                  novoStatus === "fechado" || novoStatus === "cancelado" ? new Date().toISOString() : c.fechadoEm,
              }
            : c,
        ),
      );
      toast.success("Status atualizado.");
    } finally {
      setUpdatingId(null);
    }
  }

  const isClosed = (c: Chamado) => c.status === "fechado" || c.status === "cancelado";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex min-w-[200px] max-w-sm flex-1 flex-col gap-1.5">
          <label htmlFor="busca-chamado" className="text-muted-foreground text-xs font-medium">
            Buscar por nº ou assunto
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                id="busca-chamado"
                placeholder="Nº ou palavras do título…"
                autoComplete="off"
                value={buscaInput}
                onChange={(e) => setBuscaInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    aplicarBusca();
                  }
                }}
                className="pr-8"
              />
              {buscaInput ? (
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2 -translate-y-1/2 rounded-sm p-0.5"
                  onClick={() => {
                    setBuscaInput("");
                    setBuscaFiltro(null);
                  }}
                  aria-label="Limpar busca"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>
            <Button type="button" variant="secondary" size="icon" className="shrink-0" onClick={aplicarBusca}>
              <Search className="h-4 w-4" />
              <span className="sr-only">Buscar chamados</span>
            </Button>
          </div>
        </div>

        <Select value={filtroStatus} onValueChange={setFiltroStatus}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            <SelectItem value="aberto">Aberto</SelectItem>
            <SelectItem value="em_progresso">Em Progresso</SelectItem>
            <SelectItem value="fechado">Fechado</SelectItem>
            <SelectItem value="cancelado">Cancelado</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filtroPrioridade} onValueChange={setFiltroPrioridade}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Prioridade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as prioridades</SelectItem>
            <SelectItem value="baixa">Baixa</SelectItem>
            <SelectItem value="media">Média</SelectItem>
            <SelectItem value="alta">Alta</SelectItem>
            <SelectItem value="urgente">Urgente</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filtroSetor} onValueChange={setFiltroSetor}>
          <SelectTrigger className="w-[min(100%,14rem)] min-w-[11rem]">
            <SelectValue placeholder="Setor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os setores</SelectItem>
            {setores.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex flex-col gap-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-10 w-full rounded" />
          ))}
        </div>
      ) : chamados.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center border rounded-lg">
          <p className="text-muted-foreground text-sm">Nenhum chamado encontrado.</p>
          <Button asChild className="mt-4" variant="outline" size="sm">
            <Link href="/dashboard/chamados/novo">Abrir novo chamado</Link>
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-muted-foreground text-xs uppercase tracking-wide">
                <th className="w-12 px-3 py-2 text-left font-medium" title="Número do chamado">
                  Nº
                </th>
                <th className="px-3 py-2 text-left font-medium">Chamado</th>
                <th className="px-3 py-2 text-left font-medium hidden md:table-cell w-[140px]">Envolvidos</th>
                <th className="px-3 py-2 text-left font-medium hidden sm:table-cell">Setor</th>
                <th className="px-3 py-2 text-left font-medium hidden md:table-cell">Categoria</th>
                <th className="px-3 py-2 text-left font-medium">Prioridade</th>
                <th className="px-3 py-2 text-left font-medium">Status</th>
                <th className="px-3 py-2 text-left font-medium hidden lg:table-cell">Criação / duração</th>
                <th className="px-3 py-2 text-left font-medium hidden xl:table-cell">Técnico responsável</th>
                <th className="px-3 py-2 w-10 text-center" title="Novidades">
                  <span className="sr-only">Comentários ou notificações não lidas</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {chamados.map((chamado, idx) => {
                const requerente = rotuloRequerente(chamado);
                const tecnico = rotuloTecnicoResponsavel(chamado);
                const comentarioNaoLido = !!chamado.temComentarioNaoVisto;
                const notificacaoNaoLida = chamadosComNotificacaoNaoLida.has(chamado.id);
                const mostrarIndicador = comentarioNaoLido || notificacaoNaoLida;
                const tituloIndicador =
                  comentarioNaoLido && notificacaoNaoLida
                    ? "Há comentários que você ainda não viu e notificações não lidas sobre este chamado."
                    : comentarioNaoLido
                      ? "Há comentários que você ainda não viu."
                      : "Há notificação não lida sobre este chamado.";
                const hrefChamado = `/dashboard/chamados/${chamado.id}`;
                return (
                  <tr
                    key={chamado.id}
                    className={`border-b last:border-0 cursor-pointer hover:bg-muted/30 transition-colors ${idx % 2 === 0 ? "" : "bg-muted/10"}`}
                    onClick={() => router.push(hrefChamado)}
                  >
                    <td className="whitespace-nowrap px-3 py-2">
                      <span
                        className="inline-flex items-center rounded-md border border-primary/35 bg-primary/12 px-2 py-0.5 font-mono text-sm font-semibold text-primary tabular-nums shadow-sm dark:bg-primary/20"
                        title={`Chamado nº ${chamado.numero}`}
                      >
                        #{chamado.numero}
                      </span>
                    </td>
                    <td className="px-3 py-2 max-w-[200px]">
                      <span className="font-medium line-clamp-1 block" title={chamado.titulo}>
                        {chamado.titulo}
                      </span>
                      {requerente ? (
                        <span
                          className="text-muted-foreground mt-0.5 block text-xs line-clamp-1"
                          title={`Requerente: ${requerente}`}
                        >
                          Requerente: {requerente}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 hidden md:table-cell">
                      <AvataresEnvolvidos pessoas={chamado.envolvidos ?? []} />
                    </td>
                    <td className="px-3 py-2 hidden sm:table-cell">
                      {chamado.setorNome ? (
                        <Badge variant="outline" className="text-xs whitespace-nowrap">
                          {chamado.setorNome}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 hidden md:table-cell">
                      {chamado.categoriaNome ? (
                        <Badge variant="secondary" className="text-xs whitespace-nowrap font-normal">
                          {chamado.categoriaNome}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <PrioridadeBadge prioridade={chamado.prioridade} />
                    </td>
                    <td
                      className="px-3 py-2"
                      onClick={podeAlterarStatus ? (e) => e.stopPropagation() : undefined}
                      onKeyDown={podeAlterarStatus ? (e) => e.stopPropagation() : undefined}
                    >
                      {podeAlterarStatus ? (
                        <Select
                          value={chamado.status}
                          onValueChange={(v) => alterarStatus(chamado.id, v)}
                          disabled={updatingId === chamado.id}
                        >
                          <SelectTrigger className="h-7 text-xs w-36 px-2">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {STATUS_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value} className="text-xs">
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <StatusBadge status={chamado.status} />
                      )}
                    </td>
                    <td className="px-3 py-2 hidden lg:table-cell">
                      <div className="flex flex-col gap-0.5">
                        <span
                          className="text-muted-foreground text-[11px] leading-tight tabular-nums"
                          title="Data e hora em que o chamado foi criado"
                        >
                          {formatDataHoraCriacao(chamado.criadoEm)}
                        </span>
                        {isClosed(chamado) ? (
                          <span
                            className="text-muted-foreground text-xs leading-tight whitespace-nowrap"
                            title="SLA — tempo até encerramento"
                          >
                            <span className="mr-1">SLA:</span>
                            {formatDuracao(chamado)}
                          </span>
                        ) : (
                          <Badge
                            variant="secondary"
                            className="w-fit font-normal text-xs leading-tight whitespace-nowrap"
                            title="Tempo em aberto"
                          >
                            Aberto há {textoAbertoHa(chamado)}
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-xs hidden xl:table-cell">
                      {tecnico ? (
                        <span className="text-foreground line-clamp-2" title={tecnico}>
                          {tecnico}
                        </span>
                      ) : (
                        <span className="text-muted-foreground whitespace-nowrap">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {mostrarIndicador ? (
                        <span
                          className={`inline-flex ${comentarioNaoLido ? "text-blue-600 dark:text-blue-400" : "text-amber-600 dark:text-amber-500"}`}
                          title={tituloIndicador}
                        >
                          {comentarioNaoLido ? (
                            <MessageCircle className="h-4 w-4 fill-current" aria-hidden />
                          ) : (
                            <Bell className="h-4 w-4" aria-hidden />
                          )}
                          <span className="sr-only">
                            {comentarioNaoLido ? "Comentários não lidos" : "Notificação não lida"}
                          </span>
                        </span>
                      ) : (
                        <span className="inline-block h-4 w-4" aria-hidden />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
