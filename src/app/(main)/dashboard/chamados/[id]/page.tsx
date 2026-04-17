import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { canAlterarStatus, canAtribuirChamado, canVerProcessoCompletoChamado } from "@/lib/auth/permissions";

import { DetalhesChamado } from "./_components/DetalhesChamado";

export const metadata = { title: "Chamado" };

export default async function ChamadoPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const { id } = await params;

  return (
    <DetalhesChamado
      chamadoId={id}
      userId={user.id}
      podeAlterarStatus={canAlterarStatus(user)}
      podeAtribuir={canAtribuirChamado(user)}
      podeVerProcessoCompleto={canVerProcessoCompletoChamado(user)}
    />
  );
}
