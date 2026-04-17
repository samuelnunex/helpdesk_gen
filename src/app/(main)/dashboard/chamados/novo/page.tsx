import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/get-current-user";

import { FormNovoChamado } from "./_components/FormNovoChamado";

export const metadata = { title: "Novo Chamado" };

export default async function NovoChamadoPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Novo Chamado</h1>
        <p className="text-muted-foreground text-sm">
          Preencha os detalhes para abrir um novo chamado.
        </p>
      </div>
      <FormNovoChamado userId={user.id} />
    </div>
  );
}
