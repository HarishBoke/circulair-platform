import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Hash } from "lucide-react";

export default function BlockchainAudit() {
  const [storedHash, setStoredHash] = useState("");
  const [payloadText, setPayloadText] = useState("");
  const [result, setResult] = useState<{ valid: boolean; computedHash: string } | null>(null);
  const [pending, setPending] = useState(false);
  const utils = trpc.useUtils();

  async function compareHash() {
    setResult(null);
    if (!/^[a-fA-F0-9]{64}$/.test(storedHash.trim()) || new TextEncoder().encode(payloadText).length > 8192) {
      toast.error("Enter a 64-character hexadecimal hash and JSON of at most 8192 bytes.");
      return;
    }
    setPending(true);
    try {
      const payload = JSON.parse(payloadText);
      const data = await utils.blockchain.verify.fetch({ payload, storedHash: storedHash.trim() });
      setResult(data);
    } catch {
      toast.error("Hash comparison unavailable. Check the JSON and your authenticated access.");
    } finally { setPending(false); }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Content Hash Comparison</h1>
      <p className="text-sm text-muted-foreground">Blockchain anchoring is disabled. A SHA-256 match only compares the supplied content with the supplied hash; it does not prove authenticity, historical integrity, official issuance, or a blockchain transaction.</p>
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Hash className="h-4 w-4" /> Compare supplied content</CardTitle>
          <CardDescription>Keep sensitive customer or battery data out of ad-hoc examples. This tool requires your native authenticated session.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2"><Label htmlFor="content-hash">Supplied SHA-256 hash</Label><Input id="content-hash" value={storedHash} maxLength={64} onChange={e => setStoredHash(e.target.value)} className="font-mono" /></div>
          <div className="space-y-2"><Label htmlFor="content-payload">Supplied JSON payload — maximum 8192 bytes</Label><textarea id="content-payload" value={payloadText} maxLength={8192} onChange={e => setPayloadText(e.target.value)} className="w-full h-32 rounded border border-border bg-card p-3 font-mono text-xs" /></div>
          <Button disabled={pending} onClick={compareHash}>{pending ? "Comparing…" : "Compare Hash"}</Button>
          {result && <div className="space-y-2 rounded border border-border p-3" role="status"><p>{result.valid ? "Supplied content and hash match." : "Supplied content and hash do not match."}</p><p className="break-all font-mono text-xs">Computed hash: {result.computedHash}</p><p className="text-xs text-muted-foreground">No blockchain lookup or authenticity verification was performed.</p></div>}
        </CardContent>
      </Card>
    </div>
  );
}
