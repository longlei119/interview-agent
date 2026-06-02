import { SignJWT, jwtVerify } from "jose";

// 纯 JWT/会话逻辑，不引入 Prisma 或 next/headers，
// 这样 Edge 中间件可以安全引用而不会把 Prisma 打进 bundle。

const COOKIE_NAME = "session";
const encoder = new TextEncoder();

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("缺少环境变量 JWT_SECRET");
  return encoder.encode(secret);
}

export interface SessionPayload {
  userId: string;
  email: string;
  name: string;
}

export async function signToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret());
}

export async function verifyToken(
  token: string
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return {
      userId: payload.userId as string,
      email: payload.email as string,
      name: payload.name as string,
    };
  } catch {
    return null;
  }
}

export { COOKIE_NAME };
