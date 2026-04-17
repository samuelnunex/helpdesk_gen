import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/get-current-user";

import { GerenciarSetores } from "./_components/GerenciarSetores";

export const metadata = { title: "Setores" };

export default async function SetoresPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");
  if (user.tipoConta !== "admin") redirect("/unauthorized");

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Setores</h1>
        <p className="text-muted-foreground text-sm">
          Gerencie os setores e seus gestores responsáveis.
        </p>
      </div>
      <GerenciarSetores />
    </div>
  );
}
