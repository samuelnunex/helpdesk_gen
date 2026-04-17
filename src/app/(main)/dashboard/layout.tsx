import type { ReactNode } from "react";

import { cookies } from "next/headers";

import { AppSidebar } from "@/app/(main)/dashboard/_components/sidebar/app-sidebar";
import { NotificacoesBell } from "@/components/ui/notificacoes-bell";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { SIDEBAR_COLLAPSIBLE_VALUES, SIDEBAR_VARIANT_VALUES } from "@/lib/preferences/layout";
import { getAppSettings, type LogoSizeValue } from "@/lib/settings/app-settings";
import { getPreference } from "@/server/server-actions";

import { ChamadosRealtimeProvider } from "./_components/chamados-realtime-provider";
import { AccountSwitcher } from "./_components/sidebar/account-switcher";
import { LayoutControls } from "./_components/sidebar/layout-controls";
import { SearchDialog } from "./_components/sidebar/search-dialog";
import { ThemeSwitcher } from "./_components/sidebar/theme-switcher";

export default async function Layout({ children }: Readonly<{ children: ReactNode }>) {
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false";
  const [variant, collapsible, currentUser, settings] = await Promise.all([
    getPreference("sidebar_variant", SIDEBAR_VARIANT_VALUES, "inset"),
    getPreference("sidebar_collapsible", SIDEBAR_COLLAPSIBLE_VALUES, "icon"),
    getCurrentUser(),
    getAppSettings().catch(() => ({
      app_name: "",
      logo_size: "medium",
      logo_sidebar_url: "",
      logo_sidebar_url_dark: "",
      logo_sidebar_icon_url: "",
      logo_sidebar_icon_url_dark: "",
    })),
  ]);

  const logoSize: LogoSizeValue = (settings.logo_size ?? "medium") as LogoSizeValue;

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppSidebar
        variant={variant}
        collapsible={collapsible}
        currentUser={currentUser}
        logoSize={logoSize}
        logoSidebarUrl={settings.logo_sidebar_url?.trim() || undefined}
        logoSidebarUrlDark={settings.logo_sidebar_url_dark?.trim() || undefined}
        logoSidebarIconUrl={settings.logo_sidebar_icon_url?.trim() || undefined}
        logoSidebarIconUrlDark={settings.logo_sidebar_icon_url_dark?.trim() || undefined}
      />
      <SidebarInset>
        <header
          className={
            "flex h-12 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 [html[data-navbar-style=sticky]_&]:sticky [html[data-navbar-style=sticky]_&]:top-0 [html[data-navbar-style=sticky]_&]:z-50 [html[data-navbar-style=sticky]_&]:overflow-hidden [html[data-navbar-style=sticky]_&]:rounded-t-[inherit] [html[data-navbar-style=sticky]_&]:bg-background/50 [html[data-navbar-style=sticky]_&]:backdrop-blur-md"
          }
        >
          <div className="flex w-full items-center justify-between px-4 lg:px-6">
            <div className="flex items-center gap-1 lg:gap-2">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mx-2 data-[orientation=vertical]:h-4" />
              <SearchDialog />
            </div>
            <div className="flex items-center gap-2">
              <LayoutControls />
              <ThemeSwitcher />
              <NotificacoesBell />
              <AccountSwitcher user={currentUser} />
            </div>
          </div>
        </header>
        <div className="min-h-0 flex-1 p-4 md:p-6">
          <ChamadosRealtimeProvider>{children}</ChamadosRealtimeProvider>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
