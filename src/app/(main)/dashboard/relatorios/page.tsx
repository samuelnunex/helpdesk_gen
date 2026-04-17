import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { canVerRelatoriosSetor } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { setores } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

import { DashboardRelatorios } from "./_components/DashboardRelatorios";

export const metadata = { title: "Relatórios" };

export default async function RelatoriosPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");
  if (!canVerRelatoriosSetor(user)) redirect("/unauthorized");

  let setorGestorId: string | null = null;
  if (user.tipoConta === "gestor_setor") {
    const [setor] = await db
      .select({ id: setores.id })
      .from(setores)
      .where(eq(setores.gestorId, user.id))
      .limit(1);
    setorGestorId = setor?.id ?? null;
  }

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Relatórios</h1>
        <p className="text-muted-foreground text-sm">
          Métricas e desempenho dos chamados.
        </p>
      </div>
      <DashboardRelatorios
        tipoConta={user.tipoConta}
        setorGestorId={setorGestorId}
      />
    </div>
  );
}
