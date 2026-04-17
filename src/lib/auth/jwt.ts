import * as jose from "jose";

const secret = () => {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error("JWT_SECRET is not set");
  return new TextEncoder().encode(s);
};

const expiresIn = process.env.JWT_EXPIRES_IN ?? "7d";

export type JwtPayload = {
  sub: string;
  email: string;
  sid?: string;
  iat?: number;
  exp?: number;
};

export async function signToken(payload: { sub: string; email: string; sid?: string }): Promise<string> {
  return new jose.SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secret());
}

export async function verifyToken(token: string): Promise<JwtPayload | null> {
  try {
    const { payload } = await jose.jwtVerify(token, secret());
    return {
      sub: payload.sub as string,
      email: (payload.email as string) ?? (payload.sub as string),
      sid: payload.sid as string | undefined,
      iat: payload.iat,
      exp: payload.exp,
    };
  } catch {
    return null;
  }
}
