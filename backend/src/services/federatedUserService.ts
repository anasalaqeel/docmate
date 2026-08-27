import db from "../db";
import { users, userIdentities, roles, userRoles } from "../db/schema";
import { eq, and, like, sql } from "drizzle-orm";
import { settingsService } from "./settingsService";

export type FederatedProvider = "saml" | "ldap";

export interface FederatedUserInfo {
  email?: string;
  name?: string;
}

export type FederatedResolution =
  | { status: "ok"; user: typeof users.$inferSelect; created: boolean }
  | {
      status: "denied";
      reason: "missing-email" | "provisioning-disabled" | "account-disabled" | "linking-disabled";
    };

// Loose on purpose: we only need to know that the value is shaped like an email
// before using it to link or create an account, not that the domain exists.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Resolve a federated (SSO/LDAP) login to a local user:
 * 1. Look up an existing identity link (provider + externalId) — no email needed.
 * 2. Otherwise link an existing local user by email (case-insensitive).
 * 3. Otherwise auto-provision a new local user (if enabled) with the default role.
 *
 * Steps 2 and 3 require a valid email from the identity source; without one the
 * resolution is denied rather than guessing an account identifier.
 */
export async function resolveFederatedUser(
  provider: FederatedProvider,
  externalId: string,
  info: FederatedUserInfo,
): Promise<FederatedResolution> {
  // 1. Existing identity link
  const existingIdentity = await db.query.userIdentities.findFirst({
    where: and(
      eq(userIdentities.provider, provider),
      eq(userIdentities.externalId, externalId),
    ),
    with: { user: true },
  });
  if (existingIdentity) {
    const user = existingIdentity.user as typeof users.$inferSelect;
    if (user.status !== "active") {
      return { status: "denied", reason: "account-disabled" };
    }
    return { status: "ok", user, created: false };
  }

  const email = info.email?.trim().toLowerCase() ?? "";
  if (!EMAIL_RE.test(email)) {
    return { status: "denied", reason: "missing-email" };
  }

  // 2. Existing local user with the same email — link it, if auto-linking is on.
  // Registration lowercases emails but admin-created users may not, so compare
  // case-insensitively instead of risking a duplicate account per casing.
  // (sql`` interpolates the email as a bind parameter — no injection surface.)
  const [autoLink, autoProvision] = await Promise.all([
    settingsService.getSetting<boolean>("authentication.federated.autoLink"),
    settingsService.getSetting<boolean>("authentication.federated.autoProvision"),
  ]);
  const existingUser = await db.query.users.findFirst({
    where: sql`lower(${users.email}) = ${email}`,
  });
  if (existingUser) {
    if (!autoLink) {
      return { status: "denied", reason: "linking-disabled" };
    }
    if (existingUser.status !== "active") {
      return { status: "denied", reason: "account-disabled" };
    }
    await db
      .insert(userIdentities)
      .values({ userId: existingUser.id, provider, externalId })
      .onConflictDoNothing();
    return { status: "ok", user: existingUser, created: false };
  }

  // 3. Auto-provision
  if (!autoProvision) {
    return { status: "denied", reason: "provisioning-disabled" };
  }

  const defaultRoleName =
    (await settingsService.getSetting<string>("security.defaultUserRole")) || "user";
  const role = await db.query.roles.findFirst({
    where: eq(roles.name, defaultRoleName),
  });
  if (!role) {
    throw new Error(`Default role "${defaultRoleName}" not found`);
  }

  const username = await generateUniqueUsername(email);
  const inserted = await db
    .insert(users)
    .values({
      name: info.name?.trim() || email,
      username,
      email,
      password: null, // federated users have no local password
    })
    .returning();
  const user = inserted[0];

  await db.insert(userRoles).values({ userId: user.id, roleId: role.id });
  await db
    .insert(userIdentities)
    .values({ userId: user.id, provider, externalId })
    .onConflictDoNothing();

  return { status: "ok", user, created: true };
}

async function generateUniqueUsername(email: string): Promise<string> {
  const base =
    email
      .split("@")[0]
      .toLowerCase()
      .replace(/[^a-z0-9._-]/g, "")
      .slice(0, 100) || "user";

  // Escape LIKE wildcards so the pattern matches exactly the requested prefix
  // (Postgres LIKE uses backslash as the default escape character)
  const pattern = `${base}%`.replace(/[\\%_]/g, (m) => `\\${m}`);
  const taken = await db
    .select({ username: users.username })
    .from(users)
    .where(like(users.username, pattern));
  const takenSet = new Set(taken.map((t) => t.username));
  if (!takenSet.has(base)) return base;

  for (let i = 1; i < 1000; i++) {
    const candidate = `${base}${i}`;
    if (!takenSet.has(candidate)) return candidate;
  }
  throw new Error("Could not generate a unique username");
}
