"use client";

import { useEffect, useState } from "react";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UsuarioBuscaCombobox } from "@/components/usuario-busca-combobox";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

type Setor = {
  id: string;
  nome: string;
  descricao: string | null;
  gestorId: string | null;
  gestorNome: string | null;
};

type Usuario = { id: string; name: string | null; email: string };

export function GerenciarSetores() {
  const [setores, setSetores] = useState<Setor[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editando, setEditando] = useState<Setor | null>(null);
  const [form, setForm] = useState({ nome: "", descricao: "", gestorId: "" });
  const [saving, setSaving] = useState(false);

  async function fetchData() {
    const [setoresRes, usersRes] = await Promise.all([
      fetch("/api/setores").then((r) => r.json()),
      fetch("/api/admin/users").then((r) => r.json()),
    ]);
    setSetores(setoresRes.setores ?? []);
    setUsuarios(
      (usersRes.users ?? []).filter(
        (u: { tipoConta: string }) =>
          u.tipoConta === "gestor_setor" || u.tipoConta === "gestor",
      ),
    );
    setLoading(false);
  }

  useEffect(() => { fetchData(); }, []);

  function abrirNovoDialog() {
    setEditando(null);
    setForm({ nome: "", descricao: "", gestorId: "" });
    setDialogOpen(true);
  }

  function abrirEditarDialog(s: Setor) {
    setEditando(s);
    setForm({ nome: s.nome, descricao: s.descricao ?? "", gestorId: s.gestorId ?? "" });
    setDialogOpen(true);
  }

  async function salvar() {
    setSaving(true);
    try {
      const body = {
        nome: form.nome,
        descricao: form.descricao || null,
        gestorId: form.gestorId || null,
      };

      const res = editando
        ? await fetch(`/api/setores/${editando.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          })
        : await fetch("/api/setores", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });

      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Erro ao salvar."); return; }
      toast.success(editando ? "Setor atualizado." : "Setor criado.");
      setDialogOpen(false);
      fetchData();
    } finally {
      setSaving(false);
    }
  }

  async function excluir(id: string) {
    if (!confirm("Excluir este setor? Chamados vinculados não poderão ser excluídos.")) return;
    const res = await fetch(`/api/setores/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) { toast.error(data.error ?? "Erro ao excluir."); return; }
    toast.success("Setor excluído.");
    fetchData();
  }

  if (loading) return <Skeleton className="h-64 w-full" />;

  return (
    <>
      <div className="flex justify-end">
        <Button onClick={abrirNovoDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Setor
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {setores.map((s) => (
          <Card key={s.id}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <CardTitle className="text-base">{s.nome}</CardTitle>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => abrirEditarDialog(s)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => excluir(s.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-1">
              {s.descricao && <p>{s.descricao}</p>}
              <p>
                <span className="font-medium text-foreground">Gestor: </span>
                {s.gestorNome ?? "Não atribuído"}
              </p>
            </CardContent>
          </Card>
        ))}

        {setores.length === 0 && (
          <p className="text-muted-foreground text-sm col-span-full">
            Nenhum setor cadastrado ainda.
          </p>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editando ? "Editar Setor" : "Novo Setor"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Nome</Label>
              <Input
                value={form.nome}
                onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                placeholder="Nome do setor"
              />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea
                value={form.descricao}
                onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
                placeholder="Descrição opcional"
                rows={2}
              />
            </div>
            <div>
              <Label>Gestor Responsável</Label>
              <UsuarioBuscaCombobox
                usuarios={usuarios}
                value={form.gestorId}
                onValueChange={(id) => setForm((f) => ({ ...f, gestorId: id }))}
                placeholder="Buscar gestor…"
                searchPlaceholder="Nome ou e-mail…"
                allowEmpty
                emptyOptionLabel="Sem gestor"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={salvar} disabled={saving || !form.nome.trim()}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
