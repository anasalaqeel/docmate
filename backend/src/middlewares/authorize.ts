import type { Context as HonoContext, Next } from "hono";
import { getCookie } from "hono/cookie";
import { verify } from "hono/jwt";
import db from "../db";
import { sessions, users } from "../db/schema";
import { eq } from "drizzle-orm";
import config from "config";
import { isValidSession } from "../utils/sessionAuth";

interface Context extends HonoContext {
  get(key: "user"): typeof users;
}

export function authorize(allowedRoles: string[]) {
  return async (c: Context, next: Next) => {
    try {
      const token = getCookie(c, "sessionToken");
      if (!token) {
        return c.json({ message: "Unauthorized: No session token" }, 401);
      }

      if (!/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/.test(token)) {
        return c.json({ message: "Unauthorized: Invalid token format" }, 401);
      }

      const payload = await verify(token, config.get("authTokenSecret")!);
      const { sessionId } = payload as { sessionId?: number };
      if (!sessionId) {
        return c.json({ message: "Unauthorized: Missing sessionId" }, 401);
      }

      const session = await db.query.sessions.findFirst({
        where: eq(sessions.id, Number(sessionId)),
      });
      if (!isValidSession(session)) {
        return c.json({ message: "Unauthorized: Invalid or expired session" }, 401);
      }

      const user = await db.query.users.findFirst({
        where: eq(users.id, session.userId),
        with: {
          userRoles: {
            with: {
              role: true,
            },
          },
        },
      });

      if (!user) {
        return c.json({ message: "Unauthorized: User not found" }, 401);
      }

      const userRoleNames = user.userRoles
        .map((ur) => ur.role?.name)
        .filter((name): name is string => name !== null && name !== undefined);

      if (!allowedRoles.some((role) => userRoleNames.includes(role))) {
        return c.json({ message: "Forbidden: Insufficient permissions" }, 403);
      }

      await db
        .update(sessions)
        .set({ lastActivityAt: new Date() })
        .where(eq(sessions.id, session.id));

      c.set("user", user);
      await next();
    } catch (error) {
      console.error("Authorization error:", error);
      if (error instanceof Error) {
        return c.json({ message: `Authentication failed: ${error.message}` }, 401);
      }
      return c.json({ message: "Internal Server Error" }, 500);
    }
  };
}
