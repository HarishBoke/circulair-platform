import { z, ZodError } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "./_core/trpc";
import { localPilotStore, type LocalPilotStore } from "./localPilotDb";
import { PilotError, pilotAssetRefSchema, pilotCreateAssetSchema, pilotProvisionSchema, pilotEnabled, requirePilotEnabled } from "../shared/localPilotContract";
async function safe<T>(operation: () => Promise<T>): Promise<T> {
  try { requirePilotEnabled(); return await operation(); }
  catch (error) {
    if (error instanceof PilotError) throw new TRPCError({ code: error.status === 404 ? "NOT_FOUND" : error.status === 422 ? "BAD_REQUEST" : "SERVICE_UNAVAILABLE", message: error.code });
    if (error instanceof ZodError) throw new TRPCError({ code: "BAD_REQUEST", message: "pilot_input_invalid" });
    throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "pilot_store_unavailable" });
  }
}
export function createLocalPilotRouter(store: LocalPilotStore = localPilotStore) {
  return router({
    status: protectedProcedure.query(() => ({ enabled: pilotEnabled(), namespace: "LOCAL_PILOT" as const, officialVerification: "unverified" as const, physicalAcceptance: "not_established" as const })),
    createAsset: protectedProcedure.input(pilotCreateAssetSchema).mutation(({ ctx, input }) => safe(() => store.createAsset(ctx.user.id, input))),
    listAssets: protectedProcedure.query(({ ctx }) => safe(() => store.listAssets(ctx.user.id))),
    getAsset: protectedProcedure.input(z.object({ assetRef: pilotAssetRefSchema }).strict()).query(({ ctx, input }) => safe(() => store.getAsset(ctx.user.id, input.assetRef))),
    provisionDevice: protectedProcedure.input(pilotProvisionSchema).mutation(({ ctx, input }) => safe(() => store.provisionDevice(ctx.user.id, input))),
    listDevices: protectedProcedure.input(z.object({ assetRef: pilotAssetRefSchema }).strict()).query(({ ctx, input }) => safe(() => store.listDevices(ctx.user.id, input.assetRef))),
    revokeDevice: protectedProcedure.input(z.object({ assetRef: pilotAssetRefSchema, deviceRef: z.string().uuid() }).strict()).mutation(({ ctx, input }) => safe(() => store.revokeDevice(ctx.user.id, input.assetRef, input.deviceRef))),
    latestReadings: protectedProcedure.input(z.object({ assetRef: pilotAssetRefSchema }).strict()).query(({ ctx, input }) => safe(() => store.latestReadings(ctx.user.id, input.assetRef))),
  });
}
export const localPilotRouter = createLocalPilotRouter();
// This scoped client type matches the exact required central pilot mount; no auth vendor is added.
export type LocalPilotAppRouter = ReturnType<typeof localPilotAppContract>;
function localPilotAppContract() { return router({ pilot: localPilotRouter }); }
