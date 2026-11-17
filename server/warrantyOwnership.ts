import { TRPCError } from "@trpc/server";
import { and, eq, sql, type SQL, type AnyColumn } from "drizzle-orm";
import { batteries } from "../drizzle/schema";
import { bpanReadSchema } from "../shared/bpanContract";

/** Only a server-authenticated user may be passed here; never derive this from input. */
export type WarrantyActor = { id: number; role: string };
export function requireWarrantyActor(actor?: WarrantyActor | null): WarrantyActor {
  if (!actor || !Number.isSafeInteger(actor.id) || actor.id <= 0) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Authentication required" });
  }
  return actor;
}
export function warrantyNotFound(): never {
  throw new TRPCError({ code: "NOT_FOUND", message: "Resource not found" });
}
export function requireWarrantyAdmin(actor?: WarrantyActor | null) {
  const user = requireWarrantyActor(actor);
  if (user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Administrator required" });
  return user;
}
export function batteryOwnerPredicate(actor?: WarrantyActor | null): SQL {
  const user = requireWarrantyActor(actor);
  return user.role === "admin" ? sql`true` : eq(batteries.ownerId, user.id);
}
/** Correlate BOTH identity columns. Legacy inconsistent rows are retained but not exposed. */
export function batteryResourcePredicate(batteryId: AnyColumn, bpan: AnyColumn, actor?: WarrantyActor | null): SQL {
  return sql`exists (select 1 from ${batteries} where ${batteries.id} = ${batteryId}
    and ${batteries.bpan} = ${bpan} and ${batteryOwnerPredicate(actor)})`;
}
export function assertCanonicalIdentity(
  battery: { id: number; bpan: string } | null | undefined,
  input: { batteryId?: number; bpan?: string },
) {
  if (!battery) warrantyNotFound();
  if ((input.batteryId !== undefined && input.batteryId !== battery.id) ||
      (input.bpan !== undefined && input.bpan !== battery.bpan)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Battery identity mismatch" });
  }
  return { batteryId: battery.id, bpan: battery.bpan };
}
/** Shared compatibility validator plus exact stored identity; no competing BPAN format. */
type BatteryLookupDb = Pick<NonNullable<Awaited<ReturnType<typeof import("./db").getDb>>>, "select">;
export async function getOwnedCanonicalBattery(db: BatteryLookupDb, input: { batteryId?: number; bpan?: string }, actor?: WarrantyActor | null, lock = false) {
  const scope = batteryOwnerPredicate(actor);
  if ((input.batteryId !== undefined && (!Number.isSafeInteger(input.batteryId) || input.batteryId <= 0)) ||
      (input.batteryId === undefined && !input.bpan)) warrantyNotFound();
  if (input.bpan !== undefined && !bpanReadSchema.safeParse(input.bpan).success) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid battery identifier" });
  }
  const key = input.batteryId !== undefined ? eq(batteries.id, input.batteryId) : eq(batteries.bpan, input.bpan!);
  const query = db.select().from(batteries).where(and(key, scope)).limit(1);
  const [battery] = lock ? await query.for("update") : await query;
  assertCanonicalIdentity(battery, input);
  return battery as typeof batteries.$inferSelect;
}
export function warrantyTermEndDate(start: Date, months: number): Date {
  if (!Number.isFinite(start.getTime()) || !Number.isInteger(months) || months < 1 || months > 120) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid warranty dates or term" });
  }
  const end = new Date(start);
  const day = end.getUTCDate();
  end.setUTCDate(1);
  end.setUTCMonth(end.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() + 1, 0)).getUTCDate();
  end.setUTCDate(Math.min(day, lastDay));
  return end;
}
export function validateWarrantyDates(data: { purchaseDate: Date; warrantyStartDate: Date; warrantyEndDate: Date; warrantyTermMonths: number }) {
  const dates = [data.purchaseDate, data.warrantyStartDate, data.warrantyEndDate].map(d => new Date(d).getTime());
  if (dates.some(d => !Number.isFinite(d)) || dates[1] < dates[0] || dates[2] <= dates[1] ||
      !Number.isInteger(data.warrantyTermMonths) || data.warrantyTermMonths < 1 || data.warrantyTermMonths > 120 ||
      warrantyTermEndDate(new Date(data.warrantyStartDate), data.warrantyTermMonths).getTime() !== dates[2]) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid warranty dates or term" });
  }
}
export function validateSelfDeclaredCarbon(data: { totalKgCo2e: string; rawMaterialKgCo2e?: string | null; productionKgCo2e?: string | null; distributionKgCo2e?: string | null; endOfLifeKgCo2e?: string | null; certifyingBody?: string | null }) {
  const total = Number(data.totalKgCo2e);
  const raw = [data.rawMaterialKgCo2e, data.productionKgCo2e, data.distributionKgCo2e, data.endOfLifeKgCo2e];
  const stages = raw.filter((s): s is string => s !== undefined && s !== null).map(Number);
  if (!Number.isFinite(total) || total <= 0 || total >= 10000000 ||
      stages.some(s => !Number.isFinite(s) || s < 0 || s >= 10000000) ||
      (stages.length > 0 && (stages.length !== 4 || Math.abs(stages.reduce((a, b) => a + b, 0) - total) > 0.002))) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Carbon stages must be nonnegative and reconcile to total" });
  }
  if (data.certifyingBody) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Certification verification is unavailable; submit self-declared evidence only" });
}
