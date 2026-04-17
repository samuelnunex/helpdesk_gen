import type { ReactNode } from "react";

import Image from "next/image";
import { Command } from "lucide-react";

import { APP_CONFIG } from "@/config/app-config";
import { getAppSettings } from "@/lib/settings/app-settings";
import { getLogoSizeClasses } from "@/lib/settings/logo-size";

const FALLBACK_HERO_IMAGE =
  "https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&q=80";

export default async function AuthLayout({ children }: Readonly<{ children: ReactNode }>) {
  let settings: Awaited<ReturnType<typeof getAppSettings>>;
  try {
    settings = await getAppSettings();
  } catch {
    settings = {
      auth_hero_image: FALLBACK_HERO_IMAGE,
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
  }

  const heroImage = settings.auth_hero_image?.trim() || FALLBACK_HERO_IMAGE;
  const logoAuthLight = settings.logo_auth_url?.trim();
  const logoAuthDark = settings.logo_auth_url_dark?.trim();
  const logoLightSrc = logoAuthLight || logoAuthDark;
  const logoDarkSrc = logoAuthDark || logoAuthLight;
  const logoSize = settings.logo_size ?? "medium";
  const sizeClasses = getLogoSizeClasses(logoSize);
  const isUploadHero = heroImage.startsWith("/uploads/");

  return (
    <main>
      <div className="grid h-dvh justify-center p-2 lg:grid-cols-2">
        <div className="relative order-2 hidden h-full min-h-0 overflow-hidden rounded-3xl lg:block">
          {isUploadHero ? (
            <img
              src={heroImage}
              alt=""
              className="absolute inset-0 size-full object-cover"
              sizes="50vw"
              fetchPriority="high"
            />
          ) : (
            <Image
              src={heroImage}
              alt=""
              fill
              className="object-cover"
              priority
              sizes="50vw"
              unoptimized={!heroImage.startsWith("https://images.unsplash.com")}
            />
          )}
          <div className="absolute inset-0 bg-primary/85" />
          <div className="absolute top-10 flex items-center gap-0 px-10 text-primary-foreground">
            {/* Tema claro: mostra logo dark (invertido para melhor contraste) */}
            <span className={`dark:hidden flex items-center ${sizeClasses.container}`}>
              {logoDarkSrc ? (
                <img
                  src={logoDarkSrc}
                  alt=""
                  className={`${sizeClasses.img} w-auto object-contain ${sizeClasses.authMaxWidth}`}
                />
              ) : (
                <Command className={`${sizeClasses.icon} shrink-0`} />
              )}
            </span>
            {/* Tema escuro: mostra logo light (invertido para melhor contraste) */}
            <span className={`hidden dark:flex items-center ${sizeClasses.container}`}>
              {logoLightSrc ? (
                <img
                  src={logoLightSrc}
                  alt=""
                  className={`${sizeClasses.img} w-auto object-contain ${sizeClasses.authMaxWidth}`}
                />
              ) : (
                <Command className={`${sizeClasses.icon} shrink-0`} />
              )}
            </span>
          </div>
        </div>
        <div className="relative order-1 flex h-full">{children}</div>
      </div>
    </main>
  );
}
