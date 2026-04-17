"use client";

import { useCallback, useEffect, useState } from "react";

import { format, formatDistance, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Clock, Paperclip, Pencil, Send, Trash2, User, X } from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ComentarioTiptapEditor } from "@/components/comentario-editor/comentario-tiptap-editor";
import { UsuarioBuscaCombobox } from "@/components/usuario-busca-combobox";
import { plainTextLengthComentario, sanitizeComentarioHtml } from "@/lib/html/sanitize-comentario-html";
import { useChamadosRealtimeStore } from "@/stores/chamados-realtime";

import { PrioridadeBadge } from "../../_components/PrioridadeBadge";
import { StatusBadge } from "../../_components/StatusBadge";

type Chamado = {
  id: string;
  numero: number;
  titulo: string;
  descricao: string;
  status: string;
  prioridade: string;
  criadoEm: string;
  atualizadoEm: string;
  fechadoEm: string | null;
  setor: { id: string; nome: string } | null;
  categoria: { id: string; nome: string } | null;
  criador: { id: string; name: string | null; fotoPerfil: string | null } | null;
  atribuido: { id: string; name: string | null; fotoPerfil: string | null } | null;
  acompanhadores: { id: string; name: string | null; fotoPerfil: string | null }[];
  comentarios: {
    id: string;
    conteudo: string;
    criadoEm: string;
    autorId: string;
    autorNome: string | null;
    autorFoto: string | null;
  }[];
  anexos: { id: string; nomeArquivo: string; url: string; tipo: string }[];
};

type UsuarioResumo = { id: string; name: string | null; email?: string };
type CategoriaLista = { id: string; nome: string; responsavelPadraoId: string | null; responsaveisIds?: string[] };

export function DetalhesChamado({
  chamadoId,
  userId,
  podeAlterarStatus,
  podeAtribuir,
}: {
  chamadoId: string;
  userId: string;
  podeAlterarStatus: boolean;
  podeAtribuir: boolean;
}) {
  const [chamado, setChamado] = useState<Chamado | null>(null);
  const [loading, setLoading] = useState(true);
  const [comentario, setComentario] = useState("");
  const [comentarioEditorMount, setComentarioEditorMount] = useState(0);
  const [enviando, setEnviando] = useState(false);
  const [anexoFiles, setAnexoFiles] = useState<File[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioResumo[]>([]);
  const [categorias, setCategorias] = useState<CategoriaLista[]>([]);
  const [usuariosAcompanhamento, setUsuariosAcompanhamento] = useState<UsuarioResumo[]>([]);
  const [selectAdicionarAcomp, setSelectAdicionarAcomp] = useState("");
  const [substituirAcompId, setSubstituirAcompId] = useState<string | null>(null);
  const [selectSubstituirNovo, setSelectSubstituirNovo] = useState("");
  const [acompanhadorActionLoading, setAcompanhadorActionLoading] = useState(false);

  const fetchChamado = useCallback(
    async (opts?: { marcarLeitura?: boolean }) => {
      const marcarLeitura = opts?.marcarLeitura !== false;
      const res = await fetch(`/api/chamados/${chamadoId}`);
      if (!res.ok) {
        setLoading(false);
        return;
      }
      const data = await res.json();
      setChamado(data.chamado);
      setLoading(false);
      if (marcarLeitura) {
        void fetch(`/api/chamados/${chamadoId}/leitura-comentarios`, { method: "POST" });
      }
    },
    [chamadoId],
  );

  const mutacaoTick = useChamadosRealtimeStore((s) => s.tick);
  const lastChamadoIds = useChamadosRealtimeStore((s) => s.lastChamadoIds);

  useEffect(() => {
    if (mutacaoTick === 0) return;
    if (!lastChamadoIds.includes(chamadoId)) return;
    void fetchChamado({ marcarLeitura: false });
  }, [mutacaoTick, lastChamadoIds, chamadoId, fetchChamado]);

  useEffect(() => {
    fetchChamado();
    if (podeAtribuir) {
      fetch("/api/admin/users")
        .then((r) => r.json())
        .then((d) => setUsuarios(d.users ?? []));
      fetch("/api/categorias")
        .then((r) => r.json())
        .then((d) => setCategorias(d.categorias ?? []));
    }
  }, [fetchChamado, podeAtribuir]);

  useEffect(() => {
    fetch("/api/users/para-acompanhamento")
      .then((r) => r.json())
      .then((d) => setUsuariosAcompanhamento(d.users ?? []));
  }, []);

  async function enviarComentario() {
    const limpo = sanitizeComentarioHtml(comentario);
    if (plainTextLengthComentario(limpo) < 1) return;
    if (plainTextLengthComentario(limpo) > 8000) {
      toast.error("Comentário demasiado longo (máx. 8000 caracteres de texto).");
      return;
    }
    setEnviando(true);
    try {
      const res = await fetch(`/api/chamados/${chamadoId}/comentarios`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conteudo: limpo }),
      });
      if (!res.ok) {
        toast.error("Erro ao enviar comentário.");
        return;
      }

      for (const file of anexoFiles) {
        const fd = new FormData();
        fd.append("file", file);
        await fetch(`/api/chamados/${chamadoId}/anexos`, { method: "POST", body: fd });
      }
      setAnexoFiles([]);

      setComentario("");
      setComentarioEditorMount((n) => n + 1);
      await fetchChamado();
      toast.success("Comentário enviado.");
    } finally {
      setEnviando(false);
    }
  }

  async function alterarStatus(status: string) {
    await fetch(`/api/chamados/${chamadoId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    toast.success("Status atualizado.");
    fetchChamado();
  }

  async function atribuirUsuario(uid: string) {
    const res = await fetch(`/api/chamados/${chamadoId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ atribuidoA: uid }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(data.error ?? "Erro ao atribuir.");
      return;
    }
    toast.success("Responsável atualizado.");
    fetchChamado();
  }

  async function alterarCategoria(categoriaId: string) {
    const res = await fetch(`/api/chamados/${chamadoId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoriaId }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(data.error ?? "Erro ao alterar categoria.");
      return;
    }
    toast.success("Categoria atualizada. Um responsável da nova categoria foi aplicado quando aplicável.");
    fetchChamado();
  }

  async function adicionarAcompanhador() {
    if (!selectAdicionarAcomp) return;
    setAcompanhadorActionLoading(true);
    try {
      const res = await fetch(`/api/chamados/${chamadoId}/acompanhadores`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuarioId: selectAdicionarAcomp }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Erro ao adicionar acompanhador.");
        return;
      }
      toast.success("Acompanhador adicionado.");
      setSelectAdicionarAcomp("");
      await fetchChamado();
    } finally {
      setAcompanhadorActionLoading(false);
    }
  }

  async function excluirAcompanhador(usuarioId: string) {
    setAcompanhadorActionLoading(true);
    try {
      const res = await fetch(`/api/chamados/${chamadoId}/acompanhadores/${usuarioId}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Erro ao remover acompanhador.");
        return;
      }
      toast.success("Acompanhador removido.");
      await fetchChamado();
    } finally {
      setAcompanhadorActionLoading(false);
    }
  }

  async function confirmarSubstituirAcompanhador() {
    if (!substituirAcompId || !selectSubstituirNovo || substituirAcompId === selectSubstituirNovo) return;
    setAcompanhadorActionLoading(true);
    try {
      const del = await fetch(`/api/chamados/${chamadoId}/acompanhadores/${substituirAcompId}`, {
        method: "DELETE",
      });
      const delData = await del.json().catch(() => ({}));
      if (!del.ok) {
        toast.error(delData.error ?? "Erro ao remover acompanhador.");
        return;
      }
      const post = await fetch(`/api/chamados/${chamadoId}/acompanhadores`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuarioId: selectSubstituirNovo }),
      });
      const postData = await post.json().catch(() => ({}));
      if (!post.ok) {
        toast.error(postData.error ?? "Erro ao adicionar novo acompanhador.");
        await fetchChamado();
        return;
      }
      toast.success("Acompanhador atualizado.");
      setSubstituirAcompId(null);
      setSelectSubstituirNovo("");
      await fetchChamado();
    } finally {
      setAcompanhadorActionLoading(false);
    }
  }

  if (loading) return <Skeleton className="h-96 w-full" />;
  if (!chamado) return <p className="text-muted-foreground">Chamado não encontrado ou sem permissão.</p>;

  const podeGerenciarAcompanhadores = podeAtribuir || chamado.criador?.id === userId;
  const categoriasComResponsavel = categorias.filter(
    (c) => (c.responsaveisIds?.length ?? 0) > 0 || !!c.responsavelPadraoId,
  );
  const idsAcompAtuais = new Set(chamado.acompanhadores.map((a) => a.id));
  const opcoesAdicionarAcompanhante = usuariosAcompanhamento.filter(
    (u) => !idsAcompAtuais.has(u.id) && u.id !== chamado.criador?.id,
  );
  const opcoesSubstituirAcompanhante = usuariosAcompanhamento.filter(
    (u) => u.id !== chamado.criador?.id && (!idsAcompAtuais.has(u.id) || u.id === substituirAcompId),
  );

  function podeRemoverAcompanhadorUi(acompUserId: string) {
    return acompUserId === userId || podeGerenciarAcompanhadores;
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {/* Main content */}
      <div className="flex flex-col gap-4 lg:col-span-2">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="mb-1 font-mono text-muted-foreground text-xs">#{chamado.numero}</p>
                <CardTitle className="text-xl">{chamado.titulo}</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <PrioridadeBadge prioridade={chamado.prioridade} />
                <StatusBadge status={chamado.status} />
              </div>
            </div>
            <p className="text-muted-foreground text-sm">
              Aberto em {format(new Date(chamado.criadoEm), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </p>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm">{chamado.descricao}</p>

            {chamado.anexos.length > 0 && (
              <div className="mt-4">
                <p className="mb-2 flex items-center gap-1 font-medium text-sm">
                  <Paperclip className="h-4 w-4" /> Anexos
                </p>
                <div className="flex flex-wrap gap-2">
                  {chamado.anexos
                    .filter((a) => !a.url.includes("comentario"))
                    .map((a) => (
                      <a
                        key={a.id}
                        href={a.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 text-xs underline hover:text-blue-800"
                      >
                        {a.nomeArquivo}
                      </a>
                    ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Comentários */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Comentários ({chamado.comentarios.length})</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {chamado.comentarios.map((c) => (
              <div key={c.id} className="flex gap-3">
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarImage src={c.autorFoto ?? undefined} />
                  <AvatarFallback>
                    {c.autorNome?.charAt(0).toUpperCase() ?? <User className="h-4 w-4" />}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="font-medium text-sm">{c.autorNome ?? "Usuário"}</span>
                    <span className="text-muted-foreground text-xs">
                      {format(new Date(c.criadoEm), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                  {/* HTML sanitizado no servidor; re-sanitizar na UI por defesa. */}
                  <div
                    className="comentario-html rounded-md bg-muted/50 p-3 text-sm [&_a]:text-primary [&_blockquote]:border-l [&_blockquote]:border-border [&_blockquote]:pl-3 [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_h2]:text-base [&_h2]:font-semibold [&_h3]:text-sm [&_h3]:font-semibold [&_li]:my-0.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-1 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-muted [&_pre]:p-2 [&_ul]:list-disc [&_ul]:pl-5"
                    dangerouslySetInnerHTML={{ __html: sanitizeComentarioHtml(c.conteudo) }}
                  />
                </div>
              </div>
            ))}

            <Separator />

            <div className="flex flex-col gap-2">
              <ComentarioTiptapEditor
                key={comentarioEditorMount}
                onChange={setComentario}
                disabled={enviando}
                placeholder="Adicione um comentário…"
              />
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="flex cursor-pointer items-center gap-1 text-muted-foreground text-xs transition-colors hover:text-foreground">
                    <Paperclip className="h-3.5 w-3.5" />
                    Anexar arquivos
                    <input
                      type="file"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        const novos = Array.from(e.target.files ?? []);
                        setAnexoFiles((prev) => {
                          const nomes = new Set(prev.map((f) => f.name));
                          return [...prev, ...novos.filter((f) => !nomes.has(f.name))];
                        });
                        e.target.value = "";
                      }}
                    />
                  </label>
                  <Button
                    onClick={enviarComentario}
                    disabled={enviando || plainTextLengthComentario(sanitizeComentarioHtml(comentario)) < 1}
                    size="sm"
                  >
                    <Send className="mr-2 h-4 w-4" />
                    {enviando ? "Enviando..." : "Enviar"}
                  </Button>
                </div>
                {anexoFiles.length > 0 && (
                  <ul className="space-y-1">
                    {anexoFiles.map((f, i) => (
                      <li
                        key={`${f.name}-${f.size}-${f.lastModified}`}
                        className="flex items-center justify-between gap-2 rounded bg-muted/50 px-2 py-1 text-xs"
                      >
                        <span className="truncate text-muted-foreground">{f.name}</span>
                        <button
                          type="button"
                          onClick={() => setAnexoFiles((prev) => prev.filter((_, j) => j !== i))}
                          className="shrink-0 text-muted-foreground hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sidebar */}
      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Detalhes</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 text-sm">
            <div>
              <p className="mb-1 font-medium text-muted-foreground text-xs uppercase tracking-wider">Setor</p>
              <Badge variant="outline">{chamado.setor?.nome ?? "—"}</Badge>
            </div>

            <div>
              <p className="mb-1 font-medium text-muted-foreground text-xs uppercase tracking-wider">Categoria</p>
              {podeAtribuir && categoriasComResponsavel.length > 0 && chamado.categoria ? (
                <Select value={chamado.categoria.id} onValueChange={alterarCategoria}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {categoriasComResponsavel.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Badge variant="secondary" className="font-normal">
                  {chamado.categoria?.nome ?? "—"}
                </Badge>
              )}
            </div>

            <div className="flex flex-col gap-2 rounded-md bg-muted/40 p-3 text-xs">
              {chamado.fechadoEm ? (
                <div className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <div>
                    <span className="text-muted-foreground">SLA: </span>
                    <span className="font-medium">
                      {formatDistance(new Date(chamado.criadoEm), new Date(chamado.fechadoEm), {
                        locale: ptBR,
                      })}
                    </span>
                    <span className="block text-muted-foreground">
                      Encerrado em{" "}
                      {format(new Date(chamado.fechadoEm), "dd/MM/yyyy 'às' HH:mm", {
                        locale: ptBR,
                      })}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <div>
                    <span className="text-muted-foreground">Tempo em aberto: </span>
                    <span className="font-medium">
                      {formatDistanceToNow(new Date(chamado.criadoEm), { locale: ptBR })}
                    </span>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Clock className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0" />
                <div>
                  <span className="text-muted-foreground">Última interação: </span>
                  <span className="font-medium">
                    {chamado.comentarios.length > 0
                      ? formatDistanceToNow(new Date(chamado.comentarios[chamado.comentarios.length - 1].criadoEm), {
                          locale: ptBR,
                          addSuffix: true,
                        })
                      : formatDistanceToNow(new Date(chamado.atualizadoEm), {
                          locale: ptBR,
                          addSuffix: true,
                        })}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <p className="mb-1 font-medium text-muted-foreground text-xs uppercase tracking-wider">Criado por</p>
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={chamado.criador?.fotoPerfil ?? undefined} />
                  <AvatarFallback className="text-xs">{chamado.criador?.name?.charAt(0) ?? "?"}</AvatarFallback>
                </Avatar>
                <span>{chamado.criador?.name ?? "Usuário"}</span>
              </div>
            </div>

            <div>
              <p className="mb-1 font-medium text-muted-foreground text-xs uppercase tracking-wider">Responsável</p>
              {podeAtribuir && chamado.atribuido ? (
                <UsuarioBuscaCombobox
                  usuarios={usuarios}
                  value={chamado.atribuido.id}
                  onValueChange={atribuirUsuario}
                  placeholder="Buscar técnico…"
                  searchPlaceholder="Nome ou e-mail…"
                  triggerClassName="h-8 text-xs"
                />
              ) : (
                <span>{chamado.atribuido?.name ?? "—"}</span>
              )}
            </div>

            {podeAlterarStatus && (
              <div>
                <p className="mb-1 font-medium text-muted-foreground text-xs uppercase tracking-wider">
                  Alterar Status
                </p>
                <Select value={chamado.status} onValueChange={alterarStatus}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="aberto">Aberto</SelectItem>
                    <SelectItem value="em_progresso">Em Progresso</SelectItem>
                    <SelectItem value="fechado">Fechado</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <p className="mb-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">
                Acompanhadores ({chamado.acompanhadores.length})
              </p>
              <ul className="space-y-2">
                {chamado.acompanhadores.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-2 rounded-md border px-2 py-1.5">
                    <div className="flex min-w-0 items-center gap-2">
                      <Avatar className="h-7 w-7 shrink-0">
                        <AvatarImage src={a.fotoPerfil ?? undefined} />
                        <AvatarFallback className="text-xs">{a.name?.charAt(0) ?? "?"}</AvatarFallback>
                      </Avatar>
                      <span className="truncate text-xs">{a.name ?? "Usuário"}</span>
                    </div>
                    <div className="flex shrink-0 items-center gap-0.5">
                      {podeGerenciarAcompanhadores && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          disabled={acompanhadorActionLoading}
                          title="Substituir acompanhador"
                          onClick={() => {
                            setSubstituirAcompId(a.id);
                            setSelectSubstituirNovo("");
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {podeRemoverAcompanhadorUi(a.id) && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          disabled={acompanhadorActionLoading}
                          title="Remover acompanhador"
                          onClick={() => excluirAcompanhador(a.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </li>
                ))}
                {chamado.acompanhadores.length === 0 && (
                  <li className="py-1 text-muted-foreground text-xs">Nenhum acompanhador</li>
                )}
              </ul>

              {opcoesAdicionarAcompanhante.length > 0 && (
                <div className="mt-3 flex flex-col gap-2">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Adicionar</p>
                  <div className="flex gap-2">
                    <Select value={selectAdicionarAcomp || undefined} onValueChange={setSelectAdicionarAcomp}>
                      <SelectTrigger className="h-8 min-w-0 flex-1 text-xs">
                        <SelectValue placeholder="Escolha um usuário…" />
                      </SelectTrigger>
                      <SelectContent>
                        {opcoesAdicionarAcompanhante.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.name ?? u.email ?? u.id}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="h-8 shrink-0"
                      disabled={!selectAdicionarAcomp || acompanhadorActionLoading}
                      onClick={adicionarAcompanhador}
                    >
                      Adicionar
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <Dialog
              open={substituirAcompId !== null}
              onOpenChange={(open) => {
                if (!open) {
                  setSubstituirAcompId(null);
                  setSelectSubstituirNovo("");
                }
              }}
            >
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Substituir acompanhador</DialogTitle>
                </DialogHeader>
                <p className="text-muted-foreground text-sm">Escolha outro usuário no lugar do acompanhador atual.</p>
                <Select value={selectSubstituirNovo || undefined} onValueChange={setSelectSubstituirNovo}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Novo acompanhador…" />
                  </SelectTrigger>
                  <SelectContent>
                    {opcoesSubstituirAcompanhante
                      .filter((u) => u.id !== substituirAcompId)
                      .map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.name ?? u.email ?? u.id}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <DialogFooter className="gap-2 sm:gap-0">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setSubstituirAcompId(null);
                      setSelectSubstituirNovo("");
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    disabled={
                      !selectSubstituirNovo || selectSubstituirNovo === substituirAcompId || acompanhadorActionLoading
                    }
                    onClick={confirmarSubstituirAcompanhador}
                  >
                    Salvar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
