import { Hono } from "hono";
import { sign, verify } from "hono/jwt";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { ZodError } from "zod";
import { zValidator } from "@hono/zod-validator";
import { registerSchema, loginSchema } from "../schemas/auth";
import { changePasswordSchema, type ChangePasswordRequest } from "../schemas/users";
import { formatZodError } from "../utils/errors";
import { isValidSession, cookieOptions } from "../utils/sessionAuth";
import { authRateLimit } from "../middlewares/rateLimiter";
import { authorize } from "../middlewares/authorize";
import config from "config";
import db from "../db";
import { users, sessions, roles, userRoles } from "../db/schema";
import { eq, or } from "drizzle-orm";
import { ldapService } from "../services/ldapService";

const router = new Hono();

// Register endpoint
router.post("/register", authRateLimit, zValidator("json", registerSchema), async (c) => {
  try {
    const { name, username, email, password, redirectUrl } = c.req.valid("json");

    // Check if the user already exists (by email or username)
    const existingUser = await db.query.users
      .findFirst({
        where: or(eq(users.email, email), eq(users.username, username)),
      })
      .catch((error) => {
        console.error("Error finding existing user:", error);
        throw new Error("Error finding existing user");
      });

    if (existingUser) {
      return c.json({ message: "User already exists" }, 400);
    }

    // Get the "user" role id
    const userRole = await db.query.roles
      .findFirst({
        where: eq(roles.name, "user"),
      })
      .catch((error) => {
        console.error("Error finding user role:", error);
        throw new Error("Error finding user role");
      });

    if (!userRole) {
      return c.json({ message: "User role not found" }, 500);
    }

    // Hash the password
    const hashedPassword = await Bun.password.hash(password).catch((error) => {
      console.error("Error hashing password:", error);
      throw new Error("Error hashing password");
    });

    // Insert the new user into the database
    const user = await db
      .insert(users)
      .values({
        name,
        username,
        email,
        password: hashedPassword,
      })
      .returning()
      .catch((error) => {
        console.error("Error inserting user:", error);
        throw new Error("Error inserting user");
      });

    // Assign user role
    await db
      .insert(userRoles)
      .values({
        userId: user[0].id,
        roleId: userRole.id,
      })
      .catch((error) => {
        console.error("Error assigning user role:", error);
        throw new Error("Error assigning user role");
      });

    // Create session for the new user
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + 1);

    const session = await db
      .insert(sessions)
      .values({
        userId: user[0].id,
        expiresAt: expirationDate,
        userAgent: c.req.header("user-agent") || undefined,
        ipAddress: c.req.header("x-forwarded-for") || (c.env as { ip?: string }).ip || undefined,
      })
      .returning();

    const payload = {
      sessionId: session[0].id,
      exp: Math.floor(expirationDate.getTime() / 1000),
    };

    const sessionToken = await sign(payload, config.get("authTokenSecret")!);
    setCookie(c, "sessionToken", sessionToken, cookieOptions);

    return c.json({
      userId: user[0].id,
      message: "User registered successfully",
      redirectUrl: redirectUrl || "/",
    });
  } catch (error) {
    console.error("Error in /register route:", error);
    if (error instanceof ZodError) {
      return c.json(formatZodError(error), 400);
    }
    return c.json({ message: "Failed to register user" }, 500);
  }
});

// Login endpoint
router.post("/login", authRateLimit, zValidator("json", loginSchema), async (c) => {
  try {
    const { identifier, password } = c.req.valid("json");
    const user = await db.query.users
      .findFirst({
        where: or(eq(users.email, identifier), eq(users.username, identifier)),
        columns: { id: true, password: true, authProvider: true },
      })
      .catch((error) => {
        console.error("Error finding user:", error);
        throw new Error("Error finding user");
      });

    const isVerified = await Bun.password.verify(password, user?.password ?? "").catch((error) => {
      console.error("Error verifying password:", error);
      throw new Error("Error verifying password");
    });

    if (user && isVerified) {
      // Local authentication success
      if (config.get("ldap.enabled") && user.authProvider === "ldap") {
        return c.json({ message: "Please log in using your LDAP credentials" }, 401);
      }
      return createSessionAndResponse(c, user.id);
    } else if (config.get("ldap.enabled")) {
      // Attempt LDAP authentication
      try {
        const ldapUser = await ldapService.authenticateUser(identifier, password);
        if (ldapUser) {
          // Check if user exists locally
          let localUser = await db.query.users.findFirst({
            where: or(eq(users.username, ldapUser.username), eq(users.email, ldapUser.email)),
          });

          if (localUser) {
            if (localUser.authProvider !== "ldap") {
              return c.json({ message: "Account exists but is not linked to LDAP" }, 401);
            }
            // Update existing LDAP user
            const roleName = ldapService.getRoleFromGroups(ldapUser.groups);
            const targetRole = await db.query.roles.findFirst({ where: eq(roles.name, roleName) });
            
            await db.transaction(async (tx) => {
              await tx.update(users).set({
                name: ldapUser.name,
                email: ldapUser.email,
                updatedAt: new Date(),
              }).where(eq(users.id, localUser!.id));

              if (targetRole) {
                await tx.delete(userRoles).where(eq(userRoles.userId, localUser!.id));
                await tx.insert(userRoles).values({
                  userId: localUser!.id,
                  roleId: targetRole.id,
                });
              }
            });
          } else {
            // Auto-provision new LDAP user
            const roleName = ldapService.getRoleFromGroups(ldapUser.groups);
            const targetRole = await db.query.roles.findFirst({ where: eq(roles.name, roleName) });
            if (!targetRole) throw new Error(`Default role ${roleName} not found`);

            const [newUser] = await db.transaction(async (tx) => {
              const [u] = await tx.insert(users).values({
                name: ldapUser.name,
                username: ldapUser.username,
                email: ldapUser.email,
                authProvider: "ldap",
              }).returning();

              await tx.insert(userRoles).values({
                userId: u.id,
                roleId: targetRole.id,
              });
              return [u];
            });
            localUser = newUser;
          }

          return createSessionAndResponse(c, localUser.id);
        } else {
          return c.json({ message: "Invalid credentials" }, 401);
        }
      } catch (error) {
        console.error("LDAP login error:", error);
        return c.json({ message: "Authentication service error" }, 401);
      }
    } else {
      return c.json({ message: "Invalid credentials" }, 401);
    }
  } catch (error) {
    console.error("Error in /login route:", error);
    if (error instanceof ZodError) {
      return c.json(formatZodError(error), 400);
    }
    return c.json({ message: "Failed to login" }, 500);
  }
});

async function createSessionAndResponse(c: any, userId: number) {
  const expirationDate = new Date();
  expirationDate.setDate(expirationDate.getDate() + 1); // 24 hours from now

  const session = await db
    .insert(sessions)
    .values({
      userId: userId,
      expiresAt: expirationDate,
      userAgent: c.req.header("user-agent") || undefined,
      ipAddress: c.req.header("x-forwarded-for") || (c.env as { ip?: string }).ip || undefined,
    })
    .returning()
    .catch((error) => {
      console.error("Error creating session:", error);
      throw new Error("Error creating session");
    });

  const payload = {
    sessionId: session[0].id,
    exp: Math.floor(expirationDate.getTime() / 1000),
  };
  const sessionToken = await sign(payload, config.get("authTokenSecret")!);
  setCookie(c, "sessionToken", sessionToken, cookieOptions);

  // Fetch user with roles for the response
  const userWithRoles = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { id: true, name: true, username: true, email: true, authProvider: true },
    with: {
      userRoles: {
        with: {
          role: true,
        },
      },
    },
  });

  return c.json({
    success: true,
    data: userWithRoles,
    message: "Login successful",
  });
}

// Get current user endpoint
router.get("/me", async (c) => {
  try {
    const token = getCookie(c, "sessionToken");
    if (!token) {
      return c.json({ success: false, message: "No session token" }, 401);
    }

    const payload = await verify(token, config.get("authTokenSecret")!, "HS256");
    const { sessionId } = payload as { sessionId?: number };
    if (!sessionId) {
      return c.json({ success: false, message: "Invalid session token" }, 401);
    }

    const session = await db.query.sessions.findFirst({
      where: eq(sessions.id, Number(sessionId)),
    });
    if (!isValidSession(session)) {
      return c.json({ success: false, message: "Invalid or expired session" }, 401);
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, session.userId),
      columns: { id: true, name: true, username: true, email: true },
      with: {
        userRoles: {
          with: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      return c.json({ success: false, message: "User not found" }, 401);
    }

    return c.json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error("Error in /me route:", error);
    const isAuthError = error instanceof Error && 
      (error.name.startsWith("Jwt") || error.message.includes("expired") || error.message.includes("token"));
    if (isAuthError) {
      return c.json({ success: false, message: error.message }, 401);
    }
    return c.json({ success: false, message: "Failed to get user" }, 500);
  }
});

// Logout endpoint
router.post("/logout", async (c) => {
  try {
    const token = getCookie(c, "sessionToken");
    if (token) {
      const payload = await verify(token, config.get("authTokenSecret")!, "HS256");
      const { sessionId } = payload as { sessionId?: number };
      if (sessionId) {
        // Deactivate the session
        await db
          .update(sessions)
          .set({ isActive: false })
          .where(eq(sessions.id, Number(sessionId)));
      }
    }

    deleteCookie(c, "sessionToken", cookieOptions);
    return c.json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("Error in /logout route:", error);
    deleteCookie(c, "sessionToken", cookieOptions);
    return c.json({
      success: true,
      message: "Logged out successfully",
    });
  }
});

// Change password (authenticated users)
router.post(
  "/change-password",
  authorize(["user", "admin", "superadmin", "moderator"]),
  zValidator("json", changePasswordSchema),
  async (c) => {
    try {
      const user = c.get("user"); // Get user from authorize middleware
      const { currentPassword, newPassword } = c.req.valid("json") as ChangePasswordRequest;

      if (!user) {
        return c.json({ message: "User not found" }, 404);
      }

      // Verify current password
      const isPasswordValid = await Bun.password
        .verify(currentPassword, user.password)
        .catch(() => false);

      if (!isPasswordValid) {
        return c.json({ message: "Current password is incorrect" }, 401);
      }

      // Hash new password
      const hashedPassword = await Bun.password.hash(newPassword);

      // Update password
      await db.update(users).set({ password: hashedPassword }).where(eq(users.id, user.id));

      return c.json({
        success: true,
        message: "Password changed successfully",
      });
    } catch (error) {
      console.error("Error changing password:", error);
      if (error instanceof ZodError) {
        return c.json(formatZodError(error), 400);
      }
      return c.json({ message: "Failed to change password" }, 500);
    }
  },
);

export default router;
