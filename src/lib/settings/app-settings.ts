import { inArray } from "drizzle-orm";

import { db } from "@/lib/db";
import { appSettings } from "@/lib/db/schema";
import { APP_CONFIG } from "@/config/app-config";

import type { AppSettingsValues, ThemeDefaultValue } from "./types";
import type { LogoSizeValue } from "./logo-size";

export type { AppSettingsValues, ThemeDefaultValue, LogoSizeValue };
export { LOGO_SIZE_OPTIONS, getLogoSizeClasses } from "./logo-size";

const SETTING_KEYS = [
  "auth_hero_image",
  "theme_default",
  "app_name",
  "logo_size",
  "logo_sidebar_url",
  "logo_sidebar_url_dark",
  "logo_sidebar_icon_url",
  "logo_sidebar_icon_url_dark",
  "logo_auth_url",
  "logo_auth_url_dark",
] as const;

const LOGO_SIZE_VALUES: LogoSizeValue[] = ["small", "medium", "large"];

const DEFAULTS: AppSettingsValues = {
  auth_hero_image: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&q=80",
  theme_default: "light",
  app_name: APP_CONFIG.name,
  logo_size: "medium",
  logo_sidebar_url: "",
  logo_sidebar_url_dark: "",
  logo_sidebar_icon_url: "",
  logo_sidebar_icon_url_dark: "",
  logo_auth_url: "",
  logo_auth_url_dark: "",
};

const THEME_VALUES: ThemeDefaultValue[] = ["light", "dark", "system"];

function parseValue(key: string, valor: string): string {
  if (key === "theme_default") {
    return THEME_VALUES.includes(valor as ThemeDefaultValue) ? valor : DEFAULTS.theme_default;
  }
  if (key === "logo_size") {
    return LOGO_SIZE_VALUES.includes(valor as LogoSizeValue) ? valor : DEFAULTS.logo_size;
  }
  return valor;
}

export async function getAppSettings(): Promise<AppSettingsValues> {
  const rows = await db
    .select()
    .from(appSettings)
    .where(inArray(appSettings.chave, [...SETTING_KEYS]));

  const map = new Map(rows.map((r) => [r.chave, r.valor]));
  return {
    auth_hero_image: parseValue("auth_hero_image", map.get("auth_hero_image") ?? DEFAULTS.auth_hero_image),
    theme_default: parseValue("theme_default", map.get("theme_default") ?? DEFAULTS.theme_default) as ThemeDefaultValue,
    app_name: map.get("app_name")?.trim() || DEFAULTS.app_name,
    logo_size: parseValue("logo_size", map.get("logo_size") ?? DEFAULTS.logo_size) as LogoSizeValue,
    logo_sidebar_url: map.get("logo_sidebar_url")?.trim() ?? DEFAULTS.logo_sidebar_url,
    logo_sidebar_url_dark: map.get("logo_sidebar_url_dark")?.trim() ?? DEFAULTS.logo_sidebar_url_dark,
    logo_sidebar_icon_url: map.get("logo_sidebar_icon_url")?.trim() ?? DEFAULTS.logo_sidebar_icon_url,
    logo_sidebar_icon_url_dark: map.get("logo_sidebar_icon_url_dark")?.trim() ?? DEFAULTS.logo_sidebar_icon_url_dark,
    logo_auth_url: map.get("logo_auth_url")?.trim() ?? DEFAULTS.logo_auth_url,
    logo_auth_url_dark: map.get("logo_auth_url_dark")?.trim() ?? DEFAULTS.logo_auth_url_dark,
  };
}

export async function updateAppSettings(partial: Partial<AppSettingsValues>): Promise<AppSettingsValues> {
  const keys = Object.keys(partial) as (keyof AppSettingsValues)[];
  for (const key of keys) {
    if (!SETTING_KEYS.includes(key)) continue;
    const value = partial[key];
    if (value === undefined) continue;
    await db
      .insert(appSettings)
      .values({
        chave: key,
        valor: String(value).trim(),
        atualizadoEm: new Date(),
      })
      .onConflictDoUpdate({
        target: appSettings.chave,
        set: {
          valor: String(value).trim(),
          atualizadoEm: new Date(),
        },
      });
  }
  return getAppSettings();
}

export { SETTING_KEYS, DEFAULTS };
