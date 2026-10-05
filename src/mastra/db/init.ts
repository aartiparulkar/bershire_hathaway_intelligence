import { db } from "./client";
import { CREATE_CHUNKS_TABLE } from "./schema";

export async function initDb() {
  await db.query(`CREATE EXTENSION IF NOT EXISTS vector`);
  await createSchema();
}

export async function createSchema() {
  await db.query(CREATE_CHUNKS_TABLE);
}