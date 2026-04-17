"use client";

import { useCallback, useEffect, useState } from "react";

import { Pencil, Plus } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UsuariosMultiCombobox } from "@/components/usuarios-multi-combobox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";

type CategoriaAdmin = {
  id: string;
  nome: string;
  ativo: boolean;
  responsavelPadraoId: string | null;
  responsaveisIds?: string[];
  responsaveis?: { id: string; name: string | null; email: string }[];
};

type UsuarioResumo = { id: string; name: string | null; email: string };

export function CategoriasSettings() {
  const [categorias, setCategorias] = useState<CategoriaAdmin[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioResumo[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [novoNome, setNovoNome] = useState("");
  const [novoRespIds, setNovoRespIds] = useState<string[]>([]);
  const [savingCreate, setSavingCreate] = useState(false);

  const [editRow, setEditRow] = useState<CategoriaAdmin | null>(null);
  const [editNome, setEditNome] = useState("");
  const [editRespIds, setEditRespIds] = useState<string[]>([]);
  const [editAtivo, setEditAtivo] = useState(true);
  const [savingEdit, setSavingEdit] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rCat, rUsers] = await Promise.all([fetch("/api/admin/categorias"), fetch("/api/admin/users")]);
      const jCat = await rCat.json();
      const jUsers = await rUsers.json();
      if (!rCat.ok) throw new Error(jCat.error ?? "Erro ao carregar categorias.");
      if (!rUsers.ok) throw new Error(jUsers.error ?? "Erro ao carregar usuários.");
      setCategorias(jCat.categorias ?? []);
      setUsuarios(jUsers.users ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao carregar.");
      setCategorias([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function criar() {
    const nome = novoNome.trim();
    if (!nome || novoRespIds.length === 0) {
      toast.error("Preencha o nome e selecione ao menos um responsável.");
      return;
    }
    setSavingCreate(true);
    try {
      const res = await fetch("/api/admin/categorias", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, responsaveisIds: novoRespIds }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Erro ao criar.");
        return;
      }
      toast.success("Categoria criada.");
      setCreateOpen(false);
      setNovoNome("");
      setNovoRespIds([]);
      await load();
    } finally {
      setSavingCreate(false);
    }
  }

  function abrirEditar(c: CategoriaAdmin) {
    setEditRow(c);
    setEditNome(c.nome);
    setEditRespIds(c.responsaveisIds ?? (c.responsavelPadraoId ? [c.responsavelPadraoId] : []));
    setEditAtivo(c.ativo);
  }

  async function salvarEdicao() {
    if (!editRow) return;
    const nome = editNome.trim();
    if (!nome || editRespIds.length === 0) {
      toast.error("Preencha o nome e selecione ao menos um responsável.");
      return;
    }
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/admin/categorias/${editRow.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, responsaveisIds: editRespIds, ativo: editAtivo }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Erro ao salvar.");
        return;
      }
      toast.success("Categoria atualizada.");
      setEditRow(null);
      await load();
    } finally {
      setSavingEdit(false);
    }
  }

  if (loading) {
    return <p className="text-muted-foreground text-sm">Carregando categorias…</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-semibold text-lg tracking-tight">Categorias de chamado</h2>
          <p className="text-muted-foreground text-sm">
            Cada categoria define um ou mais técnicos responsáveis ao abrir ou reclassificar chamados.
          </p>
        </div>
        <Button type="button" size="sm" className="shrink-0 gap-1.5" onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" />
          Nova categoria
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="font-medium text-muted-foreground">Nome</TableHead>
              <TableHead className="font-medium text-muted-foreground">Responsáveis</TableHead>
              <TableHead className="font-medium text-muted-foreground w-24">Ativa</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {categorias.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground text-sm">
                  Nenhuma categoria cadastrada.
                </TableCell>
              </TableRow>
            ) : (
              categorias.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.nome}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {c.responsaveis && c.responsaveis.length > 0
                      ? c.responsaveis
                          .map((r) => r.name ?? r.email)
                          .filter(Boolean)
                          .slice(0, 3)
                          .join(", ") + (c.responsaveis.length > 3 ? ` +${c.responsaveis.length - 3}` : "")
                      : "—"}
                  </TableCell>
                  <TableCell>
                    {c.ativo ? (
                      <Badge variant="secondary" className="text-xs">
                        Sim
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs text-muted-foreground">
                        Não
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button type="button" variant="ghost" size="icon" className="size-8" onClick={() => abrirEditar(c)}>
                      <Pencil className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nova categoria</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cat-novo-nome">Nome</Label>
              <Input
                id="cat-novo-nome"
                placeholder="Ex.: SAP B1, Automações…"
                value={novoNome}
                onChange={(e) => setNovoNome(e.target.value)}
              />
            </div>
            <div className="space-y-2">
                <Label>Responsáveis</Label>
                <UsuariosMultiCombobox
                usuarios={usuarios}
                  values={novoRespIds}
                  onValuesChange={setNovoRespIds}
                  placeholder="Selecionar técnicos…"
                searchPlaceholder="Nome ou e-mail…"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" disabled={savingCreate} onClick={criar}>
              {savingCreate ? "Salvando…" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editRow} onOpenChange={(open) => !open && setEditRow(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar categoria</DialogTitle>
          </DialogHeader>
          {editRow && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cat-edit-nome">Nome</Label>
                <Input id="cat-edit-nome" value={editNome} onChange={(e) => setEditNome(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Responsáveis</Label>
                <UsuariosMultiCombobox
                  usuarios={usuarios}
                  values={editRespIds}
                  onValuesChange={setEditRespIds}
                  placeholder="Selecionar técnicos…"
                  searchPlaceholder="Nome ou e-mail…"
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <Label htmlFor="cat-ativa">Categoria ativa</Label>
                  <p className="text-muted-foreground text-xs">Inativas não aparecem ao abrir chamados.</p>
                </div>
                <Switch id="cat-ativa" checked={editAtivo} onCheckedChange={setEditAtivo} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditRow(null)}>
              Cancelar
            </Button>
            <Button type="button" disabled={savingEdit} onClick={salvarEdicao}>
              {savingEdit ? "Salvando…" : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
