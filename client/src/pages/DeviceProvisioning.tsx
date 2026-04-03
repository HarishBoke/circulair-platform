import { useState } from "react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Plus, Cpu, Wifi, WifiOff, Copy, RefreshCw, Trash2, Edit,
  Key, Terminal, Radio, CircuitBoard, Eye
} from "lucide-react";

const STATUS_STYLES: Record<string, string> = {
  active: "bg-primary/10 text-primary border-primary/20",
  inactive: "bg-muted text-muted-foreground border-border",
  pending: "bg-chart-4/10 text-chart-4 border-chart-4/20",
  revoked: "bg-destructive/10 text-destructive border-destructive/20",
};

const TYPE_ICONS: Record<string, typeof Cpu> = {
  gateway: Radio, bms: CircuitBoard, sensor: Wifi, edge_node: Cpu,
};

function timeAgo(date: string | Date | null): string {
  if (!date) return "Never";
  const diff = Date.now() - new Date(date).getTime();
  if (diff < 60_000) return "Just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} min ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

function copyText(text: string, label: string) {
  navigator.clipboard.writeText(text);
  toast.success(`${label} copied`);
}

export default function DeviceProvisioning() {
  usePageTitle("Device Provisioning");

  const [showRegister, setShowRegister] = useState(false);
  const [showCredentials, setShowCredentials] = useState<{
    deviceId: string; mqttTopic: string; mqttUsername: string; mqttPassword: string;
  } | null>(null);
  const [showEdit, setShowEdit] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");

  const [regForm, setRegForm] = useState({
    name: "", deviceType: "gateway" as const,
    bpan: "", firmwareVersion: "", hardwareModel: "", location: "", notes: "",
  });
  const [editForm, setEditForm] = useState({
    name: "", bpan: "", status: "pending" as string,
    firmwareVersion: "", hardwareModel: "", location: "", notes: "",
  });

  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.device.list.useQuery(
    statusFilter !== "all" ? { status: statusFilter } : undefined
  );
  const stats = trpc.device.stats.useQuery();

  const registerMut = trpc.device.register.useMutation({
    onSuccess: (result) => {
      setShowRegister(false);
      setShowCredentials(result);
      setRegForm({ name: "", deviceType: "gateway", bpan: "", firmwareVersion: "", hardwareModel: "", location: "", notes: "" });
      utils.device.list.invalidate();
      utils.device.stats.invalidate();
      toast.success("Device registered");
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMut = trpc.device.update.useMutation({
    onSuccess: () => {
      setShowEdit(null);
      utils.device.list.invalidate();
      toast.success("Device updated");
    },
    onError: (e) => toast.error(e.message),
  });

  const regenMut = trpc.device.regenerateCredentials.useMutation({
    onSuccess: (result) => {
      setShowCredentials({ deviceId: "", ...result });
      toast.success("Credentials regenerated");
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMut = trpc.device.delete.useMutation({
    onSuccess: () => {
      utils.device.list.invalidate();
      utils.device.stats.invalidate();
      toast.success("Device deleted");
    },
    onError: (e) => toast.error(e.message),
  });

  const devices = data?.items ?? [];
  const s = stats.data;

  const handleRegister = () => {
    if (!regForm.name.trim()) { toast.error("Device name is required"); return; }
    registerMut.mutate({
      name: regForm.name.trim(),
      deviceType: regForm.deviceType,
      bpan: regForm.bpan.trim() || undefined,
      firmwareVersion: regForm.firmwareVersion.trim() || undefined,
      hardwareModel: regForm.hardwareModel.trim() || undefined,
      location: regForm.location.trim() || undefined,
      notes: regForm.notes.trim() || undefined,
    });
  };

  const openEdit = (device: typeof devices[0]) => {
    setEditForm({
      name: device.name, bpan: device.bpan ?? "", status: device.status,
      firmwareVersion: device.firmwareVersion ?? "", hardwareModel: device.hardwareModel ?? "",
      location: device.location ?? "", notes: device.notes ?? "",
    });
    setShowEdit(device.id);
  };

  const handleUpdate = () => {
    if (!showEdit) return;
    updateMut.mutate({
      id: showEdit, name: editForm.name.trim() || undefined,
      bpan: editForm.bpan.trim() || null, status: editForm.status as any,
      firmwareVersion: editForm.firmwareVersion.trim() || null,
      hardwareModel: editForm.hardwareModel.trim() || null,
      location: editForm.location.trim() || null,
      notes: editForm.notes.trim() || null,
    });
  };

  return (
    <div className="p-6 space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Device Provisioning</h1>
          <p className="text-muted-foreground text-sm mt-1">Register IoT gateways and BMS units to stream telemetry via MQTT</p>
        </div>
        <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => setShowRegister(true)}>
          <Plus className="w-4 h-4 mr-1.5" /> Register Device
        </Button>
      </div>

      {/* Stats */}
      {s && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total", value: s.total, color: "text-foreground" },
            { label: "Active", value: s.active, color: "text-primary" },
            { label: "Pending", value: s.pending, color: "text-chart-4" },
            { label: "Offline", value: s.inactive + s.revoked, color: "text-muted-foreground" },
          ].map((c) => (
            <div key={c.label} className="bg-card border border-border rounded-xl p-4">
              <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">{c.label}</div>
              <div className={`font-display text-2xl font-bold mt-1 ${c.color}`}>{c.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 bg-card border-border h-9 text-sm"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent className="bg-card border-border">
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="revoked">Revoked</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={() => { utils.device.list.invalidate(); utils.device.stats.invalidate(); }} className="border-border">
          <RefreshCw className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                {["Device", "Type", "BPAN", "Status", "Last Seen", "Location", ""].map((h) => (
                  <th key={h} className="text-left px-4 py-3 font-mono text-[10px] text-muted-foreground uppercase tracking-widest whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/50">
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-secondary/50 rounded animate-pulse w-20" /></td>
                    ))}
                  </tr>
                ))
              ) : devices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center">
                    <Cpu className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-muted-foreground text-sm">No devices registered yet.</p>
                    <Button size="sm" className="mt-4 bg-primary text-primary-foreground" onClick={() => setShowRegister(true)}>Register First Device</Button>
                  </td>
                </tr>
              ) : devices.map((d) => {
                const Icon = TYPE_ICONS[d.deviceType] ?? Cpu;
                return (
                  <tr key={d.id} className="border-b border-border/50 hover:bg-secondary/20 transition-colors group">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4 text-muted-foreground/60 flex-shrink-0" />
                        <div>
                          <div className="font-medium text-sm">{d.name}</div>
                          <div className="font-mono text-[10px] text-muted-foreground">{d.deviceId}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3"><span className="font-mono text-xs capitalize">{d.deviceType.replace("_", " ")}</span></td>
                    <td className="px-4 py-3">
                      {d.bpan ? <span className="font-mono text-xs text-primary">{d.bpan}</span> : <span className="text-muted-foreground/50 text-xs">Unassociated</span>}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={`font-mono text-[9px] capitalize ${STATUS_STYLES[d.status] ?? ""}`}>
                        {d.status === "active" ? <Wifi className="w-2.5 h-2.5 mr-1" /> : <WifiOff className="w-2.5 h-2.5 mr-1" />}
                        {d.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`font-mono text-xs ${d.lastSeen ? "text-foreground" : "text-muted-foreground/50"}`}>{timeAgo(d.lastSeen)}</span>
                    </td>
                    <td className="px-4 py-3"><span className="text-xs text-muted-foreground truncate max-w-32 block">{d.location || "\u2014"}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Edit" onClick={() => openEdit(d)}><Edit className="w-3.5 h-3.5" /></Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="View credentials" onClick={() => setShowCredentials({ deviceId: d.deviceId, mqttTopic: d.mqttTopic, mqttUsername: d.mqttUsername, mqttPassword: d.mqttPassword })}><Eye className="w-3.5 h-3.5" /></Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Regenerate credentials" onClick={() => regenMut.mutate({ id: d.id })}><Key className="w-3.5 h-3.5" /></Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" title="Delete" onClick={() => { if (confirm("Delete this device?")) deleteMut.mutate({ id: d.id }); }}><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Integration Guide */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="font-display text-sm font-bold mb-3 flex items-center gap-2">
          <Terminal className="w-4 h-4 text-primary" /> Integration Guide
        </h3>
        <p className="text-muted-foreground text-xs mb-4">After registering a device, use the MQTT credentials to publish telemetry readings.</p>
        <div className="bg-secondary/30 rounded-lg p-4 font-mono text-xs space-y-1">
          <div className="text-muted-foreground"># Publish a telemetry reading</div>
          <div className="text-foreground break-all">
            mosquitto_pub -h broker.circulair.energy -p 1883 \<br />
            &nbsp;&nbsp;-u &lt;mqttUsername&gt; -P &lt;mqttPassword&gt; \<br />
            &nbsp;&nbsp;-t &lt;mqttTopic&gt; \<br />
            &nbsp;&nbsp;-m '{`{"bpan":"<BPAN>","vPack":52.1,"iPack":-12.5,"tPack":28.3,"tMax":31.2,"sohEstimate":94.5,"cycleCount":142}`}'
          </div>
        </div>
        <div className="mt-3 text-xs text-muted-foreground">
          <strong className="text-foreground">Required:</strong> bpan &nbsp;|&nbsp; <strong className="text-foreground">Optional:</strong> vPack, iPack, vMin, vMax, tPack, tMax, cycleCount, irPack, sohEstimate, dtcCodes
        </div>
      </div>

      {/* Register Dialog */}
      <Dialog open={showRegister} onOpenChange={setShowRegister}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">Register New Device</DialogTitle>
            <DialogDescription>Add an IoT gateway or BMS to start streaming telemetry.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-1.5 block">Device Name *</Label>
              <Input value={regForm.name} onChange={(e) => setRegForm({ ...regForm, name: e.target.value })} placeholder="e.g., Factory Floor Gateway #1" className="bg-secondary/30 border-border h-9 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-1.5 block">Device Type</Label>
                <Select value={regForm.deviceType} onValueChange={(v: any) => setRegForm({ ...regForm, deviceType: v })}>
                  <SelectTrigger className="bg-secondary/30 border-border h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="gateway">Gateway</SelectItem>
                    <SelectItem value="bms">BMS</SelectItem>
                    <SelectItem value="sensor">Sensor</SelectItem>
                    <SelectItem value="edge_node">Edge Node</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-1.5 block">Associate BPAN</Label>
                <Input value={regForm.bpan} onChange={(e) => setRegForm({ ...regForm, bpan: e.target.value })} placeholder="Optional" className="bg-secondary/30 border-border h-9 text-sm font-mono" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-1.5 block">Hardware Model</Label>
                <Input value={regForm.hardwareModel} onChange={(e) => setRegForm({ ...regForm, hardwareModel: e.target.value })} placeholder="e.g., ESP32-S3" className="bg-secondary/30 border-border h-9 text-sm" />
              </div>
              <div>
                <Label className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-1.5 block">Firmware Version</Label>
                <Input value={regForm.firmwareVersion} onChange={(e) => setRegForm({ ...regForm, firmwareVersion: e.target.value })} placeholder="e.g., v1.2.0" className="bg-secondary/30 border-border h-9 text-sm" />
              </div>
            </div>
            <div>
              <Label className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-1.5 block">Location</Label>
              <Input value={regForm.location} onChange={(e) => setRegForm({ ...regForm, location: e.target.value })} placeholder="e.g., Pune, Maharashtra" className="bg-secondary/30 border-border h-9 text-sm" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRegister(false)} className="border-border">Cancel</Button>
            <Button onClick={handleRegister} disabled={registerMut.isPending} className="bg-primary text-primary-foreground hover:bg-primary/90">
              {registerMut.isPending ? "Registering..." : "Register Device"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Credentials Dialog */}
      <Dialog open={!!showCredentials} onOpenChange={() => setShowCredentials(null)}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">MQTT Credentials</DialogTitle>
            <DialogDescription>Store the password securely. It cannot be retrieved after this dialog is closed.</DialogDescription>
          </DialogHeader>
          {showCredentials && (
            <div className="space-y-3 py-2">
              {[
                { label: "Broker", value: "mqtt://broker.circulair.energy:1883" },
                { label: "Topic", value: showCredentials.mqttTopic },
                { label: "Username", value: showCredentials.mqttUsername },
                { label: "Password", value: showCredentials.mqttPassword },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between bg-secondary/30 rounded-lg p-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-mono text-[9px] text-muted-foreground uppercase tracking-widest">{item.label}</div>
                    <div className="font-mono text-sm text-foreground mt-0.5 break-all">{item.value}</div>
                  </div>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 flex-shrink-0 ml-2" onClick={() => copyText(item.value, item.label)}>
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCredentials(null)} className="border-border">Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!showEdit} onOpenChange={() => setShowEdit(null)}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">Edit Device</DialogTitle>
            <DialogDescription>Update device details and BPAN association.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-1.5 block">Device Name</Label>
              <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="bg-secondary/30 border-border h-9 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-1.5 block">Status</Label>
                <Select value={editForm.status} onValueChange={(v) => setEditForm({ ...editForm, status: v })}>
                  <SelectTrigger className="bg-secondary/30 border-border h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="revoked">Revoked</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-1.5 block">Associate BPAN</Label>
                <Input value={editForm.bpan} onChange={(e) => setEditForm({ ...editForm, bpan: e.target.value })} placeholder="Leave empty to unassociate" className="bg-secondary/30 border-border h-9 text-sm font-mono" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-1.5 block">Hardware Model</Label>
                <Input value={editForm.hardwareModel} onChange={(e) => setEditForm({ ...editForm, hardwareModel: e.target.value })} className="bg-secondary/30 border-border h-9 text-sm" />
              </div>
              <div>
                <Label className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-1.5 block">Firmware Version</Label>
                <Input value={editForm.firmwareVersion} onChange={(e) => setEditForm({ ...editForm, firmwareVersion: e.target.value })} className="bg-secondary/30 border-border h-9 text-sm" />
              </div>
            </div>
            <div>
              <Label className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-1.5 block">Location</Label>
              <Input value={editForm.location} onChange={(e) => setEditForm({ ...editForm, location: e.target.value })} className="bg-secondary/30 border-border h-9 text-sm" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEdit(null)} className="border-border">Cancel</Button>
            <Button onClick={handleUpdate} disabled={updateMut.isPending} className="bg-primary text-primary-foreground hover:bg-primary/90">
              {updateMut.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
