import { NextResponse } from "next/server";

import { eq } from "drizzle-orm";
import { unlink } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";

import { requireUser } from "@/lib/auth/require-user";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import {
  getAppSettings,
  updateAppSettings,
  type ThemeDefaultValue,
  type LogoSizeValue,
} from "@/lib/settings/app-settings";

const ThemeDefaultSchema = z.enum(["light", "dark", "system"]);
const LogoSizeSchema = z.enum(["small", "medium", "large"]);

const PatchBodySchema = z.object({
  auth_hero_image: z.string().max(2000).optional(),
  theme_default: ThemeDefaultSchema.optional(),
  app_name: z.string().min(1).max(100).optional(),
  logo_size: LogoSizeSchema.optional(),
  logo_sidebar_url: z.string().max(2000).optional(),
  logo_sidebar_url_dark: z.string().max(2000).optional(),
  logo_sidebar_icon_url: z.string().max(2000).optional(),
  logo_sidebar_icon_url_dark: z.string().max(2000).optional(),
  logo_auth_url: z.string().max(2000).optional(),
  logo_auth_url_dark: z.string().max(2000).optional(),
});

export async function GET() {
  try {
    const settings = await getAppSettings();
    return NextResponse.json(settings);
  } catch (err) {
    console.error("Settings GET error:", err);
    return NextResponse.json({ error: "Erro ao carregar configurações." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  const [user] = await db
    .select({ tipoConta: users.tipoConta })
    .from(users)
    .where(eq(users.id, auth.id))
    .limit(1);

  if (!user || user.tipoConta !== "admin") {
    return NextResponse.json({ error: "Apenas administradores podem alterar as configurações." }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = PatchBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos.", details: parsed.error.flatten() }, { status: 400 });
    }

    const update: Partial<{
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
    }> = {};
    if (parsed.data.auth_hero_image !== undefined) update.auth_hero_image = parsed.data.auth_hero_image;
    if (parsed.data.theme_default !== undefined) update.theme_default = parsed.data.theme_default;
    if (parsed.data.app_name !== undefined) update.app_name = parsed.data.app_name;
    if (parsed.data.logo_size !== undefined) update.logo_size = parsed.data.logo_size;
    if (parsed.data.logo_sidebar_url !== undefined) update.logo_sidebar_url = parsed.data.logo_sidebar_url;
    if (parsed.data.logo_sidebar_url_dark !== undefined) update.logo_sidebar_url_dark = parsed.data.logo_sidebar_url_dark;
    if (parsed.data.logo_sidebar_icon_url !== undefined) update.logo_sidebar_icon_url = parsed.data.logo_sidebar_icon_url;
    if (parsed.data.logo_sidebar_icon_url_dark !== undefined) update.logo_sidebar_icon_url_dark = parsed.data.logo_sidebar_icon_url_dark;
    if (parsed.data.logo_auth_url !== undefined) update.logo_auth_url = parsed.data.logo_auth_url;
    if (parsed.data.logo_auth_url_dark !== undefined) update.logo_auth_url_dark = parsed.data.logo_auth_url_dark;

    const current = await getAppSettings();
    const imageKeys = [
      "auth_hero_image",
      "logo_sidebar_url",
      "logo_sidebar_url_dark",
      "logo_sidebar_icon_url",
      "logo_sidebar_icon_url_dark",
      "logo_auth_url",
      "logo_auth_url_dark",
    ] as const;
    for (const key of imageKeys) {
      if (!(key in update)) continue;
      const newVal = update[key];
      if (newVal !== "") continue;
      const prev = (current as Record<string, string>)[key];
      if (prev?.startsWith("/uploads/settings/")) {
        await unlink(join(process.cwd(), "public", prev)).catch(() => undefined);
      }
    }

    const settings = await updateAppSettings(update);
    return NextResponse.json(settings);
  } catch (err) {
    console.error("Settings PATCH error:", err);
    return NextResponse.json({ error: "Erro ao salvar configurações." }, { status: 500 });
  }
}
