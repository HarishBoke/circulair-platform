import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { RefreshCw, WifiOff } from "lucide-react";

/** Legacy broker status is not proof of authenticated physical acquisition or persistence. */
export default function MqttBrokerPanel() {
  const { user, loading } = useAuth();
  const admin = user?.role === "admin";
  const { data: status, isLoading, error, refetch } = trpc.mqtt.status.useQuery(undefined, {
    enabled: admin,
    refetchInterval: admin ? 15000 : false,
  });

  return (
    <Card className="border-border bg-muted/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <WifiOff className="w-5 h-5" /> Legacy MQTT status — read only
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p>Legacy MQTT ingestion and publishing are disabled. Public brokers and shared wildcard topics are not an authenticated physical-battery interface.</p>
        {loading ? <p>Checking access…</p> : !admin ? (
          <p>Administrator access is required to inspect broker process status.</p>
        ) : isLoading ? <p>Loading process status…</p> : error ? (
          <p role="alert">Broker process status is unavailable. No connection or reading acceptance is confirmed.</p>
        ) : (
          <p>Process connected: {status?.connected ? "yes" : "no"}. This does not confirm device identity, stored readings, or a working hardware connection.</p>
        )}
        {admin && <Button variant="outline" size="sm" onClick={() => refetch()}><RefreshCw className="mr-2 h-4 w-4" /> Refresh status</Button>}
        <p>Use the separately gated, owner-bound local pilot for approved read-only file capture and persisted ingestion receipts. It does not provide a hardware capture adapter.</p>
        <Link href="/local-battery-pilot" className="text-primary underline">Open local battery pilot</Link>
      </CardContent>
    </Card>
  );
}
