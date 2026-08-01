import {
  pgTable,
  text,
  boolean,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const userRole = pgEnum("user_role", ["admin", "agent", "approver", "requester"]);
export const incidentStatus = pgEnum("incident_status", [
  "new",
  "acknowledged",
  "in_progress",
  "resolved",
  "closed",
]);
export const priorityLevel = pgEnum("priority_level", ["low", "medium", "high", "critical"]);
export const changeStatus = pgEnum("change_status", [
  "draft",
  "pending_approval",
  "approved",
  "rejected",
  "scheduled",
  "implemented",
  "closed",
]);
export const riskLevel = pgEnum("risk_level", ["low", "medium", "high"]);
export const approvalDecision = pgEnum("approval_decision", ["approved", "rejected"]);
export const assetType = pgEnum("asset_type", [
  "server",
  "workstation",
  "network_device",
  "application",
  "license",
  "other",
]);
export const assetStatus = pgEnum("asset_status", [
  "in_use",
  "in_stock",
  "under_maintenance",
  "retired",
]);
export const notificationChannel = pgEnum("notification_channel", ["teams", "email"]);
export const notificationStatus = pgEnum("notification_status", ["sent", "failed", "skipped"]);

// ---------- Users & RBAC ----------
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: userRole("role").notNull().default("requester"),
  teamsWebhookOptIn: boolean("teams_webhook_opt_in").notNull().default(true),
  emailOptIn: boolean("email_opt_in").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

// ---------- Incidents ----------
export const incidents = pgTable("incidents", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  status: incidentStatus("status").notNull().default("new"),
  priority: priorityLevel("priority").notNull().default("medium"),
  assetId: text("asset_id"),
  reporterId: text("reporter_id").notNull(),
  assigneeId: text("assignee_id"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
});

// ---------- Changes (with approval workflow) ----------
export const changes = pgTable("changes", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  riskLevel: riskLevel("risk_level").notNull().default("medium"),
  status: changeStatus("status").notNull().default("draft"),
  requesterId: text("requester_id").notNull(),
  approverId: text("approver_id"),
  assetId: text("asset_id"),
  scheduledFor: timestamp("scheduled_for", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

export const changeApprovals = pgTable("change_approvals", {
  id: text("id").primaryKey(),
  changeId: text("change_id").notNull(),
  approverId: text("approver_id").notNull(),
  decision: approvalDecision("decision").notNull(),
  comment: text("comment"),
  decidedAt: timestamp("decided_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

// ---------- Assets / CMDB ----------
export const assets = pgTable("assets", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  type: assetType("type").notNull().default("other"),
  status: assetStatus("status").notNull().default("in_use"),
  owner: text("owner"),
  location: text("location"),
  serialNumber: text("serial_number"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

// ---------- Notifications log ----------
export const notifications = pgTable("notifications", {
  id: text("id").primaryKey(),
  channel: notificationChannel("channel").notNull(),
  event: text("event").notNull(),
  recipient: text("recipient").notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  status: notificationStatus("status").notNull(),
  error: text("error"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

// ---------- Audit log (security/compliance trail) ----------
export const auditLogs = pgTable("audit_logs", {
  id: text("id").primaryKey(),
  actorId: text("actor_id"),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  metadata: text("metadata"),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});
