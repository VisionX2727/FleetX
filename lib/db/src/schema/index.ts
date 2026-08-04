import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const fleetWorkspaces = pgTable("fleet_workspaces", {
  ownerUserId: text("owner_user_id").primaryKey(),
  inviteCode: text("invite_code").notNull().unique(),
  state: jsonb("state").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const fleetMembers = pgTable("fleet_members", {
  id: text("id").primaryKey(),
  ownerUserId: text("owner_user_id").notNull(),
  driverUserId: text("driver_user_id").notNull().unique(),
  profile: jsonb("profile").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const fleetInvoices = pgTable("fleet_invoices", {
  id: text("id").primaryKey(),
  ownerUserId: text("owner_user_id").notNull(),
  driverUserId: text("driver_user_id").notNull(),
  title: text("title").notNull(),
  html: text("html").notNull(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});