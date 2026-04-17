"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type CategoriaRow = { id: string; nome: string; ativo: boolean };
type PoliticaRow = {
  id: string;
  categoriaId: string;
  categoriaNome: string;
  prioridade: "baixa" | "media" | "alta" | "urgente";
  metaRespostaMinutos: number;
  metaResolucaoMinutos: number;
};

const PRIORIDADES: { value: PoliticaRow["prioridade"]; label: string }[] = [
  { value: "baixa", label: "Baixa" },
  { value: "media", label: "Média" },
  { value: "alta", label: "Alta" },
  { value: "urgente", label: "Urgente" },
];

function chave(categoriaId: string, prioridade: string) {
  return `${categoriaId}|${prioridade}`;
}

export function SlaSettings() {
  const [categorias, setCategorias] = useState<CategoriaRow[]>([]);
  const [politicas, setPoliticas] = useState<PoliticaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<Record<string, { resposta: string; resolucao: string }>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const politicaPorChave = useMemo(() => {
    const m = new Map<string, PoliticaRow>();
    for (const p of politicas) {
      m.set(chave(p.categoriaId, p.prioridade), p);
    }
    return m;
  }, [politicas]);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    try {
      const [rCat, rPol] = await Promise.all([
        fetch("/api/admin/categorias", { credentials: "same-origin" }),
        fetch("/api/admin/sla-politicas", { credentials: "same-origin" }),
      ]);
      const jCat = await rCat.json();
      const jPol = await rPol.json();
      if (!rCat.ok) throw new Error(jCat.error ?? "Erro ao carregar categorias.");
      if (!rPol.ok) throw new Error(jPol.error ?? "Erro ao carregar SLA.");
      setCategorias(jCat.categorias ?? []);
      setPoliticas(jPol.politicas ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao carregar.");
      setCategorias([]);
      setPoliticas([]);
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const porChave = new Map<string, PoliticaRow>();
    for (const p of politicas) {
      porChave.set(chave(p.categoriaId, p.prioridade), p);
    }
    const next: Record<string, { resposta: string; resolucao: string }> = {};
    const cats = categorias.filter((c) => c.ativo);
    for (const c of cats) {
      for (const { value } of PRIORIDADES) {
        const k = chave(c.id, value);
        const p = porChave.get(k);
        next[k] = {
          resposta: p ? String(p.metaRespostaMinutos) : "",
          resolucao: p ? String(p.metaResolucaoMinutos) : "",
        };
      }
    }
    setDrafts(next);
  }, [categorias, politicas]);

  async function salvar(categoriaId: string, prioridade: PoliticaRow["prioridade"]) {
    const k = chave(categoriaId, prioridade);
    const d = drafts[k];
    if (!d) return;
    const mr = Number(d.resposta);
    const mres = Number(d.resolucao);
    if (!Number.isFinite(mr) || mr < 1 || !Number.isFinite(mres) || mres < 1) {
      toast.error("Informe metas válidas (minutos ≥ 1).");
      return;
    }
    setSavingKey(k);
    try {
      const res = await fetch("/api/admin/sla-politicas", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoriaId,
          prioridade,
          metaRespostaMinutos: mr,
          metaResolucaoMinutos: mres,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Erro ao salvar.");
        return;
      }
      toast.success("SLA salvo.");
      await load({ silent: true });
    } finally {
      setSavingKey(null);
    }
  }

  async function remover(politicaId: string) {
    try {
      const res = await fetch(`/api/admin/sla-politicas/${politicaId}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Erro ao remover.");
        return;
      }
      toast.success("Política removida.");
      await load();
    } catch {
      toast.error("Erro ao remover.");
    }
  }

  if (loading) {
    return <p className="text-muted-foreground text-sm">Carregando SLA…</p>;
  }

  const catsAtivas = categorias.filter((c) => c.ativo);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-semibold text-lg tracking-tight">SLA por categoria e prioridade</h2>
        <p className="text-muted-foreground text-sm">
          Metas em <strong>minutos úteis</strong> (segunda a sexta), janelas 07:30–12:00 e 14:00–18:18, fuso{" "}
          <Badge variant="secondary" className="font-mono text-xs">
            America/Sao_Paulo
          </Badge>
          . Sem política cadastrada, o chamado abre sem SLA.
        </p>
      </div>

      {catsAtivas.length === 0 ? (
        <p className="text-muted-foreground text-sm">Nenhuma categoria ativa. Cadastre categorias primeiro.</p>
      ) : (
        <div className="space-y-6">
          {catsAtivas.map((c) => (
            <div key={c.id} className="rounded-md border">
              <div className="border-b bg-muted/40 px-3 py-2 font-medium text-sm">{c.nome}</div>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-muted-foreground">Prioridade</TableHead>
                    <TableHead className="text-muted-foreground">Meta 1ª resposta (min)</TableHead>
                    <TableHead className="text-muted-foreground">Meta resolução (min)</TableHead>
                    <TableHead className="w-40" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {PRIORIDADES.map(({ value, label }) => {
                    const k = chave(c.id, value);
                    const p = politicaPorChave.get(k);
                    const d = drafts[k] ?? { resposta: "", resolucao: "" };
                    return (
                      <TableRow key={k}>
                        <TableCell className="font-medium">{label}</TableCell>
                        <TableCell>
                          <Label htmlFor={`sla-r-${k}`} className="sr-only">
                            Meta resposta
                          </Label>
                          <Input
                            id={`sla-r-${k}`}
                            type="number"
                            min={1}
                            className="h-8 max-w-[120px]"
                            value={d.resposta}
                            onChange={(e) => setDrafts((prev) => ({ ...prev, [k]: { ...d, resposta: e.target.value } }))}
                          />
                        </TableCell>
                        <TableCell>
                          <Label htmlFor={`sla-x-${k}`} className="sr-only">
                            Meta resolução
                          </Label>
                          <Input
                            id={`sla-x-${k}`}
                            type="number"
                            min={1}
                            className="h-8 max-w-[120px]"
                            value={d.resolucao}
                            onChange={(e) => setDrafts((prev) => ({ ...prev, [k]: { ...d, resolucao: e.target.value } }))}
                          />
                        </TableCell>
                        <TableCell className="flex flex-wrap gap-1">
                          <Button
                            type="button"
                            size="sm"
                            className="h-8"
                            disabled={savingKey === k}
                            onClick={() => void salvar(c.id, value)}
                          >
                            {savingKey === k ? "Salvando…" : "Salvar"}
                          </Button>
                          {p ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              title="Remover política"
                              onClick={() => void remover(p.id)}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
