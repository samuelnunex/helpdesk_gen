import Link from "next/link";

import { Lock } from "lucide-react";

export const metadata = {
  title: "Não autorizado",
};

export default function page() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-md text-center">
        <Lock className="mx-auto size-12 text-primary" />
        <h1 className="mt-4 font-bold text-3xl tracking-tight sm:text-4xl">Acesso não autorizado</h1>
        <p className="mt-4 text-muted-foreground">
          Você não tem permissão para ver este conteúdo. Entre em contato com o administrador se achar que é um erro.
        </p>
        <div className="mt-6">
          <Link
            href="dashboard"
            className="inline-flex items-center rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground text-sm shadow-xs transition-colors hover:bg-primary/90 focus:outline-hidden focus:ring-2 focus:ring-primary focus:ring-offset-2"
            prefetch={false}
          >
            Ir ao início
          </Link>
        </div>
      </div>
    </div>
  );
}
