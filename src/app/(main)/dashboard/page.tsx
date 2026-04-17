import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getChamadosDashboardStats } from "@/lib/chamados/get-chamados-dashboard-stats";

import { ChamadosDashboard } from "./_components/chamados-dashboard";

export const metadata = {
  title: "Início",
};

export default async function Page() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const stats = await getChamadosDashboardStats(user);

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <ChamadosDashboard stats={stats} />
    </div>
  );
}
