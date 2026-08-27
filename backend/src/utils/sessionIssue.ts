import type { Context } from "hono";
import { sign } from "hono/jwt";
import { setCookie } from "hono/cookie";
import config from "config";
import db from "../db";
import { sessions } from "../db/schema";
import { cookieOptions } from "./sessionAuth";

/**
 * Create a DB-backed session for the given user and set the JWT session cookie.
 * Shared by local login, registration, SAML callback and LDAP login.
 */
export async function issueSession(c: Context, userId: number): Promise<void> {
  const expirationDate = new Date();
  expirationDate.setDate(expirationDate.getDate() + 1); // 24 hours

  const session = await db
    .insert(sessions)
    .values({
      userId,
      expiresAt: expirationDate,
      userAgent: c.req.header("user-agent") || undefined,
      ipAddress:
        c.req.header("x-forwarded-for") || (c.env as { ip?: string }).ip || undefined,
    })
    .returning();

  const payload = {
    sessionId: session[0].id,
    exp: Math.floor(expirationDate.getTime() / 1000),
  };
  const sessionToken = await sign(payload, config.get("authTokenSecret")!);
  setCookie(c, "sessionToken", sessionToken, cookieOptions);
}
