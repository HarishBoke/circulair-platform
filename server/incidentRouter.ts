import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { adminProcedure, router } from './_core/trpc';
import { createIncidentStore, RESOLUTION_REASONS, incidentGateReady, type IncidentDatabase, type IncidentGate } from './incidentOutbox';
import type { OpenSourceAlertingAdapter } from './openSourceAlerting';

/** Native router factory. Parent mounts only after review; no globals, DB import, automatic sender or scheduler. */
export function createIncidentRouter(deps: {
  getDatabase(): Promise<IncidentDatabase | null>;
  adapter(): OpenSourceAlertingAdapter;
  gate(): IncidentGate;
}) {
  const uuid = z.string().uuid();
  const scoped = z.object({ incidentId: uuid, evidenceRef: uuid }).strict();
  const getStore = async () => {
    const db = await deps.getDatabase();
    if (!db) throw new TRPCError({ code: 'SERVICE_UNAVAILABLE', message: 'Incident database unavailable' });
    return createIncidentStore(db);
  };
  const command = async <T>(fn: () => Promise<T>): Promise<T> => {
    try { return await fn(); }
    catch { throw new TRPCError({ code: 'CONFLICT', message: 'Incident command blocked; check authorization, evidence, pinned destination or retry when send lock is free' }); }
  };
  return router({
    status: adminProcedure.input(z.object({ limit: z.number().int().min(1).max(100).default(50) }).strict().optional())
      .query(async ({ ctx, input }) => {
        const adapter = deps.adapter(); const gate = deps.gate();
        const base = { adapterEnabled: adapter.enabled, outboxEnabled: gate.enabled, configured: adapter.configured,
          activationGateReady: incidentGateReady(adapter, gate), approvedActivationAt: gate.activationAt,
          deliveryEnabledMeaning: 'Also requires matching durable destination approval; server acceptance is not phone/human acknowledgement' };
        try { return { ...base, databaseReady: true, ...await (await getStore()).status(ctx.user, input?.limit ?? 50) }; }
        catch { return { ...base, databaseReady: false, counts: [], items: [] }; }
      }),
    resolve: adminProcedure.input(scoped.extend({ reason: z.enum(RESOLUTION_REASONS) }).strict())
      .mutation(({ ctx, input }) => command(async () => (await getStore()).resolve(ctx.user, input.incidentId, input.reason, input.evidenceRef, deps.gate().refreshMs))),
    approveDestination: adminProcedure.input(z.object({ evidenceRef: uuid }).strict())
      .mutation(({ ctx, input }) => command(async () => (await getStore()).approveDestination(ctx.user, deps.adapter(), deps.gate(), input.evidenceRef))),
    retryDeadLetter: adminProcedure.input(z.object({ deliveryId: uuid, evidenceRef: uuid }).strict())
      .mutation(({ ctx, input }) => command(async () => (await getStore()).retryDeadLetter(ctx.user, input.deliveryId, input.evidenceRef))),
    releaseQuarantine: adminProcedure.input(scoped)
      .mutation(({ ctx, input }) => command(async () => (await getStore()).releaseQuarantine(ctx.user, input.incidentId, input.evidenceRef, deps.adapter(), deps.gate()))),
  });
}
