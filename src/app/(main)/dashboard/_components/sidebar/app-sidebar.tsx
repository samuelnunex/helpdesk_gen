"use client";

import Link from "next/link";

import { Command } from "lucide-react";
import { useShallow } from "zustand/react/shallow";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import type { CurrentUser } from "@/lib/auth/get-current-user";
import { filterSidebarNavForUser } from "@/lib/navigation/filter-sidebar-nav";
import { getLogoSizeClasses, type LogoSizeValue } from "@/lib/settings/logo-size";
import { sidebarItems } from "@/navigation/sidebar/sidebar-items";
import { usePreferencesStore } from "@/stores/preferences/preferences-provider";

import { NavMain } from "./nav-main";
import { NavUser } from "./nav-user";

export function AppSidebar({
  currentUser,
  logoSize = "medium",
  logoSidebarUrl,
  logoSidebarUrlDark,
  logoSidebarIconUrl,
  logoSidebarIconUrlDark,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  currentUser: CurrentUser | null;
  appName?: string;
  logoSize?: LogoSizeValue;
  logoSidebarUrl?: string;
  logoSidebarUrlDark?: string;
  logoSidebarIconUrl?: string;
  logoSidebarIconUrlDark?: string;
}) {
  const { state: sidebarState } = useSidebar();
  const sizeClasses = getLogoSizeClasses(logoSize);
  const { sidebarVariant, sidebarCollapsible, isSynced, resolvedThemeMode } = usePreferencesStore(
    useShallow((s) => ({
      sidebarVariant: s.sidebarVariant,
      sidebarCollapsible: s.sidebarCollapsible,
      isSynced: s.isSynced,
      resolvedThemeMode: s.resolvedThemeMode,
    })),
  );

  const logoUrl =
    resolvedThemeMode === "dark"
      ? (logoSidebarUrlDark?.trim() || logoSidebarUrl?.trim())
      : logoSidebarUrl?.trim();

  const iconUrl =
    resolvedThemeMode === "dark"
      ? (logoSidebarIconUrlDark?.trim() || logoSidebarIconUrl?.trim())
      : logoSidebarIconUrl?.trim();

  const displayLogoUrl = sidebarState === "collapsed" ? (iconUrl || logoUrl) : logoUrl;

  const variant = isSynced ? sidebarVariant : props.variant;
  const collapsible = isSynced ? sidebarCollapsible : props.collapsible;

  const navItems = filterSidebarNavForUser(currentUser, sidebarItems);

  return (
    <Sidebar {...props} variant={variant} collapsible={collapsible}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link
                prefetch={false}
                href="/dashboard"
                className={`flex w-full items-center justify-center overflow-hidden ${sizeClasses.container}`}
              >
                {displayLogoUrl ? (
                  <img
                    src={displayLogoUrl}
                    alt=""
                    className={`${sizeClasses.img} w-auto max-w-full shrink-0 object-contain`}
                  />
                ) : (
                  <Command className={`${sizeClasses.icon} shrink-0`} />
                )}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navItems} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={currentUser} />
      </SidebarFooter>
    </Sidebar>
  );
}
