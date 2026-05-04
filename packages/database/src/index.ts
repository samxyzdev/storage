import dotenv from "dotenv";
dotenv.config({ path: "/Users/devilcoder/storage/packages/database/.env" });

import { drizzle } from "drizzle-orm/node-postgres";

console.log(process.env.DATABASE_URL);

export const db = drizzle(process.env.DATABASE_URL!);
export * from "./db/schema";
export * from "drizzle-orm";
