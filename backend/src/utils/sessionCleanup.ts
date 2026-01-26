import db from "../db";
import { sessions } from "../db/schema";
import { lt, and } from "drizzle-orm";
import logger from "../logger";

/**
 * Clean up expired sessions from the database
 * This should be run periodically to remove old, expired sessions
 */
export async function cleanupExpiredSessions(): Promise<void> {
  try {
    logger.info("Starting session cleanup job");

    const now = new Date();

    // Delete sessions that have expired
    const deletedSessions = await db
      .delete(sessions)
      .where(
        and(
          lt(sessions.expiresAt, now),
          // Only delete inactive sessions, keep active ones for audit purposes
          // You can modify this based on your retention policy
          // Uncomment the line below if you want to delete all expired sessions
          // sessions.isActive
        )
      )
      .returning({ id: sessions.id });

    logger.info(`Session cleanup completed. Deleted ${deletedSessions.length} expired sessions`);

    // Optionally, you could also deactivate expired sessions instead of deleting them
    /*
    const deactivatedSessions = await db
      .update(sessions)
      .set({ isActive: false })
      .where(
        and(
          lt(sessions.expiresAt, now),
          sessions.isActive
        )
      );
    */

  } catch (error) {
    logger.error("Error during session cleanup:", error);
    throw error;
  }
}

/**
 * Get statistics about sessions in the database
 */
export async function getSessionStats(): Promise<{
  total: number;
  active: number;
  expired: number;
}> {
  try {
    const now = new Date();

    // Get total session count
    const totalSessions = await db.query.sessions.findMany();

    // Calculate stats
    const stats = {
      total: totalSessions.length,
      active: totalSessions.filter(session =>
        session.isActive && session.expiresAt > now
      ).length,
      expired: totalSessions.filter(session =>
        !session.isActive || session.expiresAt <= now
      ).length
    };

    logger.info("Session statistics:", stats);
    return stats;

  } catch (error) {
    logger.error("Error getting session statistics:", error);
    throw error;
  }
}

/**
 * Initialize session cleanup to run periodically
 * This sets up an interval to clean up expired sessions
 */
export function initializeSessionCleanup(intervalMs: number = 60 * 60 * 1000): void {
  // Default: Run every hour
  logger.info(`Initializing session cleanup job to run every ${intervalMs / 1000 / 60} minutes`);

  // Run cleanup immediately on startup
  cleanupExpiredSessions().catch(error => {
    logger.error("Initial session cleanup failed:", error);
  });

  // Set up periodic cleanup
  setInterval(async () => {
    try {
      await cleanupExpiredSessions();
    } catch (error) {
      logger.error("Periodic session cleanup failed:", error);
    }
  }, intervalMs);
}

/**
 * Manual cleanup function for admin/management use
 */
export async function manualSessionCleanup(): Promise<{
  deletedSessions: number;
  message: string;
}> {
  try {
    const statsBefore = await getSessionStats();

    await cleanupExpiredSessions();

    const statsAfter = await getSessionStats();

    return {
      deletedSessions: statsBefore.total - statsAfter.total,
      message: `Session cleanup completed successfully. Removed ${statsBefore.total - statsAfter.total} expired sessions.`
    };

  } catch (error) {
    logger.error("Manual session cleanup failed:", error);
    throw error;
  }
}