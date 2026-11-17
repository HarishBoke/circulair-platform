import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { PassThrough } from "node:stream";
import { readFileSync } from "node:fs";
import { pilotCreateAssetSchema, pilotReadingSchema, validatePilotReading, PilotError, type PilotCreateAsset } from "../shared/localPilotContract";
import { parsePilotJson } from "../shared/localPilotJson";
import { createPilotStore, hashPilotToken, hashPilotReading } from "./localPilotDb";
import { createLocalPilotRouter } from "./localPilotRouter";
import { createLocalPilotRestRouter, pilotReadingHandler, pilotRestPreflight } from "./localPilotRest";
const assetRef = randomUUID(), deviceRef = randomUUID();
const token = "lp1_" + "a".repeat(43);
const profile: PilotCreateAsset = { manufacturerSerial: " Exact/Serial 001 ", chemistry: "documented QA chemistry", nominalVoltage: { value: 12, unit: "V" }, ratedCapacity: { value: 10, unit: "Ah" }, specificationEvidence: "QA fixture only", specificationRevision: "fixture/1", interfaceDescription: "offline double", interfaceRevision: "fixture/1", procedureRevision: "fixture/1", currentSignConvention: "positive discharge", units: { vPack: "V", iPack: "A", tPack: "degC", socReported: "%" }, acceptedReadingEnvelope: { vPack: { min: 0, max: 15 }, iPack: { min: -5, max: 5 }, socReported: { min: 0, max: 100 } }, ownerAttestation: { consent: true, attestedAt: new Date().toISOString(), evidenceReference: "QA only" }, provenance: { source: "physical-label-and-owner-attestation", observedAt: new Date().toISOString(), evidenceReference: "synthetic test provenance" } };
function sample() { return { sampleId: randomUUID(), recordedAt: new Date().toISOString(), source: "BMS_REPORTED" as const, captureRevision: "capture/1", metrics: { vPack: 0, iPack: 0, socReported: 0 }, units: { vPack: "V" as const, iPack: "A" as const, socReported: "%" as const } }; }
function response() { return { statusCode: 0, body: undefined as any, headers: {} as Record<string,string>, setHeader(k: string,v: string) { this.headers[k]=v; }, status(n: number) { this.statusCode=n; return this; }, json(body: unknown) { this.body=body; return this; } }; }
function request(body: unknown = sample()) { return { params: { assetRef }, headers: { authorization: "Bearer " + token, "content-type": "application/json" }, body: Buffer.from(JSON.stringify(body)) }; }
function fakeDb(results: unknown[], commitFailure = false) {
  const calls: Array<{ operation: string; args: unknown[] }> = [];
  const next = () => { if (!results.length) throw new Error("unexpected database operation"); const v = results.shift(); if (v instanceof Error) return Promise.reject(v); return Promise.resolve(v); };
  const db: any = { transaction: vi.fn(async (run: any) => { const value = await run(db); if (commitFailure) throw new Error("mock commit failure"); return value; }), execute: vi.fn(async (...args: unknown[]) => { calls.push({operation:"execute",args}); return next(); }) };
  for (const operation of ["select", "insert", "update"]) db[operation] = (...args: unknown[]) => {
    calls.push({operation,args});
    const chain: any = {};
    for (const method of ["from", "where", "limit", "for", "orderBy", "values", "set", "returning"]) chain[method] = (...args: unknown[]) => { calls.push({operation:method,args}); return chain; };
    chain.then = (resolve: any, reject: any) => next().then(resolve,reject); return chain;
  };
  return { db, calls, pending: results };
}
beforeEach(() => vi.stubEnv("LOCAL_PILOT_ENABLED", "true"));
afterEach(() => vi.unstubAllEnvs());
describe("local pilot strict provenance and units", () => {
  it("preserves physical serial exactly and does not invent optional facts", () => { const p=pilotCreateAssetSchema.parse(profile); expect(p.manufacturerSerial).toBe(profile.manufacturerSerial); expect(p.model).toBeUndefined(); });
  for (const field of ["chemistry", "nominalVoltage", "ratedCapacity", "specificationEvidence", "ownerAttestation", "interfaceRevision", "procedureRevision", "acceptedReadingEnvelope"])
    it(`requires ${field}`, () => { const p:any={...profile}; delete p[field]; expect(pilotCreateAssetSchema.safeParse(p).success).toBe(false); });
  for (const source of ["measured", "SYNTHETIC", "REFERENCE_MEASUREMENT", "DERIVED", ""])
    it(`rejects source ${source}`, () => expect(pilotReadingSchema.safeParse({...sample(),source}).success).toBe(false));
  it("rejects unsupported safety/SOH fields", () => expect(pilotReadingSchema.safeParse({...sample(),soh:100}).success).toBe(false));
  for (const value of [NaN,Infinity,-Infinity,"0",null,true]) it(`rejects nonnumeric finite value ${String(value)}`, () => expect(pilotReadingSchema.safeParse({...sample(),metrics:{vPack:value},units:{vPack:"V"}}).success).toBe(false));
  it("retains explicit zero, and unknown fields are absent", () => {const p=pilotReadingSchema.parse(sample()); expect(p.metrics.vPack).toBe(0);expect(p.metrics.tPack).toBeUndefined();});
  it("rejects inconsistent metric/unit key sets",()=>expect(pilotReadingSchema.safeParse({...sample(),units:{vPack:"V"}}).success).toBe(false));
  it("rejects wrong units",()=>expect(pilotReadingSchema.safeParse({...sample(),units:{vPack:"mV",iPack:"A",socReported:"%"}}).success).toBe(false));
  it("rejects reversed profile range",()=>expect(pilotCreateAssetSchema.safeParse({...profile,acceptedReadingEnvelope:{vPack:{min:15,max:0}}}).success).toBe(false));
  it("accepts pack-specific zero envelope readings",()=>expect(()=>validatePilotReading(sample(),profile,"capture/1")).not.toThrow());
  it("rejects undocumented temperature",()=>expect(()=>validatePilotReading({...sample(),metrics:{tPack:20},units:{tPack:"degC"}},profile,"capture/1")).toThrow(PilotError));
  it("rejects range exceeded",()=>expect(()=>validatePilotReading({...sample(),metrics:{vPack:16},units:{vPack:"V"}},profile,"capture/1")).toThrow(PilotError));
  for (const delta of [-300001,30001]) it(`rejects time offset ${delta}`,()=>{const now=Date.now();expect(()=>validatePilotReading({...sample(),recordedAt:new Date(now+delta).toISOString()},profile,"capture/1",now)).toThrow(PilotError);});
  it("rejects mismatched decoder revision",()=>expect(()=>validatePilotReading(sample(),profile,"other")).toThrow(PilotError));
  it("canonical hash is order invariant but detects value mismatch",()=>{const p=sample();expect(hashPilotReading(p)).toBe(hashPilotReading({...p,metrics:{socReported:0,iPack:0,vPack:0}}));expect(hashPilotReading(p)).not.toBe(hashPilotReading({...p,metrics:{...p.metrics,vPack:1}}));});
  it("rejects duplicate JSON keys including escaped aliases",()=>expect(()=>parsePilotJson(Buffer.from('{"source":"SYNTHETIC","sour\\u0063e":"BMS_REPORTED"}'))).toThrow(PilotError));
  it("rejects excessive JSON nesting",()=>expect(()=>parsePilotJson(Buffer.from('['.repeat(17)+'0'+']'.repeat(17)))).toThrow(PilotError));
  it("rejects invalid UTF8",()=>expect(()=>parsePilotJson(Buffer.from([255]))).toThrow(PilotError));
  it("rejects over 8KiB",()=>expect(()=>parsePilotJson(Buffer.alloc(8193))).toThrow(PilotError));
});
describe("native auth and owner-only store boundary",()=>{
  it("anonymous native caller rejected without database work",async()=>{const listAssets=vi.fn();const caller=createLocalPilotRouter({listAssets} as any).createCaller({user:null,req:{},res:{}} as any);await expect(caller.listAssets()).rejects.toMatchObject({code:"UNAUTHORIZED"});expect(listAssets).not.toHaveBeenCalled();});
  it("native user ID including admin is never substituted",async()=>{const listAssets=vi.fn().mockResolvedValue([]);const caller=createLocalPilotRouter({listAssets} as any).createCaller({user:{id:2,role:"admin"},req:{},res:{}} as any);await caller.listAssets();expect(listAssets).toHaveBeenCalledWith(2);});
  it("feature off avoids database resolver",async()=>{vi.stubEnv("LOCAL_PILOT_ENABLED","");const getter=vi.fn();await expect(createPilotStore(getter).listAssets(1)).rejects.toMatchObject({status:503});expect(getter).not.toHaveBeenCalled();});
  it("foreign and missing owner lookup uniformly not found",async()=>{for(const owner of [1,2]){const mock=fakeDb([[]]);await expect(createPilotStore(async()=>mock.db).getAsset(owner,assetRef)).rejects.toMatchObject({status:404,code:"pilot_asset_not_found"});}});
  it("asset create returns actual inserted identity and provenance in same transaction",async()=>{const inserted={id:41,assetRef,ownerId:1,manufacturerSerial:profile.manufacturerSerial};const mock=fakeDb([[inserted],[{id:42}]]);expect(await createPilotStore(async()=>mock.db).createAsset(1,profile)).toEqual(inserted);expect(mock.db.transaction).toHaveBeenCalledOnce();expect(mock.calls.filter(c=>c.operation==="insert")).toHaveLength(2);});
  it("missing provenance confirmation fails rather than success",async()=>{const mock=fakeDb([[{id:41,assetRef}],[]]);await expect(createPilotStore(async()=>mock.db).createAsset(1,profile)).rejects.toMatchObject({status:503});});
  it("256-bit token once issued and only hash stored",async()=>{const mock=fakeDb([[{assetRef}],[{id:43,deviceRef,assetRef}]]);const result=await createPilotStore(async()=>mock.db).provisionDevice(1,{assetRef,name:"QA",captureRevision:"capture/1"});expect(result.token).toMatch(/^lp1_[A-Za-z0-9_-]{43}$/);expect(Buffer.from(result.token.slice(4),"base64url")).toHaveLength(32);const stored:any=mock.calls.find(c=>c.operation==="values")?.args[0];expect(stored.credentialHash).toBe(hashPilotToken(result.token));expect(JSON.stringify(stored)).not.toContain(result.token);expect(result.device).not.toHaveProperty("credentialHash");});
  it("list devices uses explicit non-secret projection",async()=>{const mock=fakeDb([[{id:1}],[]]);await createPilotStore(async()=>mock.db).listDevices(1,assetRef);const projection:any=mock.calls.filter(c=>c.operation==="select")[1].args[0];expect(projection).not.toHaveProperty("credentialHash");});
});
describe("atomic SQL-helper transaction flow (mocked, not PostgreSQL acceptance)",()=>{
  const device={id:1,deviceRef,assetRef,ownerId:1,revokedAt:null,captureRevision:"capture/1"};
  const asset={id:2,assetRef,ownerId:1,profile};
  it("locks device + asset, persists, heartbeat only active, actual committed receipt",async()=>{const mock=fakeDb([[device],[asset],[],{rows:[{now:new Date()}]},[{id:47}],[{id:1}]]);const p=sample();expect(await createPilotStore(async()=>mock.db).ingest(assetRef,token,p)).toEqual({readingId:47,assetRef,sampleId:p.sampleId,duplicate:false});expect(mock.calls.filter(c=>c.operation==="for").map(c=>c.args)).toEqual([["update"],["update"]]);const patch:any=mock.calls.find(c=>c.operation==="set")?.args[0];expect(Object.keys(patch)).toEqual(["lastSeenAt"]);});
  it("revoked token performs no reading insert or heartbeat",async()=>{const mock=fakeDb([[{...device,revokedAt:new Date()}]]);await expect(createPilotStore(async()=>mock.db).ingest(assetRef,token,sample())).rejects.toMatchObject({status:401});expect(mock.calls.some(c=>c.operation==="insert"||c.operation==="update")).toBe(false);});
  it("exact idempotent repeat returns original receipt even if later stale",async()=>{const p={...sample(),recordedAt:new Date(0).toISOString()};const mock=fakeDb([[device],[asset],[{id:48,deviceRef,payloadHash:hashPilotReading(p)}]]);expect(await createPilotStore(async()=>mock.db).ingest(assetRef,token,p)).toMatchObject({readingId:48,duplicate:true});expect(mock.calls.some(c=>c.operation==="insert")).toBe(false);});
  it("same UUID changed payload is 409",async()=>{const p=sample();const mock=fakeDb([[device],[asset],[{id:48,deviceRef,payloadHash:"changed"}]]);await expect(createPilotStore(async()=>mock.db).ingest(assetRef,token,p)).rejects.toMatchObject({status:409});});
  it("same sample from another device is 409",async()=>{const p=sample();const mock=fakeDb([[device],[asset],[{id:48,deviceRef:randomUUID(),payloadHash:hashPilotReading(p)}]]);await expect(createPilotStore(async()=>mock.db).ingest(assetRef,token,p)).rejects.toMatchObject({status:409});});
  it("unconfirmed insert produces no successful receipt",async()=>{const mock=fakeDb([[device],[asset],[],{rows:[{now:new Date()}]},[]]);await expect(createPilotStore(async()=>mock.db).ingest(assetRef,token,sample())).rejects.toMatchObject({status:503});});
  it("commit failure propagates; no fake confirmed receipt",async()=>{const mock=fakeDb([[device],[asset],[],{rows:[{now:new Date()}]},[{id:47}],[{id:1}]],true);await expect(createPilotStore(async()=>mock.db).ingest(assetRef,token,sample())).rejects.toThrow("mock commit failure");});
  it("failed active heartbeat aborts entire reading operation",async()=>{const mock=fakeDb([[device],[asset],[],{rows:[{now:new Date()}]},[{id:47}],[]]);await expect(createPilotStore(async()=>mock.db).ingest(assetRef,token,sample())).rejects.toMatchObject({status:503});});
  it("already-revoked record returns unchanged and cannot be reset",async()=>{const d={...device,revokedAt:new Date()};const mock=fakeDb([[d],[{id:2}]]);expect(await createPilotStore(async()=>mock.db).revokeDevice(1,assetRef,deviceRef)).toBe(d);expect(mock.calls.some(c=>c.operation==="update")).toBe(false);});
});
describe("actual REST handlers/preflight without listeners or requests",()=>{
  it("enabled, syntactically valid device preflight continues",()=>{const res=response(),next=vi.fn();pilotRestPreflight(request() as any,res as any,next);expect(next).toHaveBeenCalledOnce();expect(res.headers["Cache-Control"]).toBe("no-store");});
  for(const kind of ["disabled","auth","gzip","oversize","media"]){it(`rejects ${kind} in preflight`,()=>{const req:any=request();if(kind==="disabled")vi.stubEnv("LOCAL_PILOT_ENABLED","");if(kind==="auth")req.headers.authorization="Bearer sessionJwt";if(kind==="gzip")req.headers["content-encoding"]="gzip";if(kind==="oversize")req.headers["content-length"]="8193";if(kind==="media")req.headers["content-type"]="text/plain";const res=response(),next=vi.fn();pilotRestPreflight(req,res as any,next);expect(next).not.toHaveBeenCalled();expect(res.statusCode).toBeGreaterThanOrEqual(400);});}
  it("201 only for actual positive receipt",async()=>{const p=sample(),res=response();const ingest=vi.fn().mockResolvedValue({readingId:52,assetRef,sampleId:p.sampleId,duplicate:false});await pilotReadingHandler({ingest} as any)(request(p) as any,res as any,vi.fn());expect(res.statusCode).toBe(201);expect(ingest).toHaveBeenCalledWith(assetRef,token,p);});
  it("unpersisted ID 0 cannot be HTTP 200",async()=>{const res=response();await pilotReadingHandler({ingest:vi.fn().mockResolvedValue({readingId:0})} as any)(request() as any,res as any,vi.fn());expect(res.statusCode).toBe(503);});
  it("database failure sanitized without token or error details",async()=>{const res=response();await pilotReadingHandler({ingest:vi.fn().mockRejectedValue(new Error(token))} as any)(request() as any,res as any,vi.fn());expect(res.statusCode).toBe(503);expect(JSON.stringify(res.body)).not.toContain(token);});
  it("payload conflict 409 preserved",async()=>{const res=response();await pilotReadingHandler({ingest:vi.fn().mockRejectedValue(new PilotError(409,"pilot_sample_payload_conflict"))} as any)(request() as any,res as any,vi.fn());expect(res.statusCode).toBe(409);});
  it("synthetic payload never calls persistence",async()=>{const res=response(),ingest=vi.fn();await pilotReadingHandler({ingest} as any)(request({...sample(),source:"SYNTHETIC"}) as any,res as any,vi.fn());expect(ingest).not.toHaveBeenCalled();expect(res.statusCode).toBe(400);});
  it("raw parser actually enforces 8KiB stream bound",async()=>{const router:any=createLocalPilotRestRouter({ingest:vi.fn()} as any);const parser=router.stack[0].route.stack[1].handle;const req:any=new PassThrough();req.headers={"content-type":"application/json","content-length":"8193"};req.method="POST";const done=new Promise<any>(resolve=>parser(req,{} as any,resolve));req.end(Buffer.alloc(8193,32));expect((await done).type).toBe("entity.too.large");});
});
describe("additive migration static review",()=>{
  it("has only pilot creates, no legacy rewrite/destructive SQL",()=>{const sql=readFileSync(new URL("../drizzle/local-pilot.sql",import.meta.url),"utf8");expect(sql.replace(/^--.*$/gm, "")).not.toMatch(/\b(?:ALTER|DROP|TRUNCATE|BACKFILL)\b/i);expect([...sql.matchAll(/CREATE TABLE (\w+)/g)].map(m=>m[1])).toEqual(["local_pilot_assets","local_pilot_provenance","local_pilot_devices","local_pilot_readings"]);expect(sql).toContain("OLD.revoked_at IS NOT NULL");expect(sql).toContain("local_pilot_device_asset_uq");});
});
