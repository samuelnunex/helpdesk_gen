"use client";

import Link from "next/link";

import { Bell } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNotificacoesStream } from "@/hooks/use-notificacoes-stream";
import { useNotificacoesStore } from "@/stores/notificacoes";

export function NotificacoesBell() {
  useNotificacoesStream();

  const { notificacoes, naoLidasCount, marcarComoLida, marcarTodasLidas } =
    useNotificacoesStore();

  async function handleMarcarLida(id: string) {
    marcarComoLida(id);
    await fetch(`/api/notificacoes/${id}`, { method: "PATCH" });
  }

  async function handleMarcarTodas() {
    marcarTodasLidas();
    await fetch("/api/notificacoes/marcar-todas-lidas", { method: "POST" });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {naoLidasCount > 0 && (
            <Badge
              className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px]"
              variant="destructive"
            >
              {naoLidasCount > 9 ? "9+" : naoLidasCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notificações</span>
          {naoLidasCount > 0 && (
            <Button variant="ghost" size="sm" className="h-auto p-0 text-xs" onClick={handleMarcarTodas}>
              Marcar todas como lidas
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notificacoes.length === 0 ? (
          <div className="py-4 text-center text-sm text-muted-foreground">
            Nenhuma notificação
          </div>
        ) : (
          notificacoes.slice(0, 8).map((n) => (
            <DropdownMenuItem
              key={n.id}
              className="flex flex-col items-start gap-1 py-2 cursor-pointer"
              onClick={() => !n.lida && handleMarcarLida(n.id)}
              asChild={!!n.chamadoId}
            >
              {n.chamadoId ? (
                <Link href={`/dashboard/chamados/${n.chamadoId}`} className="w-full">
                  <div className="flex items-start gap-2 w-full">
                    {!n.lida && (
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                    )}
                    <div className={!n.lida ? "" : "ml-4"}>
                      <p className="text-xs leading-snug">{n.mensagem}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {format(new Date(n.criadoEm), "dd/MM HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                </Link>
              ) : (
                <div className="flex items-start gap-2 w-full">
                  {!n.lida && (
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                  )}
                  <div className={!n.lida ? "" : "ml-4"}>
                    <p className="text-xs leading-snug">{n.mensagem}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {format(new Date(n.criadoEm), "dd/MM HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                </div>
              )}
            </DropdownMenuItem>
          ))
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="cursor-pointer">
          <Link href="/dashboard/notificacoes" className="w-full font-medium">
            Ver todas as notificações
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
