import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ShoppingCart, Plus, Search, Zap, RefreshCw, TrendingUp, DollarSign } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { usePlatformSettings } from "@/contexts/PlatformSettingsContext";
import { CURRENCIES } from "@shared/currencies";

const LISTING_STATUS_STYLES: Record<string, string> = {
  active: "bg-primary/10 text-primary border-primary/20",
  sold: "bg-chart-2/10 text-chart-2 border-chart-2/20",
  expired: "bg-muted/10 text-muted-foreground border-border",
  reserved: "bg-chart-4/10 text-chart-4 border-chart-4/20",
};

const CURRENCY_OPTIONS = Object.values(CURRENCIES).slice(0, 8); // Top 8 currencies

function formatPrice(amount: number | string | null | undefined, currency: string): string {
  const num = Number(amount ?? 0);
  if (!num) return "—";
  const meta = CURRENCIES[currency];
  if (!meta) return `${currency} ${num.toLocaleString()}`;
  try {
    return new Intl.NumberFormat(meta.locale, {
      style: "currency",
      currency: meta.code,
      maximumFractionDigits: meta.decimals,
    }).format(num);
  } catch {
    return `${meta.symbol}${num.toLocaleString()}`;
  }
}

export default function Marketplace() {
  const [search, setSearch] = useState("");
  const [listingType, setListingType] = useState("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const { displayCurrency } = usePlatformSettings();
  const [createForm, setCreateForm] = useState({
    bpan: "",
    batteryId: 0,
    listingType: "second_life_pack" as "second_life_pack" | "direct_reuse" | "module_repurposing" | "black_mass",
    askingPrice: 50000,
    currency: displayCurrency || "INR",
    description: "",
    targetMarkets: ["IN"] as string[],
  });

  const { data, isLoading, refetch } = trpc.marketplace.list.useQuery({
    listingType: listingType !== "all" ? listingType : undefined,
    limit: 20,
    offset: 0,
  });

  const { data: stats } = trpc.marketplace.stats.useQuery();

  const createMutation = trpc.marketplace.createListing.useMutation({
    onSuccess: () => {
      toast.success("Listing created successfully!");
      setShowCreateDialog(false);
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const listings = data?.items ?? [];
  const total = data?.total ?? 0;

  const selectedCurrencyMeta = CURRENCIES[createForm.currency];

  return (
    <div className="p-6 space-y-5 animate-fade-up">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Second-Life Marketplace</h1>
          <p className="text-muted-foreground text-sm mt-1">AI-priced battery listings with health passport certification</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="w-3.5 h-3.5 mr-1.5" /> Create Listing
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border max-w-md">
            <DialogHeader>
              <DialogTitle className="font-display">Create Marketplace Listing</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div>
                <Label className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-1.5 block">BPAN</Label>
                <Input
                  placeholder="21-character BPAN"
                  value={createForm.bpan}
                  onChange={(e) => setCreateForm({ ...createForm, bpan: e.target.value.toUpperCase() })}
                  className="bg-secondary/30 border-border font-mono text-sm h-9"
                  maxLength={21}
                />
              </div>
              <div>
                <Label className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-1.5 block">Listing Type</Label>
                <Select value={createForm.listingType} onValueChange={(v) => setCreateForm({ ...createForm, listingType: v as typeof createForm.listingType })}>
                  <SelectTrigger className="bg-secondary/30 border-border h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="second_life_pack">Second Life Pack</SelectItem>
                    <SelectItem value="direct_reuse">Direct Reuse</SelectItem>
                    <SelectItem value="module_repurposing">Module Repurposing</SelectItem>
                    <SelectItem value="black_mass">Black Mass</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-1.5 block">Asking Price</Label>
                <div className="flex gap-2">
                  <Select value={createForm.currency} onValueChange={(v) => setCreateForm({ ...createForm, currency: v })}>
                    <SelectTrigger className="w-28 bg-secondary/30 border-border h-9 text-sm shrink-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      {CURRENCY_OPTIONS.map((c) => (
                        <SelectItem key={c.code} value={c.code}>
                          <span className="font-mono">{c.symbol}</span> {c.code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    value={createForm.askingPrice}
                    onChange={(e) => setCreateForm({ ...createForm, askingPrice: parseInt(e.target.value) || 0 })}
                    className="bg-secondary/30 border-border font-mono text-sm h-9 flex-1"
                    placeholder={`Amount in ${createForm.currency}`}
                  />
                </div>
                {selectedCurrencyMeta && (
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Price will be listed in {selectedCurrencyMeta.name} ({selectedCurrencyMeta.code})
                  </p>
                )}
              </div>
              <div>
                <Label className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-1.5 block">Description</Label>
                <Input
                  placeholder="Battery description..."
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  className="bg-secondary/30 border-border text-sm h-9"
                />
              </div>
              <Button
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                disabled={createMutation.isPending}
                onClick={() => createMutation.mutate({
                  bpan: createForm.bpan,
                  batteryId: createForm.batteryId,
                  listingType: createForm.listingType,
                  askingPrice: createForm.askingPrice,
                  currency: createForm.currency,
                  description: createForm.description,
                  targetMarkets: createForm.targetMarkets,
                })}
              >
                {createMutation.isPending ? "Creating..." : "Create Listing"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Active Listings", value: stats?.activeListings ?? 0, icon: ShoppingCart },
          { label: "Total Transactions", value: stats?.totalTransactions ?? 0, icon: TrendingUp },
          { label: "Total Value (INR)", value: `₹${((stats?.totalValueInr ?? 0) / 100000).toFixed(1)}L`, icon: DollarSign },
          { label: "Avg SOH Listed", value: "78.4%", icon: Zap },
        ].map((s) => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-[9px] text-muted-foreground uppercase tracking-widest">{s.label}</span>
              <s.icon className="w-4 h-4 text-primary/50" />
            </div>
            <div className="font-display text-2xl font-bold">{typeof s.value === "number" ? s.value.toLocaleString() : s.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Search BPAN, listing..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card border-border font-mono text-sm h-9"
          />
        </div>
        <Select value={listingType} onValueChange={setListingType}>
          <SelectTrigger className="w-44 bg-card border-border h-9 text-sm"><SelectValue placeholder="Listing Type" /></SelectTrigger>
          <SelectContent className="bg-card border-border">
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="second_life_pack">Second Life Pack</SelectItem>
            <SelectItem value="direct_reuse">Direct Reuse</SelectItem>
            <SelectItem value="module_repurposing">Module Repurposing</SelectItem>
            <SelectItem value="black_mass">Black Mass</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="border-border h-9">
          <RefreshCw className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Listings Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-5 animate-pulse h-52" />
          ))}
        </div>
      ) : listings.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-16 text-center">
          <ShoppingCart className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="font-display text-lg font-bold mb-2">No Listings Found</h3>
          <p className="text-muted-foreground text-sm">Create the first marketplace listing for second-life batteries.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {listings.map((listing) => {
            const soh = Number(listing.sohAtListing ?? 0);
            const currency = (listing as any).listingCurrency ?? "INR";
            const amount = (listing as any).listingCurrencyAmount ?? listing.askingPriceInr;
            return (
              <div key={listing.id} className="bg-card border border-border rounded-xl p-5 hover:border-primary/30 transition-all hover:-translate-y-0.5 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="font-mono text-xs text-primary">{listing.bpan}</div>
                    <div className="font-mono text-[9px] text-muted-foreground mt-0.5 capitalize">{listing.listingType.replace(/_/g, " ")}</div>
                  </div>
                  <Badge variant="outline" className={`font-mono text-[9px] capitalize ${LISTING_STATUS_STYLES[listing.status] ?? ""}`}>
                    {listing.status}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <div className="font-mono text-[9px] text-muted-foreground mb-0.5">SOH at Listing</div>
                    <div className={`font-display text-lg font-bold ${soh > 75 ? "text-primary" : soh > 50 ? "text-chart-4" : "text-destructive"}`}>
                      {soh.toFixed(1)}%
                    </div>
                  </div>
                  <div>
                    <div className="font-mono text-[9px] text-muted-foreground mb-0.5">Asking Price</div>
                    <div className="font-display text-lg font-bold">
                      {formatPrice(amount, currency)}
                    </div>
                    {currency !== "INR" && (
                      <div className="font-mono text-[9px] text-muted-foreground">
                        {currency}
                      </div>
                    )}
                  </div>
                </div>

                {listing.description && (
                  <p className="text-xs text-muted-foreground mb-4 line-clamp-2">{listing.description}</p>
                )}

                <div className="flex gap-2">
                  <Button size="sm" className="flex-1 bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 text-xs h-7">
                    View Details
                  </Button>
                  {listing.status === "active" && (
                    <Button size="sm" className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 text-xs h-7">
                      Make Offer
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
