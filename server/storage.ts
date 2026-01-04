import { 
  reports, 
  creditTransactions, 
  bounties, 
  downloads,
  CREDIT_VALUES,
  type Report, 
  type InsertReport,
  type CreditTransaction,
  type InsertCreditTransaction,
  type Bounty,
  type InsertBounty,
  type Download,
  type InsertDownload,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, ne, sql, ilike } from "drizzle-orm";

export interface IStorage {
  // Reports
  getReport(id: number): Promise<Report | undefined>;
  getReportByHash(hash: string): Promise<Report | undefined>;
  getReportsByUser(userId: string): Promise<Report[]>;
  getPublicReports(searchQuery?: string): Promise<Report[]>;
  createReport(report: InsertReport): Promise<Report>;
  updateReport(id: number, data: Partial<Report>): Promise<Report | undefined>;
  deleteReport(id: number): Promise<void>;
  incrementDownloadCount(id: number): Promise<void>;

  // Credits
  getCreditBalance(userId: string): Promise<number>;
  getCreditTransactions(userId: string): Promise<CreditTransaction[]>;
  createCreditTransaction(tx: InsertCreditTransaction): Promise<CreditTransaction>;
  getCreditStats(userId: string): Promise<{ earned: number; spent: number }>;

  // Bounties
  getBounty(id: number): Promise<Bounty | undefined>;
  getBountiesByUser(userId: string): Promise<Bounty[]>;
  getOpenBounties(excludeUserId?: string): Promise<Bounty[]>;
  getBountyByAddress(address: string): Promise<Bounty | undefined>;
  createBounty(bounty: InsertBounty): Promise<Bounty>;
  fulfillBounty(id: number, fulfilledByUserId: string, reportId: number): Promise<Bounty | undefined>;
  cancelBounty(id: number): Promise<void>;

  // Downloads
  getDownloadsByUser(userId: string): Promise<Download[]>;
  hasUserDownloaded(userId: string, reportId: number): Promise<boolean>;
  createDownload(download: InsertDownload): Promise<Download>;
}

export class DatabaseStorage implements IStorage {
  // Reports
  async getReport(id: number): Promise<Report | undefined> {
    const [report] = await db.select().from(reports).where(eq(reports.id, id));
    return report;
  }

  async getReportByHash(hash: string): Promise<Report | undefined> {
    const [report] = await db.select().from(reports).where(eq(reports.fileHash, hash));
    return report;
  }

  async getReportsByUser(userId: string): Promise<Report[]> {
    return db.select().from(reports).where(eq(reports.userId, userId)).orderBy(desc(reports.createdAt));
  }

  async getPublicReports(searchQuery?: string): Promise<Report[]> {
    if (searchQuery) {
      return db.select().from(reports)
        .where(and(
          eq(reports.isPublic, true),
          ilike(reports.propertyAddress, `%${searchQuery}%`)
        ))
        .orderBy(desc(reports.createdAt));
    }
    return db.select().from(reports)
      .where(eq(reports.isPublic, true))
      .orderBy(desc(reports.createdAt));
  }

  async createReport(report: InsertReport): Promise<Report> {
    const [newReport] = await db.insert(reports).values(report).returning();
    return newReport;
  }

  async updateReport(id: number, data: Partial<Report>): Promise<Report | undefined> {
    const [updated] = await db.update(reports)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(reports.id, id))
      .returning();
    return updated;
  }

  async deleteReport(id: number): Promise<void> {
    await db.delete(reports).where(eq(reports.id, id));
  }

  async incrementDownloadCount(id: number): Promise<void> {
    await db.update(reports)
      .set({ downloadCount: sql`${reports.downloadCount} + 1` })
      .where(eq(reports.id, id));
  }

  // Credits
  async getCreditBalance(userId: string): Promise<number> {
    const result = await db.select({
      total: sql<number>`COALESCE(SUM(${creditTransactions.amount}), 0)`
    })
    .from(creditTransactions)
    .where(eq(creditTransactions.userId, userId));
    
    return Number(result[0]?.total) || 0;
  }

  async getCreditTransactions(userId: string): Promise<CreditTransaction[]> {
    return db.select().from(creditTransactions)
      .where(eq(creditTransactions.userId, userId))
      .orderBy(desc(creditTransactions.createdAt));
  }

  async createCreditTransaction(tx: InsertCreditTransaction): Promise<CreditTransaction> {
    const [newTx] = await db.insert(creditTransactions).values(tx).returning();
    return newTx;
  }

  async getCreditStats(userId: string): Promise<{ earned: number; spent: number }> {
    const transactions = await this.getCreditTransactions(userId);
    let earned = 0;
    let spent = 0;
    
    for (const tx of transactions) {
      if (tx.amount > 0) {
        earned += tx.amount;
      } else {
        spent += Math.abs(tx.amount);
      }
    }
    
    return { earned, spent };
  }

  // Bounties
  async getBounty(id: number): Promise<Bounty | undefined> {
    const [bounty] = await db.select().from(bounties).where(eq(bounties.id, id));
    return bounty;
  }

  async getBountiesByUser(userId: string): Promise<Bounty[]> {
    return db.select().from(bounties)
      .where(eq(bounties.userId, userId))
      .orderBy(desc(bounties.createdAt));
  }

  async getOpenBounties(excludeUserId?: string): Promise<Bounty[]> {
    if (excludeUserId) {
      return db.select().from(bounties)
        .where(and(
          eq(bounties.status, 'open'),
          ne(bounties.userId, excludeUserId)
        ))
        .orderBy(desc(bounties.stakedCredits));
    }
    return db.select().from(bounties)
      .where(eq(bounties.status, 'open'))
      .orderBy(desc(bounties.stakedCredits));
  }

  async getBountyByAddress(address: string): Promise<Bounty | undefined> {
    const [bounty] = await db.select().from(bounties)
      .where(and(
        eq(bounties.status, 'open'),
        ilike(bounties.propertyAddress, `%${address}%`)
      ));
    return bounty;
  }

  async createBounty(bounty: InsertBounty): Promise<Bounty> {
    const [newBounty] = await db.insert(bounties).values(bounty).returning();
    return newBounty;
  }

  async fulfillBounty(id: number, fulfilledByUserId: string, reportId: number): Promise<Bounty | undefined> {
    const [updated] = await db.update(bounties)
      .set({
        status: 'fulfilled',
        fulfilledByUserId,
        fulfilledReportId: reportId,
        fulfilledAt: new Date(),
      })
      .where(eq(bounties.id, id))
      .returning();
    return updated;
  }

  async cancelBounty(id: number): Promise<void> {
    await db.update(bounties)
      .set({ status: 'cancelled' })
      .where(eq(bounties.id, id));
  }

  // Downloads
  async getDownloadsByUser(userId: string): Promise<Download[]> {
    return db.select().from(downloads)
      .where(eq(downloads.userId, userId))
      .orderBy(desc(downloads.createdAt));
  }

  async hasUserDownloaded(userId: string, reportId: number): Promise<boolean> {
    const [download] = await db.select().from(downloads)
      .where(and(
        eq(downloads.userId, userId),
        eq(downloads.reportId, reportId)
      ));
    return !!download;
  }

  async createDownload(download: InsertDownload): Promise<Download> {
    const [newDownload] = await db.insert(downloads).values(download).returning();
    return newDownload;
  }
}

export const storage = new DatabaseStorage();
