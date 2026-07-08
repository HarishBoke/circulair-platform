import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Shield, Link2, CheckCircle2, Copy, ExternalLink, Hash } from "lucide-react";

const EVENT_TYPES = [
  { value: "bpan_registration", label: "BPAN Registration" },
  { value: "soh_prediction", label: "SOH Prediction" },
  { value: "epr_token_issuance", label: "EPR Token Issuance" },
  { value: "compliance_report", label: "Compliance Report" },
  { value: "marketplace_transaction", label: "Marketplace Transaction" },
  { value: "logistics_dispatch", label: "Logistics Dispatch" },
  { value: "data_sharing_consent", label: "Data Sharing Consent" },
];

export default function BlockchainAudit() {
  const [bpan, setBpan] = useState("");
  const [eventType, setEventType] = useState("bpan_registration");
  const [network, setNetwork] = useState("polygon-mumbai");
  const [anchorResult, setAnchorResult] = useState<any>(null);
  const [verifyHash, setVerifyHash] = useState("");
  const [verifyPayload, setVerifyPayload] = useState("");
  const [verifyResult, setVerifyResult] = useState<any>(null);

  const anchorMutation = trpc.blockchain.anchor.useMutation({
    onSuccess: (data) => {
      setAnchorResult(data);
      toast.success("Event anchored to blockchain", { description: `Block #${data.blockNumber} on ${data.network}` });
    },
    onError: (err) => toast.error("Anchoring failed", { description: err.message }),
  });

  const hashQuery = trpc.blockchain.hash.useQuery(
    { payload: bpan ? { bpan, eventType, timestamp: new Date().toISOString() } : {} },
    { enabled: false }
  );

  const handleAnchor = () => {
    if (!bpan.trim() || bpan.length !== 21) {
      toast.error("Invalid BPAN", { description: "BPAN must be exactly 21 characters" });
      return;
    }
    anchorMutation.mutate({
      bpan: bpan.trim(),
      eventType: eventType as any,
      payload: { bpan: bpan.trim(), eventType, anchoredAt: new Date().toISOString() },
      network: network as any,
    });
  };



  const utils = trpc.useUtils();

  const handleVerifyQuery = async () => {
    if (!verifyHash.trim() || !verifyPayload.trim()) {
      toast.error("Missing fields", { description: "Enter both the payload JSON and the stored hash" });
      return;
    }
    try {
      const parsed = JSON.parse(verifyPayload);
      const data = await utils.blockchain.verify.fetch({ payload: parsed, storedHash: verifyHash.trim() });
      setVerifyResult(data);
      if (data.valid) toast.success("Hash verified \u2713", { description: "Payload matches stored hash \u2014 data is tamper-free" });
      else toast.error("Hash mismatch \u2717", { description: "Payload does not match stored hash \u2014 possible tampering detected" });
    } catch (err: any) {
      toast.error("Verification failed", { description: err.message });
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-blue-500/10">
          <Shield className="w-6 h-6 text-blue-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Blockchain Audit Trail</h1>
          <p className="text-sm text-muted-foreground">SHA-256 content hashing anchored to Polygon L2 for tamper-evident records</p>
        </div>
        <Badge variant="outline" className="ml-auto border-blue-500/30 text-blue-400 bg-blue-500/10">v3.0</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Anchor Event */}
        <Card className="border-border/50 bg-card/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Link2 className="w-4 h-4 text-blue-400" />
              Anchor Event
            </CardTitle>
            <CardDescription>Hash and anchor a battery lifecycle event to the blockchain</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Battery BPAN</Label>
              <Input placeholder="21-character BPAN" value={bpan} onChange={(e) => setBpan(e.target.value)} className="font-mono" maxLength={21} />
            </div>
            <div className="space-y-2">
              <Label>Event Type</Label>
              <Select value={eventType} onValueChange={setEventType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EVENT_TYPES.map((e) => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Network</Label>
              <Select value={network} onValueChange={setNetwork}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="polygon-mumbai">Polygon Mumbai (Testnet)</SelectItem>
                  <SelectItem value="polygon-mainnet">Polygon Mainnet</SelectItem>
                  <SelectItem value="ethereum-mainnet">Ethereum Mainnet</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleAnchor} disabled={anchorMutation.isPending} className="w-full bg-blue-600 hover:bg-blue-700 text-foreground">
              <Shield className="w-4 h-4 mr-2" />
              {anchorMutation.isPending ? "Anchoring…" : "Anchor to Blockchain"}
            </Button>

            {anchorResult && (
              <div className="mt-4 space-y-3 p-4 bg-muted/30 rounded-lg border border-border/50">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm font-medium text-emerald-400">Anchored Successfully</span>
                </div>
                {[
                  { label: "Data Hash", value: anchorResult.dataHash },
                  { label: "Tx Hash", value: anchorResult.txHash },
                  { label: "Block", value: `#${anchorResult.blockNumber}` },
                  { label: "Network", value: anchorResult.network },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground w-20 flex-shrink-0">{item.label}</span>
                    <span className="text-xs font-mono text-foreground truncate flex-1">{item.value}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0" onClick={() => copyToClipboard(item.value, item.label)}>
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
                <a href={anchorResult.verificationUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-blue-400 hover:underline mt-1">
                  <ExternalLink className="w-3 h-3" />
                  View on block explorer
                </a>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Verify Hash */}
        <Card className="border-border/50 bg-card/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Hash className="w-4 h-4 text-violet-400" />
              Verify Integrity
            </CardTitle>
            <CardDescription>Verify that a payload matches its stored blockchain hash</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Stored Hash (hex)</Label>
              <Input placeholder="64-character SHA-256 hex" value={verifyHash} onChange={(e) => setVerifyHash(e.target.value)} className="font-mono text-xs" />
            </div>
            <div className="space-y-2">
              <Label>Payload (JSON)</Label>
              <textarea
                className="w-full h-28 p-3 text-xs font-mono bg-muted/30 border border-border/50 rounded-lg text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-violet-500"
                placeholder='{"bpan": "...", "eventType": "..."}'
                value={verifyPayload}
                onChange={(e) => setVerifyPayload(e.target.value)}
              />
            </div>
            <Button onClick={handleVerifyQuery} className="w-full bg-violet-600 hover:bg-violet-700 text-foreground">
              <Hash className="w-4 h-4 mr-2" />
              Verify Hash
            </Button>

            {verifyResult && (
              <div className={`mt-4 p-4 rounded-lg border ${verifyResult.valid ? "border-emerald-500/30 bg-emerald-500/10" : "border-red-500/30 bg-red-500/10"}`}>
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className={`w-4 h-4 ${verifyResult.valid ? "text-emerald-400" : "text-red-400"}`} />
                  <span className={`text-sm font-semibold ${verifyResult.valid ? "text-emerald-400" : "text-red-400"}`}>
                    {verifyResult.valid ? "Integrity Verified ✓" : "Integrity Check Failed ✗"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">Computed hash:</p>
                <p className="text-xs font-mono text-foreground break-all mt-1">{verifyResult.computedHash}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
