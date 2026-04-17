import Link from "next/link";

import { Globe } from "lucide-react";

import { APP_CONFIG } from "@/config/app-config";
import { getAppSettings } from "@/lib/settings/app-settings";

import { RegisterForm } from "../_components/register-form";
import { GoogleButton } from "../_components/social-auth/google-button";

export const metadata = {
  title: "Cadastrar",
};

export default async function RegisterPage() {
  let appName = APP_CONFIG.name;
  try {
    const settings = await getAppSettings();
    appName = settings.app_name?.trim() || appName;
  } catch {
    // usa APP_CONFIG.name
  }
  const copyright = `© ${new Date().getFullYear()}, ${appName}.`;

  return (
    <>
      <div className="mx-auto flex w-full flex-col justify-center space-y-8 sm:w-[350px]">
        <div className="space-y-2 text-center">
          <h1 className="font-medium text-3xl">Criar conta</h1>
          <p className="text-muted-foreground text-sm">Preencha os dados para se cadastrar.</p>
        </div>
        <div className="space-y-4">
          <GoogleButton className="w-full" />
          <div className="relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-border after:border-t">
            <span className="relative z-10 bg-background px-2 text-muted-foreground">Ou continue com</span>
          </div>
          <RegisterForm />
        </div>
      </div>

      <div className="absolute top-5 flex w-full justify-end px-10">
        <div className="text-muted-foreground text-sm">
          Já tem conta?{" "}
          <Link prefetch={false} className="text-foreground" href="/auth/login">
            Entrar
          </Link>
        </div>
      </div>

      <div className="absolute bottom-5 flex w-full justify-between px-10">
        <div className="text-sm">{copyright}</div>
        <div className="flex items-center gap-1 text-sm">
          <Globe className="size-4 text-muted-foreground" />
          PT
        </div>
      </div>
    </>
  );
}
