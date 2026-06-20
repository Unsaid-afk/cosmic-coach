import { db, usersTable } from "./lib/db/src/index.js";
import { sql } from "drizzle-orm";

async function check() {
  try {
    console.log("Checking DB connection...");
    const result = await db.execute(sql`SELECT 1`);
    console.log("DB Connection: OK");
    
    const users = await db.select().from(usersTable).limit(1);
    console.log("Users Table access: OK");
    console.log("Found users:", users.length);
  } catch (err) {
    console.error("DB Check Failed:", err);
  } finally {
    process.exit();
  }
}

check();
