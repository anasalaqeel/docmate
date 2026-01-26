import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import config from "config";
import * as schema from "./schema";

// Create connection pool configuration
const poolConfig = {
  max: 20, // Maximum number of connections in the pool
  idle_timeout: 30, // Close idle connections after 30 seconds
  connect_timeout: 10, // Connection timeout in seconds
  max_lifetime: 3600, // Close connections after 1 hour
  prepare: false, // Disable prepared statements for better compatibility
};

// Create connection pool
const connectionString = config.get("database.url") as string;
const pool = postgres(connectionString, poolConfig);

// Create drizzle instance with connection pooling
const db = drizzle(pool, {
  schema,
  logger: process.env.NODE_ENV === 'development', // Enable query logging in development
});

// Export both the database instance and the pool for advanced usage
export { pool };
export default db;

// Graceful shutdown handler
process.on('SIGINT', async () => {
  console.log('Closing database connections...');
  await pool.end();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Closing database connections...');
  await pool.end();
  process.exit(0);
});
