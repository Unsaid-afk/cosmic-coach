import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { teamsTable } from "./teams";

export const teamMembersTable = pgTable("team_members", {
  id: serial("id").primaryKey(),
  teamId: serial("team_id").notNull().references(() => teamsTable.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  role: text("role").notNull().default("rep"), // 'manager' or 'rep'
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type TeamMember = typeof teamMembersTable.$inferSelect;
export type InsertTeamMember = typeof teamMembersTable.$inferInsert;
