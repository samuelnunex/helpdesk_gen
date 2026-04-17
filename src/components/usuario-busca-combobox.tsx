"use client";

import { useState } from "react";

import { Check, ChevronsUpDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type UsuarioOpcaoCombobox = {
  id: string;
  name: string | null;
  email?: string;
};

function labelUsuario(u: UsuarioOpcaoCombobox) {
  const n = u.name?.trim();
  if (n) return n;
  if (u.email?.trim()) return u.email;
  return "Usuário";
}

type UsuarioBuscaComboboxProps = {
  usuarios: UsuarioOpcaoCombobox[];
  value: string;
  onValueChange: (userId: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  triggerClassName?: string;
  contentClassName?: string;
  align?: "start" | "center" | "end";
  allowEmpty?: boolean;
  emptyOptionLabel?: string;
};

export function UsuarioBuscaCombobox({
  usuarios,
  value,
  onValueChange,
  placeholder = "Selecionar usuário…",
  searchPlaceholder = "Buscar por nome ou e-mail…",
  disabled,
  triggerClassName,
  contentClassName,
  align = "start",
  allowEmpty = false,
  emptyOptionLabel = "Nenhum",
}: UsuarioBuscaComboboxProps) {
  const [open, setOpen] = useState(false);
  const selected = usuarios.find((u) => u.id === value);

  const displayLabel =
    allowEmpty && !value
      ? emptyOptionLabel
      : selected
        ? labelUsuario(selected)
        : value
          ? "Usuário não listado"
          : placeholder;

  return (
    <Popover open={open} onOpenChange={setOpen} modal={false}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn("h-9 w-full justify-between px-3 font-normal", triggerClassName)}
        >
          <span className="truncate text-left">{displayLabel}</span>
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className={cn("p-0 min-w-[220px] w-72 max-w-[min(calc(100vw-2rem),320px)]", contentClassName)}
        align={align}
      >
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>Nenhum usuário encontrado.</CommandEmpty>
            <CommandGroup value="usuarios">
              {allowEmpty ? (
                <CommandItem
                  value={`__empty__ ${emptyOptionLabel}`}
                  keywords={[emptyOptionLabel, "nenhum", "sem"]}
                  onSelect={() => {
                    onValueChange("");
                    setOpen(false);
                  }}
                >
                  <Check className={cn("size-4 shrink-0", !value ? "opacity-100" : "opacity-0")} />
                  <span>{emptyOptionLabel}</span>
                </CommandItem>
              ) : null}
              {usuarios.map((u) => (
                <CommandItem
                  key={u.id}
                  value={u.id}
                  keywords={[labelUsuario(u), u.email ?? "", u.id]}
                  onSelect={() => {
                    onValueChange(u.id);
                    setOpen(false);
                  }}
                >
                  <Check className={cn("size-4 shrink-0", value === u.id ? "opacity-100" : "opacity-0")} />
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate">{labelUsuario(u)}</span>
                    {u.name?.trim() && u.email ? (
                      <span className="truncate text-muted-foreground text-xs">{u.email}</span>
                    ) : null}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
