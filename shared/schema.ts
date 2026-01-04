import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, jsonb, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Re-export auth models
export * from "./models/auth";

// ============================================
// REPORTS - Inspection reports with extracted data
// ============================================
export const reports = pgTable("reports", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  propertyAddress: text("property_address").notNull(),
  inspectionDate: timestamp("inspection_date"),
  fileHash: text("file_hash").notNull().unique(),
  fileName: text("file_name").notNull(),
  fileSize: integer("file_size").notNull(),
  
  // AI-extracted data
  majorDefects: jsonb("major_defects").$type<string[]>(),
  summaryFindings: text("summary_findings"),
  negotiationPoints: jsonb("negotiation_points").$type<string[]>(),
  estimatedCredit: integer("estimated_credit"),
  
  // Redaction status
  isRedacted: boolean("is_redacted").default(false),
  
  // Visibility
  isPublic: boolean("is_public").default(true),
  downloadCount: integer("download_count").default(0),
  
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const reportsRelations = relations(reports, ({ one }) => ({
  user: one(reports, {
    fields: [reports.userId],
    references: [reports.id],
  }),
}));

export const insertReportSchema = createInsertSchema(reports).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  downloadCount: true,
});

export type Report = typeof reports.$inferSelect;
export type InsertReport = z.infer<typeof insertReportSchema>;

// ============================================
// CREDITS - User credit balance and transactions
// ============================================
export const creditTransactions = pgTable("credit_transactions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  amount: integer("amount").notNull(), // positive for credit, negative for debit
  type: text("type").notNull(), // 'upload', 'download', 'bounty_stake', 'bounty_earned', 'signup_bonus'
  description: text("description"),
  reportId: integer("report_id"),
  bountyId: integer("bounty_id"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertCreditTransactionSchema = createInsertSchema(creditTransactions).omit({
  id: true,
  createdAt: true,
});

export type CreditTransaction = typeof creditTransactions.$inferSelect;
export type InsertCreditTransaction = z.infer<typeof insertCreditTransactionSchema>;

// ============================================
// BOUNTIES - Report requests for specific addresses
// ============================================
export const bounties = pgTable("bounties", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  propertyAddress: text("property_address").notNull(),
  stakedCredits: integer("staked_credits").notNull().default(5),
  status: text("status").notNull().default("open"), // 'open', 'fulfilled', 'cancelled'
  fulfilledByUserId: varchar("fulfilled_by_user_id"),
  fulfilledReportId: integer("fulfilled_report_id"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  fulfilledAt: timestamp("fulfilled_at"),
});

export const insertBountySchema = createInsertSchema(bounties).omit({
  id: true,
  createdAt: true,
  fulfilledAt: true,
  fulfilledByUserId: true,
  fulfilledReportId: true,
  status: true,
});

export type Bounty = typeof bounties.$inferSelect;
export type InsertBounty = z.infer<typeof insertBountySchema>;

// ============================================
// DOWNLOADS - Track who downloaded what
// ============================================
export const downloads = pgTable("downloads", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  reportId: integer("report_id").notNull(),
  creditSpent: integer("credit_spent").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertDownloadSchema = createInsertSchema(downloads).omit({
  id: true,
  createdAt: true,
});

export type Download = typeof downloads.$inferSelect;
export type InsertDownload = z.infer<typeof insertDownloadSchema>;

// ============================================
// PROPERTIES - Digital Vault for tracking properties
// ============================================
export const properties = pgTable("properties", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  address: text("address").notNull(),
  city: text("city"),
  state: text("state"),
  zipCode: text("zip_code"),
  latitude: text("latitude"),
  longitude: text("longitude"),
  status: text("status").notNull().default("watching"), // 'watching', 'offer_pending', 'under_contract', 'closed', 'passed'
  notes: text("notes"),
  purchasePrice: integer("purchase_price"),
  offerAmount: integer("offer_amount"),
  closingDate: timestamp("closing_date"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertPropertySchema = createInsertSchema(properties).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type Property = typeof properties.$inferSelect;
export type InsertProperty = z.infer<typeof insertPropertySchema>;

// ============================================
// PROPERTY_REPORTS - Link properties to reports
// ============================================
export const propertyReports = pgTable("property_reports", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").notNull(),
  reportId: integer("report_id").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertPropertyReportSchema = createInsertSchema(propertyReports).omit({
  id: true,
  createdAt: true,
});

export type PropertyReport = typeof propertyReports.$inferSelect;
export type InsertPropertyReport = z.infer<typeof insertPropertyReportSchema>;

// ============================================
// CREDIT CONSTANTS
// ============================================
export const CREDIT_VALUES = {
  SIGNUP_BONUS: 50,
  UPLOAD_REWARD: 10,        // Rebalanced: "Upload 1, Unlock 2"
  DOWNLOAD_COST: 5,          // Rebalanced: lower barrier to access
  EARLY_UPLOAD_BONUS: 5,     // Bonus for uploading within 48h of inspection
  MIN_BOUNTY_STAKE: 5,       // Lower barrier to request reports
} as const;
