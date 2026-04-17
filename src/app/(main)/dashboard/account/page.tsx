import { redirect } from "next/navigation";

import { Calendar, Mail, Shield, User } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/get-current-user";

import { AvatarUpload } from "./_components/avatar-upload";
import { ChangePasswordForm } from "./_components/change-password-form";
import { LoginHistoryList } from "./_components/login-history-list";
import { NotificationsForm } from "./_components/notifications-form";
import { ProfileForm } from "./_components/profile-form";
import { SessionsList } from "./_components/sessions-list";
import { ThemeSection } from "./_components/theme-section";

const TIPO_LABEL: Record<string, string> = {
  admin: "Administrador",
  gestor: "Gestor",
  usuario: "Usuário",
};

const STATUS_LABEL: Record<string, string> = {
  ativo: "Ativo",
  inativo: "Inativo",
  verificado: "Verificado",
  pendente: "Pendente",
};

export const metadata = {
  title: "Meu Perfil",
  description: "Seu perfil e configurações da conta",
};

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/auth/login?from=/dashboard/account");
  }

  const displayName = user.name?.trim() || user.username || user.email;

  return (
    <div className="@container/main flex flex-col gap-6 md:gap-8">
      <div>
        <h1 className="font-semibold text-2xl tracking-tight">Meu Perfil</h1>
        <p className="text-muted-foreground text-sm">Gerencie seu perfil, segurança e preferências.</p>
      </div>

      {/* Perfil + Alterar senha: lado a lado em telas maiores */}
      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr] lg:items-start">
        <Card>
          <CardHeader>
            <CardTitle>Perfil</CardTitle>
            <CardDescription>Nome completo, username (@usuario), bio e dados da conta.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-4">
              <AvatarUpload displayName={displayName} fotoPerfil={user.fotoPerfil} />
              <div className="space-y-1">
                <p className="font-medium leading-none">{displayName}</p>
                <p className="text-muted-foreground text-sm">{user.email}</p>
                {user.username && <p className="text-muted-foreground text-sm">@{user.username}</p>}
              </div>
            </div>

            <dl className="grid gap-3 border-t pt-4 sm:grid-cols-2">
              <div className="flex items-center gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <Calendar className="size-4 text-muted-foreground" />
                </div>
                <div>
                  <dt className="font-medium text-muted-foreground text-xs">Data de criação da conta</dt>
                  <dd className="font-medium text-sm">
                    {new Date(user.createdAt).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })}
                  </dd>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <Shield className="size-4 text-muted-foreground" />
                </div>
                <div>
                  <dt className="font-medium text-muted-foreground text-xs">Tipo de conta</dt>
                  <dd className="font-medium text-sm">{TIPO_LABEL[user.tipoConta] ?? user.tipoConta}</dd>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <User className="size-4 text-muted-foreground" />
                </div>
                <div>
                  <dt className="font-medium text-muted-foreground text-xs">Status</dt>
                  <dd className="font-medium text-sm">{STATUS_LABEL[user.status] ?? user.status}</dd>
                </div>
              </div>
            </dl>

            <ProfileForm
              defaultValues={{
                name: user.name,
                username: user.username,
                bio: user.bio,
              }}
            />
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Alterar senha</CardTitle>
              <CardDescription>Defina uma nova senha. Você será deslogado após a alteração.</CardDescription>
            </CardHeader>
            <CardContent>
              <ChangePasswordForm />
            </CardContent>
          </Card>
          <ThemeSection />
        </div>
      </div>

      {/* Histórico de login + Sessões ativas: lado a lado em telas maiores */}
      <div className="grid gap-6 lg:grid-cols-2">
        <LoginHistoryList />
        <SessionsList />
      </div>

      {/* Notificações */}
      <NotificationsForm />
    </div>
  );
}
