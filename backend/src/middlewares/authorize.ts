import type { Context as HonoContext, Next } from "hono";
import { getCookie } from "hono/cookie";
import { verify } from "hono/jwt";
import db from "../db";
import { sessions, users, roles, permissions } from "../db/schema";
import { eq } from "drizzle-orm";
import config from "config";

type UserWithRelations = typeof users.$inferSelect & {
  userRoles: {
    role: typeof roles.$inferSelect & {
      rolePermissions: {
        permission: typeof permissions.$inferSelect;
      }[];
    };
  }[];
};

interface Context extends HonoContext {
  get(key: "user"): UserWithRelations;
}

export function authorize(allowedRequirements: string[] = []) {
  return async (c: Context, next: Next) => {
    try {
      let token = getCookie(c, "sessionToken");
      if (!token) {
        return c.json({ message: "Unauthorized: No session token" }, 401);
      }

      // Clean token: strip surrounding quotes and whitespace
      token = token.replace(/^["']|["']$/g, "").trim();

      // Handle concatenated cookies (e.g., "token,sessionToken=token")
      if (token.includes(",")) {
        token = token
          .split(",")[0]
          .replace(/^sessionToken=/i, "")
          .trim();
      }

      // Validate token format before verification
      if (!/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/.test(token)) {
        console.error(`Invalid token format detected after cleaning: "${token}"`);
        return c.json({ message: "Unauthorized: Invalid token format" }, 401);
      }

      let payload;
      try {
        payload = await verify(token, config.get("authTokenSecret") as string, "HS256");
      } catch (e) {
        return c.json({ message: "Unauthorized: Invalid token" }, 401);
      }

      const { sessionId } = payload as { sessionId?: number };
      if (!sessionId) {
        return c.json({ message: "Unauthorized: Missing sessionId" }, 401);
      }

      const session = await db.query.sessions.findFirst({
        where: eq(sessions.id, Number(sessionId)),
      });

      if (!session || !session.isActive || !session.userId) {
        return c.json({ message: "Unauthorized: Invalid session" }, 401);
      }

      const user = (await db.query.users.findFirst({
        where: eq(users.id, session.userId),
        with: {
          userRoles: {
            with: {
              role: {
                with: {
                  rolePermissions: {
                    with: {
                      permission: true,
                    },
                  },
                },
              },
            },
          },
        },
      })) as UserWithRelations | undefined;

      if (!user) {
        return c.json({ message: "Unauthorized: User not found" }, 401);
      }

      // Collect all role names and permission names
      const userRoleNames: string[] = [];
      const userPermissions: string[] = [];

      user.userRoles.forEach((ur) => {
        if (ur.role) {
          userRoleNames.push(ur.role.name);
          ur.role.rolePermissions.forEach((rp) => {
            if (rp.permission) {
              userPermissions.push(rp.permission.name);
            }
          });
        }
      });

      // Check role-based session expiration
      const isUser = userRoleNames.includes("user");

      // For non-user roles (admin, moderator, etc.), check database expiresAt
      if (!isUser) {
        const now = new Date();
        if (now > session.expiresAt) {
          await db.update(sessions).set({ isActive: false }).where(eq(sessions.id, session.id));
          return c.json({ message: "Unauthorized: Session expired" }, 401);
        }
      }
      // Users with "user" role get persistent sessions - no expiration check

      // If no specific requirements are set, just checking authentication
      if (allowedRequirements.length === 0) {
        c.set("user", user);
        await next();
        return;
      }

      // Automatically grant access to superadmin or users with system:all permission
      let hasAccess = false;
      if (userRoleNames.includes("superadmin") || userPermissions.includes("system:all")) {
        hasAccess = true;
      } else {
        // Check if user has any of the required roles OR permissions
        hasAccess = allowedRequirements.some(
          (req) => userRoleNames.includes(req) || userPermissions.includes(req),
        );
      }

      if (!hasAccess) {
        return c.json(
          {
            message: "Forbidden: Insufficient permissions",
            required: allowedRequirements,
            userRoles: userRoleNames,
            userPermissions: userPermissions,
          },
          403,
        );
      }

      // Update session last activity
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
