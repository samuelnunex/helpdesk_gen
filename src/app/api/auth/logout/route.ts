import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { eq } from "drizzle-orm";

import { AUTH_COOKIE_NAME } from "@/lib/auth/cookies";
import { verifyToken } from "@/lib/auth/jwt";
import { db } from "@/lib/db";
import { sessoes } from "@/lib/db/schema";

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (token) {
    const payload = await verifyToken(token);
    if (payload?.sid) {
      await db.delete(sessoes).where(eq(sessoes.id, payload.sid));
    }
  }
  cookieStore.delete(AUTH_COOKIE_NAME);
  return NextResponse.json({ ok: true });
}
