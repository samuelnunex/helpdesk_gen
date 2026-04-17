"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { BadgeCheck, Bell, CreditCard, LogOut, Settings } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getInitials } from "@/lib/utils";

type CurrentUser = {
  id: string;
  email: string;
  name: string | null;
  fotoPerfil?: string | null;
  tipoConta?: string;
} | null;

export function AccountSwitcher({ user }: { user: CurrentUser }) {
  const router = useRouter();
  const displayName = user?.name?.trim() || user?.email || "Usuário";

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/auth/login");
    router.refresh();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Avatar className="size-9 rounded-lg">
          <AvatarImage src={user?.fotoPerfil ?? undefined} alt={displayName} />
          <AvatarFallback className="rounded-lg">{getInitials(displayName)}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-56 space-y-1 rounded-lg" side="bottom" align="end" sideOffset={4}>
        {user && (
          <>
            <div className="px-2 py-1.5 text-sm">
              <p className="truncate font-medium">{displayName}</p>
              <p className="truncate text-muted-foreground text-xs">{user.email}</p>
            </div>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="/dashboard/account">
              <BadgeCheck />
              Meu Perfil
            </Link>
          </DropdownMenuItem>
          {user?.tipoConta === "admin" && (
            <DropdownMenuItem asChild>
              <Link href="/dashboard/settings">
                <Settings />
                Configurações
              </Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem disabled>
            <CreditCard />
            Cobrança
          </DropdownMenuItem>
          <DropdownMenuItem disabled>
            <Bell />
            Notificações
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut />
          {user ? "Sair" : "Entrar"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
