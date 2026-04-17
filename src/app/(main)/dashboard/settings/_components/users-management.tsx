"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  CircleCheck,
  CircleX,
  Loader,
  MoreHorizontal,
  Pencil,
  Trash2,
  UserPlus,
  UserX,
  UserCheck,
  Shield,
  Columns3,
  Search,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn, getInitials } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const TIPO_LABEL: Record<string, string> = {
  admin: "Administrador",
  usuario_final: "Usuário Final",
  gestor_setor: "Gestor de Setor",
  diretor: "Diretor",
  ti: "Técnico TI",
  desenvolvedor: "Desenvolvedor",
  // legados (migração pendente)
  gestor: "Gestor (legado)",
  usuario: "Usuário (legado)",
};

const TIPO_CONTA_OPTIONS = [
  { value: "admin", label: "Administrador" },
  { value: "usuario_final", label: "Usuário Final" },
  { value: "gestor_setor", label: "Gestor de Setor" },
  { value: "diretor", label: "Diretor" },
  { value: "ti", label: "Técnico TI" },
  { value: "desenvolvedor", label: "Desenvolvedor" },
] as const;

const STATUS_LABEL: Record<string, string> = {
  ativo: "Ativo",
  inativo: "Inativo",
  verificado: "Verificado",
  pendente: "Pendente",
};

type UserRow = {
  id: string;
  email: string;
  name: string | null;
  fotoPerfil: string | null;
  setorId: string;
  setorNome?: string | null;
  tipoConta: string;
  status: string;
  createdAt: string;
  lastLogin: string | null;
  activeSessionsCount: number;
  categoriasIds: string[];
};

type CategoriaAdminRow = { id: string; nome: string; ativo: boolean };
type SetorOption = { id: string; nome: string };

const createUserSchema = z.object({
  email: z.string().email("E-mail inválido."),
  password: z.string().min(6, "Mínimo 6 caracteres."),
  name: z.string().max(200).optional(),
  setorId: z.string().uuid("Selecione um setor."),
  tipoConta: z.enum(["admin", "usuario_final", "gestor_setor", "diretor", "ti", "desenvolvedor"]),
  status: z.enum(["ativo", "inativo", "verificado", "pendente"]),
});

const editUserSchema = z.object({
  name: z.string().max(200).optional(),
  tipoConta: z.enum(["admin", "usuario_final", "gestor_setor", "diretor", "ti", "desenvolvedor"]),
  status: z.enum(["ativo", "inativo", "verificado", "pendente"]),
  password: z.string().min(6).optional().or(z.literal("")),
});

type CreateUserValues = z.infer<typeof createUserSchema>;
type EditUserValues = z.infer<typeof editUserSchema>;

const COLUMN_KEYS = ["lastLogin", "sessions"] as const;
type ColumnKey = (typeof COLUMN_KEYS)[number];

export function UsersManagement() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [categoriasAdmin, setCategoriasAdmin] = useState<CategoriaAdminRow[]>([]);
  const [setores, setSetores] = useState<SetorOption[]>([]);
  const [editCategoriasIds, setEditCategoriasIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [deleteUser, setDeleteUser] = useState<UserRow | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [columns, setColumns] = useState<Record<ColumnKey, boolean>>({
    lastLogin: true,
    sessions: true,
  });

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/users");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao carregar.");
      const raw = data.users ?? [];
      setUsers(
        raw.map((u: UserRow & { categoriasIds?: string[] }) => ({
          ...u,
          categoriasIds: u.categoriasIds ?? [],
        })),
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao carregar usuários.");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCategoriasAdmin = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/categorias");
      const data = await res.json();
      if (!res.ok) return;
      setCategoriasAdmin(data.categorias ?? []);
    } catch {
      setCategoriasAdmin([]);
    }
  }, []);

  const fetchSetores = useCallback(async () => {
    try {
      const res = await fetch("/api/setores");
      const data = await res.json();
      if (!res.ok) return;
      const lista = (data.setores ?? []) as { id: string; nome: string }[];
      lista.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
      setSetores(lista.map((s) => ({ id: s.id, nome: s.nome })));
    } catch {
      setSetores([]);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
    void fetchCategoriasAdmin();
    void fetchSetores();
  }, [fetchUsers, fetchCategoriasAdmin, fetchSetores]);

  const createForm = useForm<CreateUserValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      email: "",
      password: "",
      name: "",
      setorId: "",
      tipoConta: "usuario_final",
      status: "ativo",
    },
  });

  const editForm = useForm<EditUserValues>({
    resolver: zodResolver(editUserSchema),
    defaultValues: { name: "", tipoConta: "usuario_final", status: "ativo", password: "" },
  });

  const onAddOpen = (open: boolean) => {
    setAddOpen(open);
    if (!open)
      createForm.reset({ email: "", password: "", name: "", setorId: "", tipoConta: "usuario_final", status: "ativo" });
  };

  const onCreateSubmit = async (data: CreateUserValues) => {
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Erro ao criar usuário.");
        return;
      }
      toast.success("Usuário criado.");
      onAddOpen(false);
      fetchUsers();
    } catch {
      toast.error("Erro ao criar usuário.");
    }
  };

  const onEditOpen = (user: UserRow | null) => {
    setEditUser(user);
    if (user) {
      const validTipos = ["admin", "usuario_final", "gestor_setor", "diretor", "ti", "desenvolvedor"] as const;
      const tipoConta = validTipos.includes(user.tipoConta as typeof validTipos[number])
        ? (user.tipoConta as typeof validTipos[number])
        : "usuario_final";
      editForm.reset({
        name: user.name ?? "",
        tipoConta,
        status: user.status as "ativo" | "inativo" | "verificado" | "pendente",
        password: "",
      });
      setEditCategoriasIds(new Set(user.categoriasIds ?? []));
    } else {
      setEditCategoriasIds(new Set());
    }
  };

  const onEditSubmit = async (data: EditUserValues) => {
    if (!editUser) return;
    try {
      const body: Record<string, unknown> = {
        name: data.name || null,
        tipoConta: data.tipoConta,
        status: data.status,
        categoriasIds: [...editCategoriasIds],
      };
      if (data.password?.trim()) body.password = data.password.trim();
      const res = await fetch(`/api/admin/users/${editUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Erro ao atualizar.");
        return;
      }
      toast.success("Usuário atualizado.");
      onEditOpen(null);
      fetchUsers();
    } catch {
      toast.error("Erro ao atualizar usuário.");
    }
  };

  const onDeleteConfirm = async () => {
    if (!deleteUser) return;
    try {
      const res = await fetch(`/api/admin/users/${deleteUser.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Erro ao excluir.");
        return;
      }
      toast.success("Usuário excluído.");
      setDeleteUser(null);
      fetchUsers();
    } catch {
      toast.error("Erro ao excluir usuário.");
    }
  };

  const updateStatus = async (user: UserRow, newStatus: string) => {
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Erro ao atualizar status.");
        return;
      }
      toast.success("Status atualizado.");
      fetchUsers();
    } catch {
      toast.error("Erro ao atualizar status.");
    }
  };

  const updateTipo = async (user: UserRow, newTipo: string) => {
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipoConta: newTipo }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Erro ao alterar tipo.");
        return;
      }
      toast.success("Tipo da conta atualizado.");
      fetchUsers();
    } catch {
      toast.error("Erro ao alterar tipo.");
    }
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return "—";
    try {
      return format(new Date(iso), "dd/MM/yyyy HH:mm", { locale: ptBR });
    } catch {
      return "—";
    }
  };

  const filteredUsers = useMemo(() => {
    let list = users;
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (u) =>
          (u.name ?? "").toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q),
      );
    }
    if (statusFilter) list = list.filter((u) => u.status === statusFilter);
    if (roleFilter) list = list.filter((u) => u.tipoConta === roleFilter);
    return list;
  }, [users, search, statusFilter, roleFilter]);

  const toggleSelectAll = (checked: boolean) => {
    if (checked) setSelectedIds(new Set(filteredUsers.map((u) => u.id)));
    else setSelectedIds(new Set());
  };
  const toggleSelect = (id: string, checked: boolean) => {
    const next = new Set(selectedIds);
    if (checked) next.add(id);
    else next.delete(id);
    setSelectedIds(next);
  };
  const allSelected = filteredUsers.length > 0 && selectedIds.size === filteredUsers.length;

  const StatusIcon = ({ status }: { status: string }) => {
    if (status === "ativo" || status === "verificado") {
      return <CircleCheck className="fill-green-500 stroke-border dark:fill-green-400" />;
    }
    if (status === "inativo") {
      return <CircleX className="text-muted-foreground" />;
    }
    if (status === "pendente") {
      return <Loader className="text-muted-foreground" />;
    }
    return null;
  };

  if (loading) {
    return (
      <div className="rounded-lg border p-4 text-muted-foreground text-xs">
        Carregando usuários…
      </div>
    );
  }

  const colSpan = 6 + (columns.lastLogin ? 1 : 0) + (columns.sessions ? 1 : 0) + 1; // checkbox + nome + setor + tipo + email + status + lastLogin? + sessions? + actions

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="font-semibold text-lg tracking-tight">Usuários</h2>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                <Columns3 className="size-3.5" />
                Colunas
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuCheckboxItem
                checked={columns.lastLogin}
                onCheckedChange={(v) => setColumns((c) => ({ ...c, lastLogin: !!v }))}
              >
                Último login
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={columns.sessions}
                onCheckedChange={(v) => setColumns((c) => ({ ...c, sessions: !!v }))}
              >
                Sessões ativas
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button type="button" size="sm" className="h-8 gap-1.5 bg-primary text-primary-foreground text-xs hover:bg-primary/90" onClick={() => onAddOpen(true)}>
            <UserPlus className="size-3.5" />
            Adicionar usuário
          </Button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar usuários..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 pl-8 text-xs"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 gap-1 rounded-full text-xs">
              {statusFilter ? `Status: ${STATUS_LABEL[statusFilter]}` : "Status"}
              <ChevronDown className="size-3" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-40 p-1" align="start">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-full justify-start text-xs font-normal"
              onClick={() => setStatusFilter(null)}
            >
              Todos
            </Button>
            {(["ativo", "inativo", "pendente", "verificado"] as const).map((s) => (
              <Button
                key={s}
                variant="ghost"
                size="sm"
                className="h-7 w-full justify-start text-xs font-normal"
                onClick={() => setStatusFilter(s)}
              >
                {STATUS_LABEL[s]}
              </Button>
            ))}
          </PopoverContent>
        </Popover>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 gap-1 rounded-full text-xs">
              {roleFilter ? `Tipo: ${TIPO_CONTA_OPTIONS.find((t) => t.value === roleFilter)?.label ?? TIPO_LABEL[roleFilter]}` : "Tipo"}
              <ChevronDown className="size-3" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-40 p-1" align="start">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-full justify-start text-xs font-normal"
              onClick={() => setRoleFilter(null)}
            >
              Todos
            </Button>
            {TIPO_CONTA_OPTIONS.map((t) => (
              <Button
                key={t.value}
                variant="ghost"
                size="sm"
                className="h-7 w-full justify-start text-xs font-normal"
                onClick={() => setRoleFilter(t.value)}
              >
                {t.label}
              </Button>
            ))}
          </PopoverContent>
        </Popover>
        {(statusFilter || roleFilter) && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-muted-foreground"
            onClick={() => {
              setStatusFilter(null);
              setRoleFilter(null);
            }}
          >
            Limpar filtros
          </Button>
        )}
      </div>

      <div className="rounded-md border text-sm">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-10 px-2 [&:has([role=checkbox])]:pr-0">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={toggleSelectAll}
                  aria-label="Selecionar todos"
                />
              </TableHead>
              <TableHead className="font-medium text-muted-foreground">Nome</TableHead>
              <TableHead className="font-medium text-muted-foreground">Setor</TableHead>
              <TableHead className="font-medium text-muted-foreground">Tipo</TableHead>
              <TableHead className="font-medium text-muted-foreground">E-mail</TableHead>
              <TableHead className="font-medium text-muted-foreground">Status</TableHead>
              {columns.lastLogin && (
                <TableHead className="font-medium text-center text-muted-foreground">Último login</TableHead>
              )}
              {columns.sessions && (
                <TableHead className="font-medium text-center text-muted-foreground">Sessões</TableHead>
              )}
              <TableHead className="w-10 [&:has([role=checkbox])]:pr-0" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={colSpan} className="h-24 text-center text-muted-foreground">
                  Nenhum usuário encontrado.
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="w-10 px-2 [&:has([role=checkbox])]:pr-0">
                    <Checkbox
                      checked={selectedIds.has(user.id)}
                      onCheckedChange={(c) => toggleSelect(user.id, !!c)}
                      aria-label={`Selecionar ${user.name || user.email}`}
                    />
                  </TableCell>
                  <TableCell className="p-2">
                    <div className="flex items-center gap-2">
                      <Avatar className="size-9 rounded-full">
                        <AvatarImage
                          src={user.fotoPerfil ?? undefined}
                          alt={user.name?.trim() || user.email}
                          className="object-cover"
                        />
                        <AvatarFallback className="rounded-full bg-muted text-sm">
                          {getInitials(user.name?.trim() || user.email)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{user.name?.trim() || "—"}</span>
                    </div>
                  </TableCell>
                  <TableCell className="p-2 text-muted-foreground">{user.setorNome ?? "—"}</TableCell>
                  <TableCell className="p-2 text-muted-foreground">{TIPO_LABEL[user.tipoConta] ?? user.tipoConta}</TableCell>
                  <TableCell className="p-2 text-muted-foreground">{user.email}</TableCell>
                  <TableCell className="p-2">
                    <Badge variant="outline" className="gap-1 px-1.5 text-muted-foreground">
                      <StatusIcon status={user.status} />
                      {STATUS_LABEL[user.status] ?? user.status}
                    </Badge>
                  </TableCell>
                  {columns.lastLogin && (
                    <TableCell className="p-2 text-center text-muted-foreground">{formatDate(user.lastLogin)}</TableCell>
                  )}
                  {columns.sessions && (
                    <TableCell className="p-2 text-center">{user.activeSessionsCount}</TableCell>
                  )}
                  <TableCell className="p-2 [&:has([role=checkbox])]:pr-0">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-8">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={() => onEditOpen(user)}>
                          <Pencil className="mr-2 size-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger>
                            <Shield className="mr-2 size-4" />
                            Alterar tipo
                          </DropdownMenuSubTrigger>
                          <DropdownMenuSubContent>
                            {TIPO_CONTA_OPTIONS.map((t) => (
                              <DropdownMenuItem
                                key={t.value}
                                onClick={() => updateTipo(user, t.value)}
                                disabled={user.tipoConta === t.value}
                              >
                                {t.label}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuSubContent>
                        </DropdownMenuSub>
                        {user.status === "ativo" ? (
                          <DropdownMenuItem onClick={() => updateStatus(user, "inativo")}>
                            <UserX className="mr-2 size-4" />
                            Desativar
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={() => updateStatus(user, "ativo")}>
                            <UserCheck className="mr-2 size-4" />
                            Ativar
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => setDeleteUser(user)}
                        >
                          <Trash2 className="mr-2 size-4" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Dialog Adicionar */}
      <Dialog open={addOpen} onOpenChange={onAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar usuário</DialogTitle>
          </DialogHeader>
          <Form {...createForm}>
            <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
              <FormField
                control={createForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>E-mail</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="email@exemplo.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Senha</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Mínimo 6 caracteres" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome completo" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="setorId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Setor</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
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
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={createForm.control}
                  name="tipoConta"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo da conta</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {TIPO_CONTA_OPTIONS.map((t) => (
                            <SelectItem key={t.value} value={t.value}>
                              {t.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(["ativo", "inativo", "verificado", "pendente"] as const).map((s) => (
                            <SelectItem key={s} value={s}>
                              {STATUS_LABEL[s]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => onAddOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createForm.formState.isSubmitting}>
                  {createForm.formState.isSubmitting ? "Criando…" : "Criar"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Dialog Editar */}
      <Dialog open={!!editUser} onOpenChange={(open) => !open && onEditOpen(null)}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar usuário</DialogTitle>
          </DialogHeader>
          {editUser && (
            <Form {...editForm}>
              <form key={editUser.id} onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                <p className="text-muted-foreground text-sm">{editUser.email}</p>
                <FormField
                  control={editForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome</FormLabel>
                      <FormControl>
                        <Input placeholder="Nome completo" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nova senha (deixe em branco para não alterar)</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Mínimo 6 caracteres" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={editForm.control}
                    name="tipoConta"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo da conta</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {TIPO_CONTA_OPTIONS.map((t) => (
                              <SelectItem key={t.value} value={t.value}>
                                {t.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {(["ativo", "inativo", "verificado", "pendente"] as const).map((s) => (
                              <SelectItem key={s} value={s}>
                                {STATUS_LABEL[s]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <p className="font-medium text-sm">Categorias em que atua</p>
                  <p className="text-muted-foreground text-xs">
                    Marque as áreas em que este usuário pode ser referenciado como técnico da categoria (organização interna).
                  </p>
                  {categoriasAdmin.length === 0 ? (
                    <p className="text-muted-foreground text-xs">Nenhuma categoria cadastrada.</p>
                  ) : (
                    <ScrollArea className="h-44 rounded-md border p-3">
                      <div className="space-y-3">
                        {categoriasAdmin.map((c) => (
                          <div key={c.id} className="flex items-start gap-2">
                            <Checkbox
                              id={`edit-cat-${c.id}`}
                              checked={editCategoriasIds.has(c.id)}
                              onCheckedChange={(checked) => {
                                setEditCategoriasIds((prev) => {
                                  const next = new Set(prev);
                                  if (checked === true) next.add(c.id);
                                  else next.delete(c.id);
                                  return next;
                                });
                              }}
                            />
                            <label htmlFor={`edit-cat-${c.id}`} className="cursor-pointer text-sm leading-tight">
                              <span className="font-medium">{c.nome}</span>
                              {!c.ativo ? (
                                <span className="ml-1 text-muted-foreground text-xs">(inativa)</span>
                              ) : null}
                            </label>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => onEditOpen(null)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={editForm.formState.isSubmitting}>
                    {editForm.formState.isSubmitting ? "Salvando…" : "Salvar"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>

      {/* AlertDialog Excluir */}
      <AlertDialog open={!!deleteUser} onOpenChange={(open) => !open && setDeleteUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir usuário</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{deleteUser?.name || deleteUser?.email}</strong>? Esta ação não
              pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={onDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
