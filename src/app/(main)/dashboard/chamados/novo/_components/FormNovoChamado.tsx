"use client";

import { useEffect, useMemo, useState } from "react";

import { useRouter } from "next/navigation";

import { zodResolver } from "@hookform/resolvers/zod";
import { Search, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ComentarioTiptapEditor } from "@/components/comentario-editor/comentario-tiptap-editor";
import { plainTextLengthComentario, sanitizeComentarioHtml } from "@/lib/html/sanitize-comentario-html";

const formSchema = z.object({
  titulo: z.string().min(1, "Título obrigatório.").max(300),
  descricao: z
    .string()
    .min(1, "Descrição obrigatória.")
    .refine((v) => plainTextLengthComentario(sanitizeComentarioHtml(v)) >= 1, "Descrição obrigatória."),
  prioridade: z.enum(["baixa", "media", "alta", "urgente"]),
  setorId: z.string().uuid("Selecione um setor."),
  categoriaId: z.string().uuid("Selecione uma categoria."),
});

type FormValues = z.infer<typeof formSchema>;

type Setor = { id: string; nome: string };
type UsuarioOpcao = { id: string; name: string | null; email: string };
type CategoriaOpcao = { id: string; nome: string; responsavelPadraoId: string | null; responsaveisIds?: string[] };

export function FormNovoChamado({ userId, defaultSetorId }: { userId: string; defaultSetorId: string }) {
  const router = useRouter();
  const [setores, setSetores] = useState<Setor[]>([]);
  const [categorias, setCategorias] = useState<CategoriaOpcao[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioOpcao[]>([]);
  const [acompanhadorIds, setAcompanhadorIds] = useState<string[]>([]);
  const [filtroAcompanhadores, setFiltroAcompanhadores] = useState("");
  const [anexos, setAnexos] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/setores")
      .then((r) => r.json())
      .then((d) => setSetores(d.setores ?? []));
  }, []);

  useEffect(() => {
    fetch("/api/categorias")
      .then((r) => r.json())
      .then((d) => setCategorias(d.categorias ?? []));
  }, []);

  useEffect(() => {
    fetch("/api/users/para-acompanhamento")
      .then((r) => r.json())
      .then((d) => setUsuarios(d.users ?? []));
  }, []);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { titulo: "", descricao: "", prioridade: "media", setorId: defaultSetorId, categoriaId: "" },
  });

  // Se o usuário mudar (ou vier vazio), garante o default no campo.
  useEffect(() => {
    if (!defaultSetorId) return;
    const atual = form.getValues("setorId");
    if (!atual) form.setValue("setorId", defaultSetorId, { shouldDirty: false, shouldTouch: false });
  }, [defaultSetorId, form]);

  const categoriasComResponsavel = categorias.filter(
    (c) => (c.responsaveisIds?.length ?? 0) > 0 || !!c.responsavelPadraoId,
  );

  const usuariosAcompanhamentoLista = useMemo(
    () => usuarios.filter((u) => u.id !== userId),
    [usuarios, userId],
  );

  const usuariosAcompanhamentoFiltrados = useMemo(() => {
    const q = filtroAcompanhadores.trim().toLowerCase();
    if (!q) return usuariosAcompanhamentoLista;
    return usuariosAcompanhamentoLista.filter(
      (u) =>
        (u.name?.toLowerCase().includes(q) ?? false) ||
        u.email.toLowerCase().includes(q) ||
        u.id.toLowerCase().includes(q),
    );
  }, [usuariosAcompanhamentoLista, filtroAcompanhadores]);

  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    try {
      const descricaoSanitizada = sanitizeComentarioHtml(values.descricao);
      const res = await fetch("/api/chamados", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          descricao: descricaoSanitizada,
          ...(acompanhadorIds.length > 0 ? { acompanhadores: acompanhadorIds } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Erro ao criar chamado.");
        return;
      }

      const chamadoId = data.chamado.id;

      if (anexos.length > 0) {
        for (const file of anexos) {
          const fd = new FormData();
          fd.append("file", file);
          await fetch(`/api/chamados/${chamadoId}/anexos`, { method: "POST", body: fd });
        }
      }

      toast.success("Chamado criado com sucesso!");
      router.push(`/dashboard/chamados/${chamadoId}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-[2fr_1fr] md:items-start">
              <div className="space-y-5">
                <FormField
                  control={form.control}
                  name="titulo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Título</FormLabel>
                      <FormControl>
                        <Input placeholder="Descreva o problema em poucas palavras" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="descricao"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição</FormLabel>
                      <FormControl>
                        <ComentarioTiptapEditor onChange={field.onChange} disabled={submitting} placeholder="" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-2">
                <Label className="font-medium text-sm">Acompanhadores (opcional)</Label>
                <p className="text-muted-foreground text-xs">Quem marcar receberá notificações sobre este chamado.</p>
                <div className="overflow-hidden rounded-md border">
                  <div className="border-b bg-muted/30 px-2 py-2">
                    <div className="relative">
                      <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                      <Input
                        type="search"
                        placeholder="Buscar por nome ou e-mail…"
                        value={filtroAcompanhadores}
                        onChange={(e) => setFiltroAcompanhadores(e.target.value)}
                        className="h-8 pl-8 text-sm"
                        autoComplete="off"
                        aria-label="Filtrar lista de acompanhadores"
                      />
                    </div>
                  </div>
                  <ScrollArea className="h-40 p-3">
                    <div className="space-y-3">
                      {usuariosAcompanhamentoFiltrados.map((u) => (
                        <div key={u.id} className="flex items-start gap-2">
                          <Checkbox
                            id={`acomp-${u.id}`}
                            checked={acompanhadorIds.includes(u.id)}
                            onCheckedChange={(checked) => {
                              setAcompanhadorIds((prev) =>
                                checked === true
                                  ? prev.includes(u.id)
                                    ? prev
                                    : [...prev, u.id]
                                  : prev.filter((id) => id !== u.id),
                              );
                            }}
                          />
                          <label htmlFor={`acomp-${u.id}`} className="cursor-pointer text-sm leading-tight">
                            <span className="font-medium">{u.name ?? u.email}</span>
                            {u.name ? <span className="block text-muted-foreground text-xs">{u.email}</span> : null}
                          </label>
                        </div>
                      ))}
                      {usuariosAcompanhamentoLista.length === 0 && (
                        <p className="text-muted-foreground text-xs">Nenhum usuário disponível.</p>
                      )}
                      {usuariosAcompanhamentoLista.length > 0 && usuariosAcompanhamentoFiltrados.length === 0 && (
                        <p className="text-muted-foreground text-xs">Nenhum usuário encontrado para esta busca.</p>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            </div>

            <FormField
              control={form.control}
              name="categoriaId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoria</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a categoria do chamado" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categoriasComResponsavel.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-muted-foreground text-xs">
                    O responsável inicial será escolhido dentre os técnicos responsáveis desta categoria.
                  </p>
                  {categoriasComResponsavel.length === 0 && (
                    <p className="text-amber-700 text-xs dark:text-amber-500">
                      Nenhuma categoria disponível. Peça a um administrador para cadastrar categorias em Configurações.
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="prioridade"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prioridade</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a prioridade" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="baixa">Baixa</SelectItem>
                        <SelectItem value="media">Média</SelectItem>
                        <SelectItem value="alta">Alta</SelectItem>
                        <SelectItem value="urgente">Urgente</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="setorId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Setor</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o setor" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {setores.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div>
              <Label htmlFor="anexos-input-novo-chamado" className="mb-2 block font-medium text-sm leading-none">
                Anexos (opcional)
              </Label>
              <Input
                id="anexos-input-novo-chamado"
                type="file"
                multiple
                onChange={(e) => {
                  const novos = Array.from(e.target.files ?? []);
                  setAnexos((prev) => {
                    const nomes = new Set(prev.map((f) => f.name));
                    return [...prev, ...novos.filter((f) => !nomes.has(f.name))];
                  });
                  e.target.value = "";
                }}
                className="cursor-pointer"
              />
              {anexos.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {anexos.map((f, i) => (
                    <li
                      key={`${f.name}-${f.size}-${f.lastModified}`}
                      className="flex items-center justify-between gap-2 rounded bg-muted/50 px-2 py-1 text-xs"
                    >
                      <span className="truncate text-muted-foreground">{f.name}</span>
                      <button
                        type="button"
                        onClick={() => setAnexos((prev) => prev.filter((_, j) => j !== i))}
                        className="shrink-0 text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={submitting}>
                {submitting ? "Enviando..." : "Abrir Chamado"}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.push("/dashboard/chamados")}>
                Cancelar
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
