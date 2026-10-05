import { Pool } from "pg";
import { env } from "../config/env";

export const db = new Pool({
  connectionString: env.DATABASE_URL,
  ssl: env.APP_ENV === "production" ? { rejectUnauthorized: false } : false
});

db.on("connect", () => {
  console.log("Connected to PostgreSQL");
});
