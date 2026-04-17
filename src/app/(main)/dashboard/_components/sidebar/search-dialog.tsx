"use client";

import * as React from "react";

import { useRouter } from "next/navigation";

import { LayoutDashboard, Search, UserCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

const searchItems = [
  { group: "Painéis", icon: LayoutDashboard, label: "Início", url: "/dashboard" },
  { group: "Páginas", icon: UserCircle, label: "Meu Perfil", url: "/dashboard/account" },
];

export function SearchDialog() {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "j" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const handleSelect = (url: string) => {
    setOpen(false);
    router.push(url);
  };

  return (
    <>
      <Button
        variant="link"
        className="!px-0 font-normal text-muted-foreground hover:no-underline"
        onClick={() => setOpen(true)}
      >
        <Search className="size-4" />
        Buscar
        <kbd className="inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-medium text-[10px]">
          <span className="text-xs">⌘</span>J
        </kbd>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Buscar páginas…" />
        <CommandList>
          <CommandEmpty>Nenhum resultado.</CommandEmpty>
          {[...new Set(searchItems.map((item) => item.group))].map((group) => (
            <CommandGroup heading={group} key={group}>
              {searchItems
                .filter((item) => item.group === group)
                .map((item) => (
                  <CommandItem className="!py-1.5" key={item.label} onSelect={() => handleSelect(item.url)}>
                    {item.icon && <item.icon />}
                    <span>{item.label}</span>
                  </CommandItem>
                ))}
            </CommandGroup>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  );
}
