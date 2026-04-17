import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/get-current-user";

import { ListaTodasNotificacoes } from "./_components/ListaTodasNotificacoes";

export const metadata = { title: "Notificações" };

export default async function NotificacoesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Notificações</h1>
        <p className="text-muted-foreground text-sm">Histórico completo das suas notificações do helpdesk.</p>
      </div>
      <ListaTodasNotificacoes />
    </div>
  );
}
