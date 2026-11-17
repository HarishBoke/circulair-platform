import { useState } from "react";
import { usePageTitle } from "@/hooks/usePageTitle";
import PlatformLayout from "@/components/PlatformLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MqttBrokerPanel from "@/components/MqttBrokerPanel";

export default function DataIntegration() {
  usePageTitle("Data Integration");
  const [csvPreview, setCsvPreview] = useState("");
  const previewLines = csvPreview.split(/\r?\n/).filter(line => line.trim()).length;
  return (
    <PlatformLayout>
      <div className="p-6 space-y-6 max-w-6xl mx-auto">
        <header>
          <h1 className="text-2xl font-bold">Data Integration Review</h1>
          <p className="text-muted-foreground mt-1">Brand-agnostic source interfaces and development boundaries, not a live commissioning or data-import receipt.</p>
        </header>
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="pt-4 pb-4 space-y-2 text-sm">
            <p><strong>Data provenance unknown unless evidenced.</strong> This page does not determine whether stored records are synthetic, imported or physically measured. No seed counts, model accuracy, latency or uptime are asserted. Preserve production customer data; do not re-seed or replace it to run a pilot.</p>
            <p>Legacy hardware ingestion is blocked with HTTP 503. Device ownership, topic/payload binding, units, timestamps, revocation and isolated measured provenance need separate acceptance. Missing metrics remain unknown; explicit zero is retained. No guessed pins/register maps, battery control or public broker production use is approved.</p>
            <p>The new local pilot is in development and not deployed; no new route is advertised as ready. No physical measurements were run here. Numerical SOH/RUL and triage heuristics are uncalibrated, not approved safety, second-life or recycling decisions.</p>
          </CardContent>
        </Card>
        <Tabs defaultValue="mqtt">
          <TabsList className="h-auto flex-wrap">
            <TabsTrigger value="mqtt">MQTT / IoT</TabsTrigger>
            <TabsTrigger value="rest">API Contracts</TabsTrigger>
            <TabsTrigger value="csv">CSV Review</TabsTrigger>
            <TabsTrigger value="webhook">Webhooks</TabsTrigger>
            <TabsTrigger value="sdk">SDK / Mobile</TabsTrigger>
            <TabsTrigger value="database">Data Access</TabsTrigger>
          </TabsList>
          <TabsContent value="mqtt" className="space-y-4 mt-4">
            <Card><CardHeader><CardTitle>Broker Configuration and Observed Status</CardTitle><Badge variant="outline" className="w-fit">Physical acceptance unverified</Badge></CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm">The existing panel displays its own configuration and query results. A connected state is not evidence of correct pack decoding, authorized storage, durable delivery or a working physical integration. Errors must remain visible; do not substitute a healthy state.</p>
                <MqttBrokerPanel />
                <p className="text-sm text-muted-foreground">Historical gateway sources are described in the Gateway Integration Review. Any later connection requires an operator-approved read-only protocol, calibrated isolated instruments, manufacturer documentation and independent emergency isolation. Do not start a publisher, scan registers or install a background service from a generic example.</p>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="rest" className="mt-4">
            <Card><CardHeader><CardTitle>Enabled API Contract Review</CardTitle></CardHeader><CardContent className="space-y-3 text-sm">
              <p>REST, tRPC and device routes have different authentication and authorization contracts. Confirm the exact enabled endpoint, identity, scope, ownership and payload with the current source owner. A displayed example is not proof that a request succeeds.</p>
              <p>Do not assume a tRPC session endpoint accepts an API Bearer key, or that an MQTT credential is a REST device token. Legacy hardware paths are unavailable with HTTP 503. Payments and private document publishing are disabled; execution and training are gated unavailable. No new pilot endpoint is claimed ready.</p>
              <p>Strict measured device records distinguish device ID, battery identity, recorded timestamp and measured source. Unsupported aliases, SOC and inferred health must not be silently persisted as physical measurements. Keep synthetic fixtures separate from measured data.</p>
            </CardContent></Card>
          </TabsContent>
          <TabsContent value="csv" className="mt-4">
            <Card><CardHeader><CardTitle>Local CSV Text Preview</CardTitle><Badge variant="outline" className="w-fit">Local text only</Badge></CardHeader><CardContent className="space-y-3">
              <p className="text-sm">This preview does not parse CSV, validate values, authorize ownership, upload files or persist data. Line counting does not handle quoted multiline CSV fields and is not an accepted-row count. Use approved offline fixtures first; actual import requires the separately authorized application workflow.</p>
              <Label htmlFor="csv-preview">Paste non-sensitive fixture text</Label>
              <Textarea id="csv-preview" value={csvPreview} onChange={event => setCsvPreview(event.target.value)} placeholder="Local fixture text only…" className="font-mono text-xs h-32" />
              {csvPreview && <p className="text-sm">{previewLines} non-empty text lines; nothing uploaded or saved.</p>}
            </CardContent></Card>
          </TabsContent>
          <TabsContent value="webhook" className="mt-4">
            <Card><CardHeader><CardTitle>Webhook Acceptance Pending</CardTitle></CardHeader><CardContent className="space-y-3 text-sm">
              <p>Subscription records or example payloads are not proof of notification delivery. Outbound acceptance, destination ownership, secret handling, signature verification, replay/idempotency and retry behavior require separate evidence. This page sends no webhook or test notification.</p>
              <p>Event labels are records for review, not completed carrier dispatch, verified material recovery, government submission or blockchain anchoring. Do not connect event handling to battery control or automatic safety/disposition decisions.</p>
            </CardContent></Card>
          </TabsContent>
          <TabsContent value="sdk" className="mt-4">
            <Card><CardHeader><CardTitle>Mobile SDK</CardTitle><Badge variant="outline" className="w-fit">Planned; unavailable</Badge></CardHeader><CardContent className="text-sm">
              No released mobile package, installation, offline synchronization or field acceptance is established. Developer download artifacts have separate verification gates; a catalogue entry is not an installable SDK. No package-install command is provided.
            </CardContent></Card>
          </TabsContent>
          <TabsContent value="database" className="mt-4">
            <Card><CardHeader><CardTitle>Application-Scoped Data Access</CardTitle></CardHeader><CardContent className="space-y-3 text-sm">
              <p>Direct database writes bypass application validation, ownership and audit boundaries and are not an end-user integration workflow. No database credentials, seed commands, migration instructions or direct-write examples are supplied here.</p>
              <p>Use separately authorized owner-scoped application interfaces. Bulk import, reporting and restoration require review and isolated acceptance; an internal status value such as verified is not independent physical or regulatory certification.</p>
            </CardContent></Card>
          </TabsContent>
        </Tabs>
        <Card><CardHeader><CardTitle>Conceptual Data Flow — Not Execution Evidence</CardTitle></CardHeader><CardContent className="text-sm space-y-2">
          <p>Approved source → authorized ingestion contract → stored source-labeled records → human review and bounded estimates.</p>
          <p>Each arrow requires independent acceptance. Storage and query results do not prove hardware operation, model calibration, safety approval, regulatory acceptance, payments, carrier booking or provider delivery.</p>
        </CardContent></Card>
      </div>
    </PlatformLayout>
  );
}
