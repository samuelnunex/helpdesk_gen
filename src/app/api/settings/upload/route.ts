import { NextResponse } from "next/server";

import { eq } from "drizzle-orm";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { requireUser } from "@/lib/auth/require-user";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { getAppSettings, updateAppSettings } from "@/lib/settings/app-settings";

const MAX_SIZE = 5 * 1024 * 1024; // 5MB para imagem de login; 2MB para logos
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

const KIND_TO_KEY = {
  auth_hero: "auth_hero_image",
  logo_sidebar: "logo_sidebar_url",
  logo_sidebar_dark: "logo_sidebar_url_dark",
  logo_sidebar_icon: "logo_sidebar_icon_url",
  logo_sidebar_icon_dark: "logo_sidebar_icon_url_dark",
  logo_auth: "logo_auth_url",
  logo_auth_dark: "logo_auth_url_dark",
} as const;

type UploadKind = keyof typeof KIND_TO_KEY;

export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  const [user] = await db
    .select({ tipoConta: users.tipoConta })
    .from(users)
    .where(eq(users.id, auth.id))
    .limit(1);

  if (!user || user.tipoConta !== "admin") {
    return NextResponse.json({ error: "Apenas administradores podem enviar imagens." }, { status: 403 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const kind = formData.get("kind") as string | null;

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "Nenhum arquivo enviado." }, { status: 400 });
    }
    if (!kind || !(kind in KIND_TO_KEY)) {
      return NextResponse.json({
        error: "Tipo inválido (auth_hero, logo_sidebar, logo_sidebar_dark, logo_sidebar_icon, logo_sidebar_icon_dark, logo_auth, logo_auth_dark).",
      }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Formato inválido. Use JPEG, PNG ou WebP." }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "Imagem muito grande. Máximo 5 MB." }, { status: 400 });
    }

    const key = KIND_TO_KEY[kind as UploadKind];
    const current = await getAppSettings();
    const currentUrl = (current as Record<string, string>)[key] ?? "";

    if (currentUrl.startsWith("/uploads/settings/")) {
      const oldPath = join(process.cwd(), "public", currentUrl);
      await unlink(oldPath).catch(() => undefined);
    }

    const ext = EXT[file.type] ?? "jpg";
    const filename = `${kind}-${Date.now()}.${ext}`;
    const dir = join(process.cwd(), "public", "uploads", "settings");
    await mkdir(dir, { recursive: true });
    const filepath = join(dir, filename);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filepath, buffer);

    const url = `/uploads/settings/${filename}`;
    const settings = await updateAppSettings({ [key]: url });

    return NextResponse.json({ url, settings });
  } catch (err) {
    console.error("Settings upload error:", err);
    return NextResponse.json({ error: "Erro ao enviar imagem." }, { status: 500 });
  }
}
