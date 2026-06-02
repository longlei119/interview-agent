import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import {
  signToken,
  verifyToken,
  COOKIE_NAME,
  type SessionPayload,
} from "./session";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export type { SessionPayload };
export { signToken, verifyToken };

export async function setSessionCookie(token: string) {
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function requireAuth(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) throw new Error("UNAUTHORIZED");
  return session;
}

export interface CurrentUser {
  id: string;
  email: string;
  name: string;
  role: string; // user | admin
  canCreate: boolean;
  direction: string | null;
}

// 从 DB 读取完整用户（role/canCreate/direction 等权限相关字段）。
// 这些字段不放进 JWT，每次按需读 DB，保证管理员禁权后立即生效。
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await getSession();
  if (!session) return null;

  // 延迟 import，避免在 Edge 中间件里把 Prisma 打进 bundle
  const { prisma } = await import("./db");
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      canCreate: true,
      direction: true,
    },
  });
  return user;
}

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}

export async function requireAdmin(): Promise<CurrentUser> {
  const user = await requireUser();
  if (user.role !== "admin") throw new Error("FORBIDDEN");
  return user;
}

export { COOKIE_NAME };
