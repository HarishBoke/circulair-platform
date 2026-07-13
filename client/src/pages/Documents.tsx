import { useState } from "react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { FileText, Upload, Search, RefreshCw, Download, Lock, Globe, Building2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const DOC_TYPE_LABELS: Record<string, string> = {
  battery_certificate: "Battery Certificate",
  health_passport: "Health Passport",
  compliance_report: "Compliance Report",
  recycling_manifest: "Recycling Manifest",
  hazmat_manifest: "Hazmat Manifest",
  audit_trail: "Audit Trail",
  cpcb_form: "CPCB Form",
  pli_passport: "PLI Passport",
  material_composition: "Material Composition",
  other: "Other",
};

const ACCESS_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  public: Globe,
  organization: Building2,
  private: Lock,
  government: Lock,
};

export default function Documents() {
  usePageTitle("Documents");

  const [search, setSearch] = useState("");
  const [docType, setDocType] = useState("all");
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    name: "",
    type: "battery_certificate" as string,
    bpan: "",
    fileUrl: "",
    accessLevel: "organization" as string,
  });

  const { data, isLoading, refetch } = trpc.documents.listAll.useQuery({
    type: docType !== "all" ? docType : undefined,
    limit: 50,
  });

  const uploadMutation = trpc.documents.upload.useMutation({
    onSuccess: () => { toast.success("Document uploaded successfully!"); setShowUploadDialog(false); refetch(); },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  const docs = data ?? [];
  const filtered = docs.filter((d) =>
    !search || d.name.toLowerCase().includes(search.toLowerCase()) || (d.bpan ?? "").includes(search)
  );

  return (
    <div className="p-6 space-y-5 animate-fade-up">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Document Vault</h1>
          <p className="text-muted-foreground text-sm mt-1">Certificates · Health passports · Compliance reports · Recycling manifests · Audit trails</p>
        </div>
        <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Upload className="w-3.5 h-3.5 mr-1.5" /> Upload Document
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border max-w-md">
            <DialogHeader>
              <DialogTitle className="font-display">Upload Document</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div>
                <Label className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-1.5 block">Document Name</Label>
                <Input
                  value={uploadForm.name}
                  onChange={(e) => setUploadForm({ ...uploadForm, name: e.target.value })}
                  className="bg-secondary/30 border-border text-sm h-9"
                  placeholder="e.g., Battery Health Passport - BPAN-001"
                />
              </div>
              <div>
                <Label className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-1.5 block">Document Type</Label>
                <Select value={uploadForm.type} onValueChange={(v) => setUploadForm({ ...uploadForm, type: v })}>
                  <SelectTrigger className="bg-secondary/30 border-border h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    {Object.entries(DOC_TYPE_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-1.5 block">BPAN (Optional)</Label>
                <Input
                  value={uploadForm.bpan}
                  onChange={(e) => setUploadForm({ ...uploadForm, bpan: e.target.value.toUpperCase() })}
                  className="bg-secondary/30 border-border font-mono text-sm h-9"
                  placeholder="19-character BPAN"
                  maxLength={19}
                />
              </div>
              <div>
                <Label className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-1.5 block">File URL (S3 / CDN)</Label>
                <Input
                  value={uploadForm.fileUrl}
                  onChange={(e) => setUploadForm({ ...uploadForm, fileUrl: e.target.value })}
                  className="bg-secondary/30 border-border text-sm h-9"
                  placeholder="https://cdn.example.com/doc.pdf"
                />
              </div>
              <div>
                <Label className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-1.5 block">Access Level</Label>
                <Select value={uploadForm.accessLevel} onValueChange={(v) => setUploadForm({ ...uploadForm, accessLevel: v })}>
                  <SelectTrigger className="bg-secondary/30 border-border h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="organization">Organization</SelectItem>
                    <SelectItem value="private">Private</SelectItem>
                    <SelectItem value="government">Government</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                disabled={uploadMutation.isPending}
                onClick={() => uploadMutation.mutate({
                  name: uploadForm.name,
                  type: uploadForm.type as "battery_certificate" | "health_passport" | "compliance_report" | "recycling_manifest" | "hazmat_manifest" | "audit_trail" | "cpcb_form" | "pli_passport" | "material_composition" | "other",
                  bpan: uploadForm.bpan || undefined,
                  fileUrl: uploadForm.fileUrl,
                  accessLevel: uploadForm.accessLevel as "public" | "organization" | "private" | "government",
                })}
              >
                {uploadMutation.isPending ? "Uploading..." : "Upload Document"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {Object.entries(DOC_TYPE_LABELS).slice(0, 5).map(([type, label]) => {
          const count = docs.filter((d) => d.type === type).length;
          return (
            <div key={type} className="bg-card border border-border rounded-xl p-3">
              <div className="font-mono text-[9px] text-muted-foreground mb-1">{label}</div>
              <div className="font-display text-xl font-bold">{count}</div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Search by name or BPAN..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card border-border font-mono text-sm h-9"
          />
        </div>
        <Select value={docType} onValueChange={setDocType}>
          <SelectTrigger className="w-48 bg-card border-border h-9 text-sm"><SelectValue placeholder="Document Type" /></SelectTrigger>
          <SelectContent className="bg-card border-border">
            <SelectItem value="all">All Types</SelectItem>
            {Object.entries(DOC_TYPE_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="border-border h-9">
          <RefreshCw className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Document Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-5 animate-pulse h-36" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-16 text-center">
          <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="font-display text-lg font-bold mb-2">No Documents Found</h3>
          <p className="text-muted-foreground text-sm">Upload battery certificates, health passports, and compliance documents.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((doc) => {
            const AccessIcon = ACCESS_ICONS[doc.accessLevel] ?? Lock;
            return (
              <div key={doc.id} className="bg-card border border-border rounded-xl p-5 hover:border-primary/30 transition-all hover:-translate-y-0.5 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                      <FileText className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <div className="font-display text-sm font-bold line-clamp-1">{doc.name}</div>
                      <div className="font-mono text-[9px] text-muted-foreground mt-0.5">
                        {DOC_TYPE_LABELS[doc.type] ?? doc.type}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <AccessIcon className="w-3 h-3 text-muted-foreground" />
                  </div>
                </div>

                {doc.bpan && (
                  <div className="font-mono text-[10px] text-primary mb-2">BPAN: {doc.bpan}</div>
                )}

                <div className="flex items-center justify-between mt-3">
                  <Badge variant="outline" className="font-mono text-[9px] border-border capitalize">
                    {doc.accessLevel}
                  </Badge>
                  <div className="flex gap-2">
                    <span className="font-mono text-[9px] text-muted-foreground">
                      {new Date(doc.createdAt).toLocaleDateString()}
                    </span>
                    {doc.fileUrl && (
                      <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                        <Button size="sm" variant="outline" className="h-6 w-6 p-0 border-border">
                          <Download className="w-3 h-3" />
                        </Button>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
