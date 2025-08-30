import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

let pool: Pool | null = null;
let db: any = null;

if (!process.env.DATABASE_URL || process.env.NODE_ENV === "development") {
  console.log("DEBUG: Using mock storage for development");
  console.log("DEBUG: DATABASE_URL:", process.env.DATABASE_URL ? "present" : "not set");
  console.log("DEBUG: NODE_ENV:", process.env.NODE_ENV);
  // In development, always use mock storage to avoid database connection issues
  db = null;
} else {
  console.log("DEBUG: DATABASE_URL found, attempting database connection:", process.env.DATABASE_URL.substring(0, 20) + "...");
  try {
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
    db = drizzle({ client: pool, schema });
    console.log("DEBUG: Database connection successful");
  } catch (error) {
    console.error("DEBUG: Database connection failed:", error);
    db = null;
  }
}

export { pool, db };
