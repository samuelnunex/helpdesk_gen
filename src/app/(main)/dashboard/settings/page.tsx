import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getAppSettings } from "@/lib/settings/app-settings";

import { SettingsForm } from "./_components/settings-form";

export const metadata = {
  title: "Configurações",
  description:
    "Marca e aparência do painel, categorias e SLA de chamados, e gestão de usuários (admin).",
};

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/auth/login?from=/dashboard/settings");
  }
  if (user.tipoConta !== "admin") {
    redirect("/dashboard");
  }

  const settings = await getAppSettings();

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-semibold text-2xl tracking-tight">Configurações</h1>
        <p className="text-muted-foreground text-sm">
          Marca do painel, regras de chamados e contas de usuário.
        </p>
      </div>
      <SettingsForm defaultValues={settings} />
    </div>
  );
}
