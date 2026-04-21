import config from "config";

export interface SessionWithUser {
  sessionId: number;
  userId: number;
  isActive: boolean;
  expiresAt: Date;
}

export function isValidSession(
  session: { isActive: boolean; userId: number | null; expiresAt: Date } | undefined,
): session is SessionWithUser {
  return !!session && session.isActive && session.userId !== null && session.expiresAt > new Date();
}

export const cookieOptions = {
  httpOnly: true,
  secure: config.get<boolean>("cookie.secure"),
  sameSite: config.get<"Strict" | "Lax" | "None">("cookie.sameSite"),
  path: config.get<string>("cookie.path"),
} as const;
