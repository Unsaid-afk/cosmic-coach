import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const enterpriseContractsTable = pgTable("enterprise_contracts", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  pricePerMonth: integer("price_per_month").notNull(), // in cents
  sessionQuota: integer("session_quota").notNull(), // monthly quota
  status: text("status").notNull().default("active"), // active, revoked
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type EnterpriseContract = typeof enterpriseContractsTable.$inferSelect;
export type InsertEnterpriseContract = typeof enterpriseContractsTable.$inferInsert;
