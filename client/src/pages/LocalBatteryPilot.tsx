import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { pilotCreateAssetSchema, PILOT_LABEL } from "@shared/localPilotContract";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Link } from "wouter";
// Actual integrated pilot namespace; existing native tRPC provider/session is reused.
const api = trpc;
export default function LocalBatteryPilot() {
  const [assetRef, setAssetRef] = useState("");
  const [assetJson, setAssetJson] = useState("");
  const [deviceName, setDeviceName] = useState("");
  const [captureRevision, setCaptureRevision] = useState("");
  const [credential, setCredential] = useState<{ token: string; deviceRef: string } | null>(null);
  const [message, setMessage] = useState("");
  const auth = trpc.auth.me.useQuery();
  const status = api.pilot.status.useQuery(undefined, { enabled: !!auth.data, retry: false });
  const enabled = !!auth.data && status.data?.enabled === true;
  const assets = api.pilot.listAssets.useQuery(undefined, { enabled, retry: false });
  const devices = api.pilot.listDevices.useQuery({ assetRef }, { enabled: enabled && !!assetRef, retry: false });
  const readings = api.pilot.latestReadings.useQuery({ assetRef }, { enabled: enabled && !!assetRef, retry: false });
  const create = api.pilot.createAsset.useMutation({ onSuccess: asset => { setAssetRef(asset.assetRef); setMessage(`Persisted local asset ID ${asset.id}; physical connection not verified.`); void assets.refetch(); }, onError: e => setMessage(e.message) });
  const provision = api.pilot.provisionDevice.useMutation({ onSuccess: result => { setCredential({ token: result.token, deviceRef: result.device.deviceRef }); provision.reset(); void devices.refetch(); }, onError: e => setMessage(e.message) });
  const revoke = api.pilot.revokeDevice.useMutation({ onSuccess: () => { setCredential(null); setMessage("Device revoked; existing readings retained."); void devices.refetch(); }, onError: e => setMessage(e.message) });
  function createAsset() {
    try { const data = pilotCreateAssetSchema.parse(JSON.parse(assetJson)); create.mutate(data); }
    catch { setMessage("Invalid asset JSON. Use the documented template, actual sourced values and operator-approved reading envelope; do not invent missing facts."); }
  }
  return <section className="space-y-6 p-4 max-w-6xl mx-auto">
    <header><Link href="/dashboard" className="text-sm underline">Back to dashboard</Link><h1 className="text-3xl font-semibold mt-3">Local battery pilot</h1><p className="text-muted-foreground mt-2">{PILOT_LABEL}</p></header>
    <div className="rounded-lg border border-amber-500/50 bg-card text-card-foreground p-4"><strong>Bounded observation only.</strong> No simulator, broker, automatic hardware connection, paging, control commands or safety/SOH certification. Accepted-reading envelopes validate recorded data; they are not protective cutoffs. Unknown information remains unknown. Government identity/allocation is null and unverified.</div>
    {auth.isLoading && <p>Checking native session…</p>}
    {!auth.isLoading && !auth.data && <p>Sign in with your existing native account at <Link href="/login" className="underline">Login</Link>. No new account or credential reset is required here.</p>}
    {status.error && <p role="alert">Pilot API unavailable or not mounted: {status.error.message}. No registration or connection is confirmed.</p>}
    {status.data && !enabled && <p role="status">Disabled pending reviewed additive schema and authentication acceptance. No device provisioning or ingestion is currently available.</p>}
    <p role="status" className="text-sm">{message}</p>
    <div className="grid lg:grid-cols-2 gap-6">
      <Card><CardHeader><CardTitle>Create an owned local asset</CardTitle></CardHeader><CardContent className="space-y-3"><p className="text-sm text-muted-foreground">Paste the complete asset JSON from LOCAL_PILOT.md using physical serial, sourced chemistry/ratings, evidence references, consent, interface/procedure revisions and approved min/max envelopes. No specification defaults are supplied.</p><label htmlFor="pilot-asset-json" className="text-sm">Documented asset JSON</label><Textarea id="pilot-asset-json" value={assetJson} onChange={e => setAssetJson(e.target.value)} rows={14} placeholder="No illustrative values will be persisted automatically." disabled={!enabled || create.isPending} /><Button disabled={!enabled || !assetJson || create.isPending} onClick={createAsset}>{create.isPending ? "Persisting…" : "Create local asset"}</Button></CardContent></Card>
      <Card><CardHeader><CardTitle>Your owned assets</CardTitle></CardHeader><CardContent className="space-y-3">{assets.isLoading && enabled && <p>Loading…</p>}{assets.error && <p role="alert">{assets.error.message}</p>}{enabled && assets.data?.length === 0 && <p>No owned local assets. Legacy batteries are not remapped.</p>}{assets.data?.map(asset => <button key={asset.assetRef} className={`block w-full text-left rounded border p-3 ${assetRef === asset.assetRef ? "border-primary" : "border-border"}`} onClick={() => { setAssetRef(asset.assetRef); setCredential(null); setMessage(""); }}><strong>{asset.manufacturerSerial}</strong><span className="block text-xs break-all">{asset.assetRef} · ID {asset.id}</span><span className="block text-sm">{asset.profile.chemistry} · {asset.profile.nominalVoltage.value} V · {asset.profile.ratedCapacity.value} {asset.profile.ratedCapacity.unit}</span><span className="text-xs">Official allocation: unverified; not a safety certificate.</span></button>)}</CardContent></Card>
    </div>
    {assetRef && <Card><CardHeader><CardTitle>Asset-scoped capture credentials</CardTitle></CardHeader><CardContent className="space-y-3"><p className="text-sm break-all">Asset {assetRef}. Mapping is immutable; credential revocation cannot be undone by a heartbeat.</p><label htmlFor="pilot-device-name">Device name</label><Input id="pilot-device-name" value={deviceName} onChange={e => setDeviceName(e.target.value)} disabled={!enabled} /><label htmlFor="pilot-capture-revision">Approved capture/decoder revision</label><Input id="pilot-capture-revision" value={captureRevision} onChange={e => setCaptureRevision(e.target.value)} disabled={!enabled} /><Button disabled={!enabled || !deviceName || !captureRevision || provision.isPending} onClick={() => { setCredential(null); provision.mutate({ assetRef, name: deviceName, captureRevision }); }}>Provision one-time token</Button>
      {credential && <div className="border rounded p-3 space-y-2"><p>One-time token for {credential.deviceRef}. Store privately in your approved environment; never place it in captures, URLs or logs. Lists will not reveal it again.</p><code className="block break-all select-all">{credential.token}</code><Button onClick={async () => { try { await navigator.clipboard.writeText(credential.token); setMessage("Token copied. Clear the clipboard when finished."); } catch { setMessage("Clipboard unavailable; copy the visible token manually."); } }}>Copy once-issued token</Button><Button variant="outline" onClick={() => setCredential(null)}>Hide token</Button></div>}
      {devices.error && <p role="alert">{devices.error.message}</p>}{devices.data?.map(device => <div key={device.deviceRef} className="flex justify-between gap-3 border-t pt-3"><div>{device.name}<p className="text-xs break-all">{device.deviceRef} · {device.captureRevision}</p><p className="text-sm">{device.revokedAt ? "Revoked" : "Provisioned — connection not established"}; last persisted sample {device.lastSeenAt ? new Date(device.lastSeenAt).toLocaleString() : "none"}</p></div><Button variant="outline" disabled={!enabled || !!device.revokedAt || revoke.isPending} onClick={() => { if (window.confirm("Revoke this device token? This cannot be undone; historical readings are retained.")) revoke.mutate({ assetRef, deviceRef: device.deviceRef }); }}>Revoke</Button></div>)}</CardContent></Card>}
    {assetRef && <Card><CardHeader><CardTitle>Latest persisted BMS-reported readings</CardTitle></CardHeader><CardContent className="space-y-3"><Button variant="outline" disabled={!enabled || readings.isFetching} onClick={() => void readings.refetch()}>Refresh manually</Button><p className="text-sm">No automatic polling or simulator. An ingestion receipt confirms storage, not measurement calibration, physical identity, safety or SOH.</p>{readings.error && <p role="alert">{readings.error.message}</p>}{readings.data?.length === 0 && <p>No readings persisted. No actual physical connection is claimed.</p>}{readings.data?.map(reading => <div key={reading.id} className="border-t pt-3"><p>Reading #{reading.id} · BMS_REPORTED · {new Date(reading.recordedAt).toLocaleString()} {Date.now() - new Date(reading.recordedAt).getTime() > 300000 ? "· STALE" : "· check capture provenance"}</p><pre className="text-xs overflow-auto">{JSON.stringify({ metrics: reading.payload.metrics, units: reading.payload.units, captureRevision: reading.payload.captureRevision, sampleId: reading.sampleId }, null, 2)}</pre></div>)}</CardContent></Card>}
  </section>;
}
