import { TRPCError } from "@trpc/server";
import { and, desc, eq, or, sql, type SQL } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { z } from "zod";
import { bpanReadSchema } from "../shared/bpanContract";
import {
  batteries, chatMessages, chatSessions, eprTokens, serviceHistory,
  telemetry, sohPredictions, warrantyRecords,
  type Battery, type ChatSession,
} from "../drizzle/schema";

// Pure imports only: the connection is injected by the existing runtime.
// Actor MUST come from authenticated server context, never request input.
export type ResourceActor = Readonly<{ id: number; role: string }>;
type OwnershipDb = Pick<NodePgDatabase, "select" | "insert" | "update" | "transaction">;
export const positiveResourceId = z.number().int().positive().max(2147483647);
export const ownershipBpan = bpanReadSchema;
export const batteryIdentityInput = z.object({
  bpan: ownershipBpan,
  // Transitional compatibility only; derive the persisted ID from the row.
  batteryId: positiveResourceId.optional(),
}).strict();
export const batteryStatusInput = z.object({
  bpan: ownershipBpan,
  status: z.enum(["operational", "second_life", "end_of_life", "in_transit", "recycling"]),
  soh: z.number().finite().min(0).max(100).optional(),
}).strict();
export const conversationMessageInput = z.object({
  sessionId: positiveResourceId,
  message: z.string().trim().min(1).max(8000),
  bpanContext: ownershipBpan.optional(),
}).strict();

function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const parsed = schema.safeParse(value);
  if (!parsed.success) throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid resource input" });
  return parsed.data;
}
export function resourceActor(user: ResourceActor | null | undefined): ResourceActor {
  if (!user || !positiveResourceId.safeParse(user.id).success || typeof user.role !== "string") {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Authentication required" });
  }
  return Object.freeze({ id: user.id, role: user.role });
}
export function resourceNotFound(): never {
  // Missing, foreign, unowned and mismatched identities share one response.
  throw new TRPCError({ code: "NOT_FOUND", message: "Resource not found" });
}
export function batteryOwnerPredicate(actor: ResourceActor): SQL {
  const trusted = resourceActor(actor);
  // Registration is not permanent ownership. Null-owner legacy rows are admin-only.
  return trusted.role === "admin" ? sql`true` : eq(batteries.ownerId, trusted.id);
}
export function sessionOwnerPredicate(actor: ResourceActor): SQL {
  const trusted = resourceActor(actor);
  return trusted.role === "admin" ? sql`true` : eq(chatSessions.userId, trusted.id);
}
export function batteryResourcePredicate(actor: ResourceActor, identity: unknown): SQL {
  const input = parse(batteryIdentityInput, identity);
  return and(eq(batteries.bpan, input.bpan), batteryOwnerPredicate(actor),
    input.batteryId === undefined ? undefined : eq(batteries.id, input.batteryId))!;
}
export function sessionResourcePredicate(actor: ResourceActor, sessionId: unknown): SQL {
  return and(eq(chatSessions.id, parse(positiveResourceId, sessionId)), sessionOwnerPredicate(actor))!;
}
export async function getOwnedBattery(db: OwnershipDb, actor: ResourceActor, identity: unknown): Promise<Battery> {
  const predicate = batteryResourcePredicate(actor, identity);
  const rows = await db.select().from(batteries).where(predicate).limit(1);
  if (!rows[0]) resourceNotFound();
  return rows[0];
}
export async function withOwnedBattery<T>(db: OwnershipDb, actor: ResourceActor, identity: unknown,
  action: (tx: OwnershipDb, battery: Battery) => Promise<T>): Promise<T> {
  const predicate = batteryResourcePredicate(actor, identity);
  return db.transaction(async tx => {
    // Lock prevents ownership changes between authorization and related-row reads/writes.
    const [battery] = await tx.select().from(batteries).where(predicate).limit(1).for("update");
    if (!battery) resourceNotFound();
    return action(tx, battery);
  });
}
export async function updateOwnedBatteryStatus(db: OwnershipDb, actor: ResourceActor, value: unknown) {
  const input = parse(batteryStatusInput, value);
  const [updated] = await db.update(batteries).set({
    status: input.status, updatedAt: new Date(),
    ...(input.soh === undefined ? {} : { currentSoh: input.soh.toFixed(2) }),
  }).where(batteryResourcePredicate(actor, { bpan: input.bpan })).returning({ id: batteries.id });
  if (!updated) resourceNotFound();
  return { success: true as const };
}

export const ownedServiceInput = z.object({
  bpan: ownershipBpan, batteryId: positiveResourceId.optional(),
  serviceType: z.enum(["inspection", "maintenance", "repair", "replacement", "eol_assessment", "triage"]),
  sohBefore: z.number().finite().min(0).max(100).optional(),
  sohAfter: z.number().finite().min(0).max(100).optional(),
  cycleCountAtService: z.number().int().nonnegative().max(2147483647).optional(),
  notes: z.string().max(8000).optional(), technicianName: z.string().max(255).optional(),
  location: z.string().max(255).optional(), nextServiceDue: z.date().optional(),
}).strict();
export async function addOwnedServiceRecord(db: OwnershipDb, actor: ResourceActor, value: unknown) {
  const input = parse(ownedServiceInput, value);
  return withOwnedBattery(db, actor, { bpan: input.bpan, batteryId: input.batteryId }, async (tx, battery) => {
    await tx.insert(serviceHistory).values({
      bpan: battery.bpan, batteryId: battery.id, serviceProviderId: resourceActor(actor).id,
      serviceType: input.serviceType, sohBefore: input.sohBefore === undefined ? null : input.sohBefore.toFixed(2),
      sohAfter: input.sohAfter === undefined ? null : input.sohAfter.toFixed(2),
      cycleCountAtService: input.cycleCountAtService, notes: input.notes,
      technicianName: input.technicianName, location: input.location, nextServiceDue: input.nextServiceDue ?? null,
    });
    return { success: true as const };
  });
}
export async function getOwnedServiceHistory(db: OwnershipDb, actor: ResourceActor, bpan: unknown) {
  const canonical = parse(ownershipBpan, bpan);
  return withOwnedBattery(db, actor, { bpan: canonical }, (tx, battery) =>
    tx.select().from(serviceHistory).where(and(eq(serviceHistory.bpan, battery.bpan), eq(serviceHistory.batteryId, battery.id)))
      .orderBy(desc(serviceHistory.servicedAt)));
}

async function withOwnedSession<T>(db: OwnershipDb, actor: ResourceActor, sessionId: unknown,
  action: (tx: OwnershipDb, session: ChatSession) => Promise<T>): Promise<T> {
  const predicate = sessionResourcePredicate(actor, sessionId);
  return db.transaction(async tx => {
    const [session] = await tx.select().from(chatSessions).where(predicate).limit(1).for("update");
    if (!session) resourceNotFound();
    return action(tx, session);
  });
}
export async function createOwnedChatSession(db: OwnershipDb, actor: ResourceActor, title?: unknown) {
  const trusted = resourceActor(actor);
  const canonical = title === undefined ? "New Session" : parse(z.string().trim().min(1).max(255), title);
  const [created] = await db.insert(chatSessions).values({ userId: trusted.id, title: canonical }).returning();
  if (!created) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Session creation failed" });
  return created;
}
export async function getOwnedChatSessions(db: OwnershipDb, actor: ResourceActor) {
  const trusted = resourceActor(actor);
  // List remains personal even for admins; direct resource access allows explicit admin override.
  return db.select().from(chatSessions).where(eq(chatSessions.userId, trusted.id))
    .orderBy(desc(chatSessions.updatedAt)).limit(20);
}
export async function getOwnedChatMessages(db: OwnershipDb, actor: ResourceActor, sessionId: unknown) {
  return withOwnedSession(db, actor, sessionId, async (tx, session) => {
    const latest = await tx.select().from(chatMessages).where(eq(chatMessages.sessionId, session.id))
      .orderBy(desc(chatMessages.createdAt), desc(chatMessages.id)).limit(100);
    return latest.reverse();
  });
}
export async function appendOwnedChatMessage(db: OwnershipDb, actor: ResourceActor, sessionId: unknown,
  role: "user" | "assistant", content: unknown) {
  const canonical = parse(z.string().trim().min(1).max(32000), content);
  if (role !== "user" && role !== "assistant") throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid message role" });
  return withOwnedSession(db, actor, sessionId, async (tx, session) => {
    const [message] = await tx.insert(chatMessages).values({ sessionId: session.id, role, content: canonical }).returning();
    if (!message) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Message persistence failed" });
    await tx.update(chatSessions).set({ updatedAt: new Date() }).where(sessionResourcePredicate(actor, session.id));
    return message;
  });
}
export async function prepareOwnedChat(db: OwnershipDb, actor: ResourceActor, value: unknown) {
  const input = parse(conversationMessageInput, value);
  // Validate optional battery before any conversation write/provider context is prepared.
  // Rechecked under a battery lock by the router when loading actual context.
  if (input.bpanContext) await getOwnedBattery(db, actor, { bpan: input.bpanContext });
  return withOwnedSession(db, actor, input.sessionId, async (tx, session) => {
    const prior = await tx.select().from(chatMessages).where(eq(chatMessages.sessionId, session.id))
      .orderBy(desc(chatMessages.createdAt), desc(chatMessages.id)).limit(9);
    const [message] = await tx.insert(chatMessages).values({ sessionId: session.id, role: "user", content: input.message }).returning();
    if (!message) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Message persistence failed" });
    await tx.update(chatSessions).set({ updatedAt: new Date() }).where(sessionResourcePredicate(actor, session.id));
    // Exactly one append; no provider traffic or runtime LLM dependency in this module.
    return [...prior.reverse(), message].filter(m => m.role === "user" || m.role === "assistant")
      .map(m => ({ role: m.role as "user" | "assistant", content: m.content }));
  });
}

// Bounded to the existing numeric(10,3) columns. Input precision is explicit,
// not rounded from a negative/tiny/overprecision value into a creditable mass.
const massKg = z.number().finite().min(0).max(9999999.999).refine(
  n => Math.abs(n * 1000 - Math.round(n * 1000)) < 0.000001, "At most three decimal places");
export const pendingYieldInput = z.object({
  bpan: ownershipBpan, batteryId: positiveResourceId.optional(),
  actualYieldKg: massKg, theoreticalYieldKg: massKg.refine(n => n > 0, "Positive theoretical mass required"),
  blackMassKg: massKg.optional(), lithiumRecoveredKg: massKg.optional(),
  cobaltRecoveredKg: massKg.optional(), nickelRecoveredKg: massKg.optional(),
}).strict().superRefine((value, ctx) => {
  const issue = (message: string) => ctx.addIssue({ code: "custom", message });
  if (value.actualYieldKg > value.theoreticalYieldKg) issue("Actual mass exceeds theoretical mass");
  for (const name of ["blackMassKg", "lithiumRecoveredKg", "cobaltRecoveredKg", "nickelRecoveredKg"] as const) {
    if ((value[name] ?? 0) > value.actualYieldKg) issue("Component mass exceeds actual mass");
  }
  if ((value.lithiumRecoveredKg ?? 0) + (value.cobaltRecoveredKg ?? 0) + (value.nickelRecoveredKg ?? 0)
      > value.actualYieldKg + 0.000000001) issue("Recovered metals exceed actual mass");
});
export async function recordPendingOwnedYield(db: OwnershipDb, actor: ResourceActor, value: unknown, tokenId: string) {
  const input = parse(pendingYieldInput, value);
  const canonicalToken = parse(z.string().regex(/^EPR[A-Z0-9_-]{16,60}$/), tokenId);
  return withOwnedBattery(db, actor, { bpan: input.bpan, batteryId: input.batteryId }, async (tx, battery) => {
    const masses = {
      actualYieldKg: input.actualYieldKg.toFixed(3), theoreticalYieldKg: input.theoreticalYieldKg.toFixed(3),
      blackMassKg: input.blackMassKg === undefined ? null : input.blackMassKg.toFixed(3),
      lithiumRecoveredKg: input.lithiumRecoveredKg === undefined ? null : input.lithiumRecoveredKg.toFixed(3),
      cobaltRecoveredKg: input.cobaltRecoveredKg === undefined ? null : input.cobaltRecoveredKg.toFixed(3),
      nickelRecoveredKg: input.nickelRecoveredKg === undefined ? null : input.nickelRecoveredKg.toFixed(3),
    };
    // Serialize on the battery row; check BOTH legacy identity columns, not a
    // caller-chosen pair or fresh tokenId. Prevent retries/concurrent duplicates.
    const existing = await tx.select().from(eprTokens).where(and(
      or(eq(eprTokens.batteryId, battery.id), eq(eprTokens.bpan, battery.bpan)),
      or(eq(eprTokens.status, "pending"), eq(eprTokens.status, "verified")),
    )).orderBy(eprTokens.id).limit(2);
    if (existing.length) {
      const old = existing[0];
      const sameMasses = Object.entries(masses).every(([key, expected]) => {
        const prior = old[key as keyof typeof masses];
        return expected === null ? prior === null : prior !== null && Number(prior) === Number(expected);
      });
      if (existing.length !== 1 || old.status !== "pending" || old.batteryId !== battery.id || old.bpan !== battery.bpan ||
          old.recyclerId !== resourceActor(actor).id || !sameMasses) {
        throw new TRPCError({ code: "CONFLICT", message: "Yield assessment already exists; reviewed correction required" });
      }
      return { token: old, yieldRatio: Number(old.yieldRatio), status: "pending" as const, replayed: true, creditIssued: false as const };
    }
    const yieldRatio = input.actualYieldKg / input.theoreticalYieldKg;
    const [token] = await tx.insert(eprTokens).values({
      tokenId: canonicalToken, bpan: battery.bpan, batteryId: battery.id, recyclerId: resourceActor(actor).id,
      ...masses, yieldRatio: yieldRatio.toFixed(4), status: "pending",
      blockchainTxHash: null, blockchainBlock: null, verifiedAt: null,
    }).returning();
    if (!token) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Yield persistence failed" });
    // No compliance credit, payout, alert/provider/hardware call or physical-verification claim.
    return { token, yieldRatio, status: "pending" as const, replayed: false, creditIssued: false as const };
  });
}

export const ownedBatteryListInput = z.object({
  status: z.string().max(64).optional(), chemistry: z.string().max(64).optional(),
  search: z.string().max(100).optional(), limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().nonnegative().max(100000).default(0),
}).strict();
export async function listOwnedBatteries(db: OwnershipDb, actor: ResourceActor, value: unknown) {
  const input = parse(ownedBatteryListInput, value);
  const predicate = and(batteryOwnerPredicate(actor),
    input.status === undefined ? undefined : eq(batteries.status, input.status),
    input.chemistry === undefined ? undefined : eq(batteries.chemistry, input.chemistry),
    input.search === undefined ? undefined : sql`position(${input.search} in ${batteries.bpan}) > 0`,
  );
  const [items, total] = await Promise.all([
    db.select().from(batteries).where(predicate).orderBy(desc(batteries.createdAt), desc(batteries.id)).limit(input.limit).offset(input.offset),
    db.select({ count: sql<number>`count(*)::int` }).from(batteries).where(predicate),
  ]);
  return { items, total: total[0]?.count ?? 0 };
}
export async function getOwnedBatteryStats(db: OwnershipDb, actor: ResourceActor) {
  const stats = await db.select({ status: batteries.status, count: sql<number>`count(*)::int` })
    .from(batteries).where(batteryOwnerPredicate(actor)).groupBy(batteries.status);
  const result = { total: 0, operational: 0, secondLife: 0, endOfLife: 0, inTransit: 0 };
  for (const row of stats) {
    result.total += row.count;
    if (row.status === "operational") result.operational += row.count;
    else if (row.status === "second_life") result.secondLife += row.count;
    else if (row.status === "end_of_life") result.endOfLife += row.count;
    else if (row.status === "in_transit") result.inTransit += row.count;
  }
  return result;
}

export const ownedHistoryInput = z.object({ bpan: ownershipBpan,
  limit: z.number().int().min(1).max(200).default(100),
}).strict();
export function getOwnedBatteryRelated(db: OwnershipDb, actor: ResourceActor, value: unknown,
  kind: "telemetryLatest" | "telemetryHistory"): Promise<Array<typeof telemetry.$inferSelect>>;
export function getOwnedBatteryRelated(db: OwnershipDb, actor: ResourceActor, value: unknown,
  kind: "predictionLatest" | "predictionHistory"): Promise<Array<typeof sohPredictions.$inferSelect>>;
export function getOwnedBatteryRelated(db: OwnershipDb, actor: ResourceActor, value: unknown,
  kind: "telemetryLatest" | "telemetryHistory" | "predictionLatest" | "predictionHistory"):
  Promise<Array<typeof telemetry.$inferSelect> | Array<typeof sohPredictions.$inferSelect>>;
export async function getOwnedBatteryRelated(db: OwnershipDb, actor: ResourceActor, value: unknown,
  kind: "telemetryLatest" | "telemetryHistory" | "predictionLatest" | "predictionHistory") {
  const input = parse(ownedHistoryInput, value);
  return withOwnedBattery(db, actor, { bpan: input.bpan }, async (tx, battery) => {
    if (kind === "telemetryLatest" || kind === "telemetryHistory") {
      const rows = await tx.select().from(telemetry).where(and(eq(telemetry.bpan, battery.bpan), eq(telemetry.batteryId, battery.id)))
        .orderBy(desc(telemetry.recordedAt), desc(telemetry.id)).limit(kind === "telemetryLatest" ? 1 : input.limit);
      return rows;
    }
    const rows = await tx.select().from(sohPredictions).where(and(eq(sohPredictions.bpan, battery.bpan), eq(sohPredictions.batteryId, battery.id)))
      .orderBy(desc(sohPredictions.predictedAt), desc(sohPredictions.id)).limit(kind === "predictionLatest" ? 1 : input.limit);
    return rows;
  });
}
export async function getOwnedBatteryDetail(db: OwnershipDb, actor: ResourceActor, bpan: unknown) {
  const canonical = parse(ownershipBpan, bpan);
  return withOwnedBattery(db, actor, { bpan: canonical }, async (tx, battery) => {
    const [tel, predictions, serviceHist] = await Promise.all([
      tx.select().from(telemetry).where(and(eq(telemetry.bpan, battery.bpan), eq(telemetry.batteryId, battery.id)))
        .orderBy(desc(telemetry.recordedAt), desc(telemetry.id)).limit(1),
      tx.select().from(sohPredictions).where(and(eq(sohPredictions.bpan, battery.bpan), eq(sohPredictions.batteryId, battery.id)))
        .orderBy(desc(sohPredictions.predictedAt), desc(sohPredictions.id)).limit(10),
      tx.select().from(serviceHistory).where(and(eq(serviceHistory.bpan, battery.bpan), eq(serviceHistory.batteryId, battery.id)))
        .orderBy(desc(serviceHistory.servicedAt)).limit(100),
    ]);
    // The dedicated warranty subject defines additional record privacy; do not
    // leak contacts/invoices through this battery aggregate. Empty is WITHHELD,
    // not evidence of no coverage. Preserve shape for existing detail clients.
    return { battery, latestTelemetry: tel[0], latestSoh: predictions[0], sohHistory: predictions,
      serviceHistory: serviceHist, warranties: [] as Array<typeof warrantyRecords.$inferSelect & {
        effectiveStatus: string; daysRemaining: number; isInWarranty: boolean;
      }>, activeWarranty: null as (typeof warrantyRecords.$inferSelect & {
        effectiveStatus: string; daysRemaining: number; isInWarranty: boolean;
      }) | null, warrantyAvailability: "withheld_use_owned_warranty_route" as const };
  });
}
