import Link from "next/link";

import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { redirect } from "next/navigation";

import { ListaChamados } from "./_components/ListaChamados";

export const metadata = { title: "Chamados" };

export default async function ChamadosPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Chamados</h1>
          <p className="text-muted-foreground text-sm">
            Gerencie e acompanhe todos os chamados.
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/chamados/novo">
            <Plus className="mr-2 h-4 w-4" />
            Novo Chamado
          </Link>
        </Button>
      </div>
      <ListaChamados tipoConta={user.tipoConta} />
    </div>
  );
}
