/**
 * db-wiki.ts — Database helpers for wiki feedback and tutorial progress
 */
import { eq, desc, and, sql, count } from "drizzle-orm";
import { wikiFeedback, tutorialProgress } from "../drizzle/schema";
import { getDb } from "./db";

// ─── WIKI FEEDBACK ───────────────────────────────────────────────────────────

export async function submitFeedback(data: {
  articleId: string;
  articleTitle: string;
  type: "suggest_edit" | "flag_outdated" | "flag_inaccurate" | "request_topic" | "rate_helpful" | "rate_not_helpful" | "general";
  content?: string;
  suggestedContent?: string;
  section?: string;
  rating?: number;
  userId?: number;
  userName?: string;
  userEmail?: string;
}) {
  const db = await getDb();
  const result = await db!.insert(wikiFeedback).values({
    articleId: data.articleId,
    articleTitle: data.articleTitle,
    type: data.type,
    content: data.content ?? null,
    suggestedContent: data.suggestedContent ?? null,
    section: data.section ?? null,
    rating: data.rating ?? null,
    userId: data.userId ?? null,
    userName: data.userName ?? null,
    userEmail: data.userEmail ?? null,
  });
  return { id: result[0].insertId };
}

export async function listFeedback(opts: {
  status?: "pending" | "approved" | "rejected" | "merged";
  type?: "suggest_edit" | "flag_outdated" | "flag_inaccurate" | "request_topic" | "rate_helpful" | "rate_not_helpful" | "general";
  articleId?: string;
  search?: string;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  const limit = opts.limit ?? 50;
  const offset = opts.offset ?? 0;

  // Build conditions array
  const conditions = [];
  if (opts.status) conditions.push(eq(wikiFeedback.status, opts.status));
  if (opts.type) conditions.push(eq(wikiFeedback.type, opts.type));
  if (opts.articleId) conditions.push(eq(wikiFeedback.articleId, opts.articleId));
  if (opts.search) {
    conditions.push(
      sql`(${wikiFeedback.articleTitle} LIKE ${`%${opts.search}%`} OR ${wikiFeedback.content} LIKE ${`%${opts.search}%`} OR ${wikiFeedback.userName} LIKE ${`%${opts.search}%`})`
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db!.select().from(wikiFeedback)
    .where(whereClause)
    .orderBy(desc(wikiFeedback.createdAt))
    .limit(limit)
    .offset(offset);

  const totalRows = await db!.select({ cnt: count() }).from(wikiFeedback).where(whereClause);
  const total = Number(totalRows[0]?.cnt ?? 0);

  return { items: rows, total };
}

export async function getFeedbackStats() {
  const db = await getDb();
  const rows = await db!.select({
    status: wikiFeedback.status,
    cnt: count(),
  }).from(wikiFeedback).groupBy(wikiFeedback.status);

  const stats: Record<string, number> = { pending: 0, approved: 0, rejected: 0, merged: 0, total: 0 };
  for (const row of rows) {
    stats[row.status!] = Number(row.cnt);
    stats.total += Number(row.cnt);
  }
  return stats;
}

export async function getArticleFeedbackStats(articleId: string) {
  const db = await getDb();
  
  // Get average rating
  const ratingRows = await db!.select({
    avgRating: sql<number>`AVG(rating)`,
    ratingCount: count(),
  }).from(wikiFeedback).where(
    and(
      eq(wikiFeedback.articleId, articleId),
      sql`rating IS NOT NULL`
    )
  );

  // Get feedback type counts
  const typeRows = await db!.select({
    type: wikiFeedback.type,
    cnt: count(),
  }).from(wikiFeedback).where(eq(wikiFeedback.articleId, articleId)).groupBy(wikiFeedback.type);

  const typeCounts: Record<string, number> = {};
  for (const row of typeRows) {
    typeCounts[row.type!] = Number(row.cnt);
  }

  return {
    averageRating: ratingRows[0]?.avgRating ? Number(ratingRows[0].avgRating) : null,
    ratingCount: Number(ratingRows[0]?.ratingCount ?? 0),
    typeCounts,
  };
}

export async function reviewFeedback(data: {
  id: number;
  status: "approved" | "rejected" | "merged";
  reviewNotes?: string;
  reviewedBy: number;
}) {
  const db = await getDb();
  await db!.update(wikiFeedback).set({
    status: data.status,
    reviewNotes: data.reviewNotes ?? null,
    reviewedBy: data.reviewedBy,
    reviewedAt: new Date(),
  }).where(eq(wikiFeedback.id, data.id));
  return { success: true };
}

// ─── TUTORIAL PROGRESS ───────────────────────────────────────────────────────

export const TUTORIAL_STEPS = [
  {
    key: "explore_dashboard",
    title: "Explore the Dashboard",
    description: "Visit the main dashboard to see your platform overview with live metrics and system status.",
    href: "/dashboard",
    order: 1,
  },
  {
    key: "register_battery",
    title: "Register Your First Battery",
    description: "Go to Battery Registry and register a new battery pack with BPAN ID, chemistry, capacity, and manufacturer details.",
    href: "/batteries/register",
    order: 2,
  },
  {
    key: "view_telemetry",
    title: "View Live Telemetry",
    description: "Check the Telemetry page to see real-time voltage, current, temperature, and cycle data from connected batteries.",
    href: "/telemetry",
    order: 3,
  },
  {
    key: "check_soh",
    title: "Run AI Health Prediction",
    description: "Visit the AI SOH page to see machine learning predictions for battery state of health and remaining useful life.",
    href: "/ai-soh",
    order: 4,
  },
  {
    key: "register_warranty",
    title: "Register a Warranty",
    description: "Go to Warranty Registration and register a warranty for a battery with customer contacts, dealer info, and coverage terms.",
    href: "/warranty/register",
    order: 5,
  },
  {
    key: "check_warranty",
    title: "Check Warranty Status",
    description: "Use the public Warranty Check page to look up warranty status by BPAN, serial number, phone, email, or WhatsApp.",
    href: "/warranty/check",
    order: 6,
  },
  {
    key: "explore_marketplace",
    title: "Browse the Marketplace",
    description: "Visit the Second-Life Marketplace to see battery listings for reuse, repurposing, and recycling with verified SOH data.",
    href: "/marketplace",
    order: 7,
  },
  {
    key: "view_compliance",
    title: "Check Compliance Status",
    description: "Review your EPR compliance dashboard to see regulatory status across jurisdictions and generate compliance reports.",
    href: "/epr-compliance",
    order: 8,
  },
  {
    key: "explore_wiki",
    title: "Read the Knowledge Base",
    description: "Visit CirculWiki to explore articles about battery science, platform features, compliance regulations, and API integration.",
    href: "/wiki",
    order: 9,
  },
  {
    key: "try_ai_assistant",
    title: "Chat with AI Assistant",
    description: "Open the AI Assistant to ask questions about your batteries, get recommendations, and explore platform capabilities.",
    href: "/assistant",
    order: 10,
  },
  {
    key: "issue_api_key",
    title: "Issue Your First API Key",
    description: "Go to the Developer Portal, create an API key with read:telemetry scope, and copy it for use in your integration. This key authenticates all REST and MCP requests.",
    href: "/developer-portal",
    order: 11,
  },
  {
    key: "explore_api_reference",
    title: "Explore the API Reference",
    description: "Visit the API Reference to browse all available endpoints, view request/response schemas, and try live calls directly from your browser using your API key.",
    href: "/api-reference",
    order: 12,
  },
  {
    key: "register_webhook",
    title: "Register a Webhook",
    description: "In the Developer Portal, register an HTTPS endpoint to receive push notifications for events like soh.updated and triage.completed — eliminating the need for polling.",
    href: "/developer-portal",
    order: 13,
  },
  {
    key: "configure_mcp",
    title: "Connect via MCP",
    description: "Visit the MCP Server page to get your connection config for Claude Desktop, Cursor, or Windsurf. Copy the JSON snippet and paste it into your AI client to enable natural-language battery intelligence queries.",
    href: "/mcp-server",
    order: 14,
  },
] as const;

export type TutorialStepKey = typeof TUTORIAL_STEPS[number]["key"];

export async function getUserProgress(userId: number) {
  const db = await getDb();
  const rows = await db!.select().from(tutorialProgress).where(eq(tutorialProgress.userId, userId));
  
  const completedSteps = new Set(rows.filter((r) => r.completed).map((r) => r.stepKey));
  
  return TUTORIAL_STEPS.map((step) => ({
    ...step,
    completed: completedSteps.has(step.key),
  }));
}

export async function completeStep(userId: number, stepKey: string) {
  const db = await getDb();
  
  // Upsert — try insert, on duplicate key update
  await db!.execute(
    sql`INSERT INTO tutorial_progress (userId, stepKey, completed, completedAt)
        VALUES (${userId}, ${stepKey}, TRUE, NOW())
        ON DUPLICATE KEY UPDATE completed = TRUE, completedAt = NOW()`
  );
  
  return { success: true };
}

export async function resetProgress(userId: number) {
  const db = await getDb();
  await db!.delete(tutorialProgress).where(eq(tutorialProgress.userId, userId));
  return { success: true };
}

export async function getTutorialStats() {
  const db = await getDb();
  
  // Total users who started the tutorial
  const startedRows = await db!.select({
    cnt: sql<number>`COUNT(DISTINCT userId)`,
  }).from(tutorialProgress);
  
  // Users who completed all steps
  const completedRows = await db!.select({
    userId: tutorialProgress.userId,
    completedCount: count(),
  }).from(tutorialProgress)
    .where(eq(tutorialProgress.completed, true))
    .groupBy(tutorialProgress.userId);
  
  const totalSteps = TUTORIAL_STEPS.length;
  const completedAll = completedRows.filter((r) => Number(r.completedCount) >= totalSteps).length;
  
  return {
    totalStarted: Number(startedRows[0]?.cnt ?? 0),
    totalCompleted: completedAll,
    totalSteps,
  };
}
