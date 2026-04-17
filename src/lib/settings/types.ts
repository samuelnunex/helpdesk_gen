/**
 * Tipos das configurações do app. Sem dependências de Node/db.
 * Pode ser importado em Client Components.
 */

import type { LogoSizeValue } from "./logo-size";

export type ThemeDefaultValue = "light" | "dark" | "system";

export type AppSettingsValues = {
  auth_hero_image: string;
  theme_default: ThemeDefaultValue;
  app_name: string;
  logo_size: LogoSizeValue;
  logo_sidebar_url: string;
  logo_sidebar_url_dark: string;
  logo_sidebar_icon_url: string;
  logo_sidebar_icon_url_dark: string;
  logo_auth_url: string;
  logo_auth_url_dark: string;
};
