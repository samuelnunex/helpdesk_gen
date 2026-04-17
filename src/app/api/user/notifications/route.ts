import { NextResponse } from "next/server";

import { eq } from "drizzle-orm";
import { z } from "zod";

import { requireUser } from "@/lib/auth/require-user";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

const BodySchema = z.object({
  email: z.boolean().optional(),
  push: z.boolean().optional(),
  sms: z.boolean().optional(),
});

export async function PATCH(request: Request) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos.", details: parsed.error.flatten() }, { status: 400 });
    }

    const update: { notifEmail?: boolean; notifPush?: boolean; notifSms?: boolean } = {};
    if (parsed.data.email !== undefined) update.notifEmail = parsed.data.email;
    if (parsed.data.push !== undefined) update.notifPush = parsed.data.push;
    if (parsed.data.sms !== undefined) update.notifSms = parsed.data.sms;

    const [user] = await db
      .update(users)
      .set({ ...update, updatedAt: new Date() })
      .where(eq(users.id, auth.id))
      .returning({
        notifEmail: users.notifEmail,
        notifPush: users.notifPush,
        notifSms: users.notifSms,
      });

    if (!user) {
      return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });
    }

    return NextResponse.json({
      notifications: {
        email: user.notifEmail,
        push: user.notifPush,
        sms: user.notifSms,
      },
    });
  } catch (err) {
    console.error("Notifications update error:", err);
    return NextResponse.json({ error: "Erro ao atualizar notificações." }, { status: 500 });
  }
}
