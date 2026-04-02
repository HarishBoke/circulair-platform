import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Shield, ShieldCheck, ShieldX, Search, Phone, Mail, MessageCircle,
  Battery, Hash, Calendar, Clock, AlertTriangle, CheckCircle2, ArrowLeft,
  User, Store, FileText, ChevronDown, ChevronUp,
} from "lucide-react";

const STATUS_CONFIG: Record<string, { color: string; icon: any; label: string; bg: string }> = {
  active: { color: "text-emerald-400", icon: ShieldCheck, label: "Active — In Warranty", bg: "bg-emerald-500/10 border-emerald-500/30" },
  expired: { color: "text-red-400", icon: ShieldX, label: "Expired", bg: "bg-red-500/10 border-red-500/30" },
  voided: { color: "text-orange-400", icon: AlertTriangle, label: "Voided", bg: "bg-orange-500/10 border-orange-500/30" },
  claimed: { color: "text-blue-400", icon: Shield, label: "Claimed", bg: "bg-blue-500/10 border-blue-500/30" },
  suspended: { color: "text-yellow-400", icon: AlertTriangle, label: "Suspended", bg: "bg-yellow-500/10 border-yellow-500/30" },
  pending_activation: { color: "text-gray-400", icon: Clock, label: "Pending Activation", bg: "bg-gray-500/10 border-gray-500/30" },
};

type SearchMode = "bpan" | "serial" | "phone" | "email" | "whatsapp";

export default function WarrantyCheck() {
  const [searchMode, setSearchMode] = useState<SearchMode>("bpan");
  const [searchValue, setSearchValue] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const searchInput = useMemo(() => {
    if (!searchValue.trim()) return null;
    const params: Record<string, string> = {};
    if (searchMode === "bpan") params.bpan = searchValue.trim();
    else if (searchMode === "serial") params.serialNumber = searchValue.trim();
    else if (searchMode === "phone") params.phone = searchValue.trim();
    else if (searchMode === "email") params.email = searchValue.trim();
    else if (searchMode === "whatsapp") params.whatsApp = searchValue.trim();
    return params;
  }, [searchMode, searchValue]);

  const lookupQuery = trpc.warranty.lookup.useQuery(
    searchInput ?? { bpan: "__none__" },
    { enabled: hasSearched && !!searchInput }
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchValue.trim()) {
      toast.error("Please enter a search value");
      return;
    }
    setHasSearched(true);
  };

  const modes: { key: SearchMode; label: string; icon: any; placeholder: string }[] = [
    { key: "bpan", label: "BPAN", icon: Battery, placeholder: "Enter 21-character BPAN" },
    { key: "serial", label: "Serial No.", icon: Hash, placeholder: "Manufacturer serial number" },
    { key: "phone", label: "Phone", icon: Phone, placeholder: "+91 98765 43210" },
    { key: "email", label: "Email", icon: Mail, placeholder: "customer@email.com" },
    { key: "whatsapp", label: "WhatsApp", icon: MessageCircle, placeholder: "+91 98765 43210" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/50">
        <div className="max-w-3xl mx-auto px-6 py-6">
          <div className="flex items-center gap-3 mb-2">
            <Link href="/">
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0"><ArrowLeft className="w-4 h-4" /></Button>
            </Link>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
              <Shield className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold">Check Warranty Status</h1>
              <p className="text-muted-foreground text-xs">Verify your battery warranty via BPAN, serial number, phone, email, or WhatsApp</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* Search Mode Tabs */}
        <div className="flex flex-wrap gap-2 mb-4">
          {modes.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => { setSearchMode(key); setHasSearched(false); setSearchValue(""); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border
                ${searchMode === key
                  ? "bg-primary/10 border-primary/30 text-primary"
                  : "bg-secondary/30 border-border text-muted-foreground hover:text-foreground"
                }`}
            >
              <Icon className="w-3 h-3" /> {label}
            </button>
          ))}
        </div>

        {/* Search Form */}
        <form onSubmit={handleSearch} className="flex gap-3 mb-8">
          <div className="flex-1">
            <Input
              value={searchValue}
              onChange={(e) => { setSearchValue(e.target.value); setHasSearched(false); }}
              className="bg-card border-border h-11 text-sm"
              placeholder={modes.find(m => m.key === searchMode)?.placeholder}
              maxLength={searchMode === "bpan" ? 21 : 320}
            />
          </div>
          <Button type="submit" className="bg-primary text-primary-foreground h-11 px-6" disabled={lookupQuery.isFetching}>
            <Search className="w-4 h-4 mr-2" /> Check
          </Button>
        </form>

        {/* Results */}
        {lookupQuery.isFetching && (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Searching warranty records...</p>
          </div>
        )}

        {hasSearched && !lookupQuery.isFetching && lookupQuery.data?.length === 0 && (
          <div className="text-center py-12 bg-card border border-border rounded-xl">
            <ShieldX className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="font-display text-lg font-bold mb-2">No Warranty Found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              No warranty records match your search. The battery may not have a registered warranty.
            </p>
            <div className="flex gap-3 justify-center">
              <Link href="/warranty/register">
                <Button size="sm" className="bg-primary text-primary-foreground text-xs">Register Warranty</Button>
              </Link>
              <Button size="sm" variant="outline" className="text-xs" onClick={() => { setHasSearched(false); setSearchValue(""); }}>
                Try Again
              </Button>
            </div>
          </div>
        )}

        {hasSearched && lookupQuery.data && lookupQuery.data.length > 0 && (
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Found {lookupQuery.data.length} warranty record{lookupQuery.data.length > 1 ? "s" : ""}
            </p>
            {lookupQuery.data.map((warranty: any) => {
              const config = STATUS_CONFIG[warranty.effectiveStatus] ?? STATUS_CONFIG.expired;
              const StatusIcon = config.icon;
              const isExpanded = expandedId === warranty.id;

              return (
                <div key={warranty.id} className={`border rounded-xl overflow-hidden transition-all ${config.bg}`}>
                  {/* Main Card */}
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${config.bg}`}>
                          <StatusIcon className={`w-6 h-6 ${config.color}`} />
                        </div>
                        <div>
                          <h3 className={`font-display font-bold ${config.color}`}>{config.label}</h3>
                          <p className="font-mono text-xs text-muted-foreground mt-0.5">{warranty.bpan}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">Warranty #{warranty.id}</div>
                        <div className="text-xs font-medium capitalize mt-0.5">{warranty.warrantyType} · {warranty.coverageType.replace(/_/g, " ")}</div>
                      </div>
                    </div>

                    {/* Key Metrics */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                      <div className="bg-background/50 rounded-lg p-3">
                        <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Days Remaining</div>
                        <div className={`text-lg font-bold ${warranty.daysRemaining > 90 ? "text-emerald-400" : warranty.daysRemaining > 30 ? "text-amber-400" : "text-red-400"}`}>
                          {warranty.daysRemaining}
                        </div>
                      </div>
                      <div className="bg-background/50 rounded-lg p-3">
                        <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Term</div>
                        <div className="text-lg font-bold">{warranty.warrantyTermMonths}mo</div>
                      </div>
                      <div className="bg-background/50 rounded-lg p-3">
                        <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Claims</div>
                        <div className="text-lg font-bold">{warranty.totalClaims ?? 0}</div>
                      </div>
                      <div className="bg-background/50 rounded-lg p-3">
                        <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Purchase</div>
                        <div className="text-sm font-bold">
                          {warranty.purchaseDate ? new Date(warranty.purchaseDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                        </div>
                      </div>
                    </div>

                    {/* Timeline */}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      <span>
                        {warranty.warrantyStartDate ? new Date(warranty.warrantyStartDate).toLocaleDateString("en-IN") : "—"}
                      </span>
                      <span className="flex-1 border-t border-dashed border-border" />
                      <span className={warranty.isInWarranty ? "text-emerald-400 font-medium" : "text-red-400 font-medium"}>
                        {warranty.warrantyEndDate ? new Date(warranty.warrantyEndDate).toLocaleDateString("en-IN") : "—"}
                      </span>
                    </div>

                    {/* Expand/Collapse */}
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : warranty.id)}
                      className="flex items-center gap-1 mt-3 text-xs text-primary hover:underline"
                    >
                      {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      {isExpanded ? "Hide Details" : "Show Full Details"}
                    </button>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="border-t border-border/50 p-5 bg-background/30 space-y-4 animate-fade-up">
                      {/* Customer */}
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1">
                          <User className="w-3 h-3" /> Customer
                        </h4>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <span className="text-muted-foreground">Name</span>
                          <span>{warranty.customerName}</span>
                          {warranty.customerPhone && <>
                            <span className="text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" /> Phone</span>
                            <span>{warranty.customerPhone}</span>
                          </>}
                          {warranty.customerWhatsApp && <>
                            <span className="text-muted-foreground flex items-center gap-1"><MessageCircle className="w-3 h-3" /> WhatsApp</span>
                            <span>{warranty.customerWhatsApp}</span>
                          </>}
                          {warranty.customerEmail && <>
                            <span className="text-muted-foreground flex items-center gap-1"><Mail className="w-3 h-3" /> Email</span>
                            <span>{warranty.customerEmail}</span>
                          </>}
                        </div>
                      </div>

                      {/* Dealer */}
                      {(warranty.dealerName || warranty.dealerCode) && (
                        <div>
                          <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1">
                            <Store className="w-3 h-3" /> Dealer
                          </h4>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            {warranty.dealerName && <>
                              <span className="text-muted-foreground">Name</span>
                              <span>{warranty.dealerName}</span>
                            </>}
                            {warranty.dealerCode && <>
                              <span className="text-muted-foreground">Code</span>
                              <span className="font-mono">{warranty.dealerCode}</span>
                            </>}
                          </div>
                        </div>
                      )}

                      {/* Purchase */}
                      {(warranty.invoiceNumber || warranty.purchaseAmount) && (
                        <div>
                          <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1">
                            <FileText className="w-3 h-3" /> Purchase
                          </h4>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            {warranty.invoiceNumber && <>
                              <span className="text-muted-foreground">Invoice</span>
                              <span className="font-mono">{warranty.invoiceNumber}</span>
                            </>}
                            {warranty.purchaseAmount && <>
                              <span className="text-muted-foreground">Amount</span>
                              <span>{warranty.purchaseCurrency} {warranty.purchaseAmount}</span>
                            </>}
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-3 pt-2">
                        <Link href={`/batteries/${warranty.bpan}`}>
                          <Button size="sm" variant="outline" className="text-xs">
                            <Battery className="w-3 h-3 mr-1" /> View Battery
                          </Button>
                        </Link>
                        {warranty.isInWarranty && (
                          <Link href={`/warranty/claim/${warranty.id}`}>
                            <Button size="sm" className="bg-primary text-primary-foreground text-xs">
                              <Shield className="w-3 h-3 mr-1" /> File Claim
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Info Section */}
        {!hasSearched && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
            {[
              { icon: Phone, title: "Phone Lookup", desc: "Search by the phone number registered at purchase. Battery providers can verify warranty status during customer calls." },
              { icon: MessageCircle, title: "WhatsApp Lookup", desc: "Customers can share their WhatsApp number for instant warranty verification — no app download needed." },
              { icon: Mail, title: "Email Lookup", desc: "Search by registered email address. Ideal for corporate fleet battery warranty management." },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-card border border-border rounded-xl p-4">
                <Icon className="w-5 h-5 text-primary mb-2" />
                <h3 className="text-sm font-bold mb-1">{title}</h3>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
