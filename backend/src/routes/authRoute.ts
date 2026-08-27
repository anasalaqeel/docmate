import { Hono } from "hono";
import { verify } from "hono/jwt";
import { getCookie, deleteCookie } from "hono/cookie";
import { ZodError } from "zod";
import { zValidator } from "@hono/zod-validator";
import { registerSchema, loginSchema } from "../schemas/auth";
import { changePasswordSchema, type ChangePasswordRequest } from "../schemas/users";
import { formatZodError } from "../utils/errors";
import { cookieOptions } from "../utils/sessionAuth";
import { issueSession } from "../utils/sessionIssue";
import { authRateLimit } from "../middlewares/rateLimiter";
import { authorize } from "../middlewares/authorize";
import { isLdapEnabled, authenticateLdap } from "../services/ldapService";
import { resolveFederatedUser } from "../services/federatedUserService";
import config from "config";
import db from "../db";
import { users, sessions, roles, userRoles } from "../db/schema";
import { eq, or } from "drizzle-orm";

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
    await issueSession(c, user[0].id);

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
        columns: { id: true, password: true, status: true },
      })
      .catch((error) => {
        console.error("Error finding user:", error);
        throw new Error("Error finding user");
      });

    const isVerified = user?.password
      ? await Bun.password.verify(password, user.password).catch((error) => {
          console.error("Error verifying password:", error);
          throw new Error("Error verifying password");
        })
      : false;

    if (user && isVerified) {
      if (user.status !== "active") {
        return c.json({ message: "Account is disabled" }, 403);
      }
      await issueSession(c, user.id);

      // Fetch user with roles for the response
      const userWithRoles = await db.query.users.findFirst({
        where: eq(users.id, user.id),
        columns: { id: true, name: true, username: true, email: true },
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

    // Fall back to LDAP/Active Directory if enabled
    if (await isLdapEnabled()) {
      try {
        const ldapUser = await authenticateLdap(identifier, password);
        if (ldapUser) {
          const resolved = await resolveFederatedUser("ldap", ldapUser.dn, {
            email: ldapUser.email,
            name: ldapUser.name,
          });
          if (resolved.status === "denied") {
            const messages: Record<string, string> = {
              "missing-email":
                "Your directory account has no email address. Ask your administrator to populate the mail attribute or fix the LDAP email attribute setting.",
              "provisioning-disabled":
                "No local account is linked to this identity and auto-provisioning is disabled",
              "linking-disabled":
                "Automatic account linking is disabled and no identity is linked to your account",
              "account-disabled": "Account is disabled",
            };
            return c.json(
              { message: messages[resolved.reason] ?? "Login denied" },
              403,
            );
          }

          await issueSession(c, resolved.user.id);
          return c.json({
            success: true,
            data: { id: resolved.user.id, name: resolved.user.name, username: resolved.user.username, email: resolved.user.email },
            message: "Login successful",
          });
        }
      } catch (error) {
        console.error("LDAP authentication error:", error);
      }
    }

    return c.json({ message: "Invalid credentials" }, 401);
  } catch (error) {
    console.error("Error in /login route:", error);
    if (error instanceof ZodError) {
      return c.json(formatZodError(error), 400);
    }
    return c.json({ message: "Failed to login" }, 500);
  }
});

// Get current user endpoint
router.get("/me", authorize(), async (c) => {
  try {
    const user = c.get("user");

    // Clean user object for client response (omit password)
    const clientUser = {
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      userRoles: user.userRoles?.map((ur: any) => ({
        role: ur.role ? {
          id: ur.role.id,
          name: ur.role.name,
          description: ur.role.description,
        } : null
      })).filter((ur: any) => ur.role !== null) || [],
    };

    return c.json({
      success: true,
      data: clientUser,
    });
  } catch (error) {
    console.error("Error in /me route:", error);
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
  authorize(["profile:manage"]),
  zValidator("json", changePasswordSchema),
  async (c) => {
    try {
      const user = c.get("user"); // Get user from authorize middleware
      const { currentPassword, newPassword } = c.req.valid("json") as ChangePasswordRequest;

      if (!user) {
        return c.json({ message: "User not found" }, 404);
      }

      // Federated (SSO/LDAP-only) users have no local password to change
      if (!user.password) {
        return c.json(
          { message: "This account signs in with SSO/LDAP and has no local password" },
          400,
        );
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
