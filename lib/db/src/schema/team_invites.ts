import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { teamsTable } from "./teams";

export const teamInvitesTable = pgTable("team_invites", {
  id: serial("id").primaryKey(),
  teamId: serial("team_id").notNull().references(() => teamsTable.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  token: text("token").notNull().unique(),
  role: text("role").notNull().default("rep"), // manager, rep
  status: text("status").notNull().default("pending"), // pending, accepted
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type TeamInvite = typeof teamInvitesTable.$inferSelect;
export type InsertTeamInvite = typeof teamInvitesTable.$inferInsert;
