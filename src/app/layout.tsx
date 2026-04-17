import type { ReactNode } from "react";

import type { Metadata } from "next";

import { Toaster } from "@/components/ui/sonner";
import { APP_CONFIG } from "@/config/app-config";
import { fontVars } from "@/lib/fonts/registry";
import { PREFERENCE_DEFAULTS } from "@/lib/preferences/preferences-config";
import { getAppSettings } from "@/lib/settings/app-settings";
import { ThemeBootScript } from "@/scripts/theme-boot";
import { PreferencesStoreProvider } from "@/stores/preferences/preferences-provider";

import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  let appName = APP_CONFIG.meta.title;
  try {
    const settings = await getAppSettings();
    if (settings.app_name?.trim()) appName = settings.app_name.trim();
  } catch {
    // mantém APP_CONFIG
  }
  return {
    title: {
      default: appName,
      template: `${appName} - %s`,
    },
    description: APP_CONFIG.meta.description,
  };
}

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  let themeDefault: "light" | "dark" | "system" = PREFERENCE_DEFAULTS.theme_mode;
  try {
    const settings = await getAppSettings();
    if (settings.theme_default) themeDefault = settings.theme_default;
  } catch {
    // Usa PREFERENCE_DEFAULTS se a tabela não existir ou DB indisponível
  }

  const { theme_preset, content_layout, navbar_style, sidebar_variant, sidebar_collapsible, font } =
    PREFERENCE_DEFAULTS;

  return (
    <html
      lang="pt-BR"
      data-theme-mode={themeDefault}
      data-theme-preset={theme_preset}
      data-content-layout={content_layout}
      data-navbar-style={navbar_style}
      data-sidebar-variant={sidebar_variant}
      data-sidebar-collapsible={sidebar_collapsible}
      data-font={font}
      suppressHydrationWarning
    >
      <head>
        {/* Applies theme and layout preferences on load to avoid flicker and unnecessary server rerenders. */}
        <ThemeBootScript defaultThemeMode={themeDefault} />
      </head>
      <body className={`${fontVars} min-h-screen antialiased`}>
        <PreferencesStoreProvider
          themeMode={themeDefault}
          themePreset={theme_preset}
          contentLayout={content_layout}
          navbarStyle={navbar_style}
          font={font}
        >
          {children}
          <Toaster />
        </PreferencesStoreProvider>
      </body>
    </html>
  );
}
