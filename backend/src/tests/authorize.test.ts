import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { sign } from "hono/jwt";
import db from "../db";
import { users, sessions, roles, permissions, rolePermissions, userRoles } from "../db/schema";
import { eq } from "drizzle-orm";
import config from "config";
import app from "../app";

describe("Authorize Middleware & Auth Me Route", () => {
  let testUser: any;
  let testAdminUser: any;
  let testUserSession: any;
  let testAdminSession: any;
  let testUserToken: string;
  let testAdminToken: string;
  let testRole: any;
  let testAdminRole: any;
  let testPermission: any;

  beforeAll(async () => {
    // 1. Create a test permission
    const [perm] = await db.insert(permissions).values({
      name: "test:read",
      description: "Test read permission",
    }).onConflictDoNothing().returning();
    testPermission = perm || await db.query.permissions.findFirst({
      where: eq(permissions.name, "test:read"),
    });

    // 2. Create standard user role and admin role
    const [roleUser] = await db.insert(roles).values({
      name: "user",
      description: "Standard User",
    }).onConflictDoNothing().returning();
    testRole = roleUser || await db.query.roles.findFirst({
      where: eq(roles.name, "user"),
    });

    const [roleAdmin] = await db.insert(roles).values({
      name: "admin",
      description: "Administrator",
    }).onConflictDoNothing().returning();
    testAdminRole = roleAdmin || await db.query.roles.findFirst({
      where: eq(roles.name, "admin"),
    });

    // 3. Link permission to admin role
    if (testPermission && testAdminRole) {
      await db.insert(rolePermissions).values({
        roleId: testAdminRole.id,
        permissionId: testPermission.id,
      }).onConflictDoNothing();
    }

    // 4. Create standard user and admin user
    const [usr] = await db.insert(users).values({
      name: "Test Normal User",
      username: "test_normal_" + Date.now(),
      email: `normal_${Date.now()}@test.com`,
      password: "TestPassword123!",
    }).returning();
    testUser = usr;

    const [adm] = await db.insert(users).values({
      name: "Test Admin User",
      username: "test_admin_" + Date.now(),
      email: `admin_${Date.now()}@test.com`,
      password: "TestPassword123!",
    }).returning();
    testAdminUser = adm;

    // 5. Assign roles
    if (testUser && testRole) {
      await db.insert(userRoles).values({
        userId: testUser.id,
        roleId: testRole.id,
      });
    }
    if (testAdminUser && testAdminRole) {
      await db.insert(userRoles).values({
        userId: testAdminUser.id,
        roleId: testAdminRole.id,
      });
    }

    // 6. Create active sessions (expires in 1 hour)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    const [usrSession] = await db.insert(sessions).values({
      userId: testUser.id,
      expiresAt,
      isActive: true,
    }).returning();
    testUserSession = usrSession;

    const [admSession] = await db.insert(sessions).values({
      userId: testAdminUser.id,
      expiresAt,
      isActive: true,
    }).returning();
    testAdminSession = admSession;

    // 7. Generate JWTs
    testUserToken = await sign({ sessionId: testUserSession.id }, config.get("authTokenSecret")!);
    testAdminToken = await sign({ sessionId: testAdminSession.id }, config.get("authTokenSecret")!);
  });

  afterAll(async () => {
    // Cleanup seeded data
    if (testUserSession) {
      await db.delete(sessions).where(eq(sessions.id, testUserSession.id));
    }
    if (testAdminSession) {
      await db.delete(sessions).where(eq(sessions.id, testAdminSession.id));
    }
    if (testUser) {
      await db.delete(userRoles).where(eq(userRoles.userId, testUser.id));
      await db.delete(users).where(eq(users.id, testUser.id));
    }
    if (testAdminUser) {
      await db.delete(userRoles).where(eq(userRoles.userId, testAdminUser.id));
      await db.delete(users).where(eq(users.id, testAdminUser.id));
    }
  });

  describe("Authorize Middleware", () => {
    test("should deny access if no session token is present", async () => {
      const res = await app.request("/v1/settings", {
        method: "GET",
      });
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.message).toContain("No session token");
    });

    test("should deny route access if user lacks required role", async () => {
      const res = await app.request("/v1/settings", {
        method: "GET",
        headers: {
          Cookie: `sessionToken=${testUserToken}`,
        },
      });
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.message).toContain("Forbidden");
    });

    test("should allow access if user has required role", async () => {
      const res = await app.request("/v1/settings", {
        method: "GET",
        headers: {
          Cookie: `sessionToken=${testAdminToken}`,
        },
      });
      // Admin should be allowed to view settings
      expect(res.status).toBe(200);
    });

    test("should enforce session expiration for admin (non-user role)", async () => {
      // Create an expired session for a new temp admin
      const [expiredAdmin] = await db.insert(users).values({
        name: "Expired Admin",
        username: "exp_admin_" + Date.now(),
        email: `exp_admin_${Date.now()}@test.com`,
        password: "TestPassword123!",
      }).returning();

      if (expiredAdmin && testAdminRole) {
        await db.insert(userRoles).values({
          userId: expiredAdmin.id,
          roleId: testAdminRole.id,
        });
      }

      const pastDate = new Date();
      pastDate.setHours(pastDate.getHours() - 2); // 2 hours ago

      const [expSession] = await db.insert(sessions).values({
        userId: expiredAdmin.id,
        expiresAt: pastDate,
        isActive: true,
      }).returning();

      const expiredToken = await sign({ sessionId: expSession.id }, config.get("authTokenSecret")!);

      // Query settings route which requires admin
      const res = await app.request("/v1/settings", {
        method: "GET",
        headers: {
          Cookie: `sessionToken=${expiredToken}`,
        },
      });

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.message).toContain("Session expired");

      // Verify database session is marked inactive
      const updatedSession = await db.query.sessions.findFirst({
        where: eq(sessions.id, expSession.id),
      });
      expect(updatedSession?.isActive).toBe(false);

      // Clean up
      await db.delete(sessions).where(eq(sessions.id, expSession.id));
      await db.delete(userRoles).where(eq(userRoles.userId, expiredAdmin.id));
      await db.delete(users).where(eq(users.id, expiredAdmin.id));
    });

    test("should allow standard user to bypass expiration check (persistent session)", async () => {
      // Create an expired session for a standard user
      const [expiredUser] = await db.insert(users).values({
        name: "Expired User",
        username: "exp_user_" + Date.now(),
        email: `exp_user_${Date.now()}@test.com`,
        password: "TestPassword123!",
      }).returning();

      if (expiredUser && testRole) {
        await db.insert(userRoles).values({
          userId: expiredUser.id,
          roleId: testRole.id,
        });
      }

      const pastDate = new Date();
      pastDate.setHours(pastDate.getHours() - 2);

      const [expSession] = await db.insert(sessions).values({
        userId: expiredUser.id,
        expiresAt: pastDate,
        isActive: true,
      }).returning();

      const expiredToken = await sign({ sessionId: expSession.id }, config.get("authTokenSecret")!);

      // Query /v1/auth/me which is general auth-only
      const res = await app.request("/v1/auth/me", {
        method: "GET",
        headers: {
          Cookie: `sessionToken=${expiredToken}`,
        },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);

      // Verify session in database remains active
      const updatedSession = await db.query.sessions.findFirst({
        where: eq(sessions.id, expSession.id),
      });
      expect(updatedSession?.isActive).toBe(true);

      // Clean up
      await db.delete(sessions).where(eq(sessions.id, expSession.id));
      await db.delete(userRoles).where(eq(userRoles.userId, expiredUser.id));
      await db.delete(users).where(eq(users.id, expiredUser.id));
    });
  });

  describe("Auth Me Route (/v1/auth/me)", () => {
    test("should deny access to /me if not authenticated", async () => {
      const res = await app.request("/v1/auth/me", {
        method: "GET",
      });
      expect(res.status).toBe(401);
    });

    test("should return sanitized profile for authenticated standard user", async () => {
      const res = await app.request("/v1/auth/me", {
        method: "GET",
        headers: {
          Cookie: `sessionToken=${testUserToken}`,
        },
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
      
      const userData = body.data;
      expect(userData.id).toBe(testUser.id);
      expect(userData.name).toBe(testUser.name);
      expect(userData.username).toBe(testUser.username);
      expect(userData.email).toBe(testUser.email);
      expect(userData.password).toBeUndefined(); // Crucial: must omit password
      
      expect(userData.userRoles).toBeDefined();
      expect(userData.userRoles.length).toBe(1);
      expect(userData.userRoles[0].role.name).toBe("user");
    });
  });
});
