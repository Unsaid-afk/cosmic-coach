import { pgTable, text, serial, real, integer, timestamp, pgEnum, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const sessionStatusEnum = pgEnum("session_status", ["processing", "ready", "failed"]);
export const energyLevelEnum = pgEnum("energy_level", ["low", "medium", "high", "electric"]);

export const sessionsTable = pgTable("sessions", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  speakerName: text("speaker_name").notNull(),
  duration: real("duration").notNull().default(0),
  status: sessionStatusEnum("status").notNull().default("processing"),
  overallScore: real("overall_score").notNull().default(0),
  energyLevel: energyLevelEnum("energy_level").notNull().default("medium"),
  eyeContactScore: real("eye_contact_score").notNull().default(0),
  confidenceScore: real("confidence_score").notNull().default(0),
  fillerWordCount: integer("filler_word_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  // Real AI data fields
  transcriptData: jsonb("transcript_data"),
  analysisData: jsonb("analysis_data"),
  waveformData: jsonb("waveform_data"),
  errorMessage: text("error_message"),
});

export const insertSessionSchema = createInsertSchema(sessionsTable).omit({ id: true, createdAt: true });
export type InsertSession = z.infer<typeof insertSessionSchema>;
export type Session = typeof sessionsTable.$inferSelect;
