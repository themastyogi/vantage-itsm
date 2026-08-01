import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { db } from "./db";
import { users } from "./db/schema";
import { eq } from "drizzle-orm";

const SESSION_COOKIE = "itsm_session";
// jose needs the secret as bytes. Using Edge-compatible jose (not jsonwebtoken,
// which depends on Node's crypto module and silently fails in middleware's
// default Edge runtime) so sessions verify the same way in middleware and route handlers.
const JWT_SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET || "dev-secret-change-me-in-prod"
);
const SESSION_TTL_SECONDS = 60 * 60 * 8; // 8 hours — short-lived session for an enterprise tool

export type Role = "admin" | "agent" | "approver" | "requester";

export interface SessionPayload {
  sub: string; // user id
  email: string;
  role: Role;
  name: string;
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function signSession(payload: SessionPayload) {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(JWT_SECRET);
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

/** Set the session cookie: httpOnly + secure + sameSite=strict to resist XSS/CSRF token theft. */
export async function createSessionCookie(payload: SessionPayload) {
  const token = await signSession(payload);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySession(token);
}

export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) throw new Error("UNAUTHENTICATED");
  return session;
}

/** Simple RBAC: pass the roles allowed to perform the action. */
export function assertRole(session: SessionPayload, allowed: Role[]) {
  if (!allowed.includes(session.role)) {
    throw new Error("FORBIDDEN");
  }
}

export async function getUserByEmail(email: string) {
  const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return rows[0] ?? null;
}

export async function getUserById(id: string) {
  const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return rows[0] ?? null;
}
