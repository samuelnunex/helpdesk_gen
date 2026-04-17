"use client";

import { useMemo, useState } from "react";

import { Check, ChevronsUpDown, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type UsuarioOpcaoMultiCombobox = {
  id: string;
  name: string | null;
  email?: string;
};

function labelUsuario(u: UsuarioOpcaoMultiCombobox) {
  const n = u.name?.trim();
  if (n) return n;
  if (u.email?.trim()) return u.email;
  return "Usuário";
}

type UsuariosMultiComboboxProps = {
  usuarios: UsuarioOpcaoMultiCombobox[];
  values: string[];
  onValuesChange: (userIds: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  triggerClassName?: string;
  contentClassName?: string;
  align?: "start" | "center" | "end";
  maxBadges?: number;
};

export function UsuariosMultiCombobox({
  usuarios,
  values,
  onValuesChange,
  placeholder = "Selecionar usuários…",
  searchPlaceholder = "Buscar por nome ou e-mail…",
  disabled,
  triggerClassName,
  contentClassName,
  align = "start",
  maxBadges = 2,
}: UsuariosMultiComboboxProps) {
  const [open, setOpen] = useState(false);
  const valueSet = useMemo(() => new Set(values), [values]);

  const selected = useMemo(() => usuarios.filter((u) => valueSet.has(u.id)), [usuarios, valueSet]);
  const displayBadges = selected.slice(0, Math.max(0, maxBadges));
  const remaining = selected.length - displayBadges.length;

  function toggle(id: string) {
    const next = new Set(values);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onValuesChange([...next]);
  }

  function clearAll(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    onValuesChange([]);
  }

  return (
    <Popover open={open} onOpenChange={setOpen} modal={false}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn("min-h-9 w-full justify-between gap-2 px-3 font-normal", triggerClassName)}
        >
          <span className="min-w-0 flex-1 text-left">
            {selected.length === 0 ? (
              <span className="text-muted-foreground">{placeholder}</span>
            ) : (
              <span className="flex flex-wrap gap-1.5">
                {displayBadges.map((u) => (
                  <Badge key={u.id} variant="secondary" className="font-normal">
                    {labelUsuario(u)}
                  </Badge>
                ))}
                {remaining > 0 ? (
                  <Badge variant="outline" className="font-normal text-muted-foreground">
                    +{remaining}
                  </Badge>
                ) : null}
              </span>
            )}
          </span>

          <span className="flex items-center gap-1">
            {selected.length > 0 ? (
              <button
                type="button"
                className="rounded-sm p-1 text-muted-foreground hover:text-foreground"
                aria-label="Limpar seleção"
                onClick={clearAll}
              >
                <X className="size-4" />
              </button>
            ) : null}
            <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className={cn("p-0 min-w-[240px] w-80 max-w-[min(calc(100vw-2rem),360px)]", contentClassName)}
        align={align}
      >
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>Nenhum usuário encontrado.</CommandEmpty>
            <CommandGroup value="usuarios">
              {usuarios.map((u) => {
                const checked = valueSet.has(u.id);
                return (
                  <CommandItem
                    key={u.id}
                    value={u.id}
                    keywords={[labelUsuario(u), u.email ?? "", u.id]}
                    onSelect={() => toggle(u.id)}
                  >
                    <Check className={cn("size-4 shrink-0", checked ? "opacity-100" : "opacity-0")} />
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="truncate">{labelUsuario(u)}</span>
                      {u.name?.trim() && u.email ? (
                        <span className="truncate text-muted-foreground text-xs">{u.email}</span>
                      ) : null}
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

