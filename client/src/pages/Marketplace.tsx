import { useState } from "react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useStructuredData } from "@/hooks/useStructuredData";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShoppingCart, Plus, Search, Zap, RefreshCw, TrendingUp, DollarSign, Download, Package } from "lucide-react";
import { downloadCsv, type CsvColumn } from "@/lib/csvExport";
import { useLocation } from "wouter";
import { CURRENCIES } from "@shared/currencies";

const LISTING_STATUS_STYLES: Record<string, string> = {
  active: "bg-primary/10 text-primary border-primary/20",
  sold: "bg-chart-2/10 text-chart-2 border-chart-2/20",
  expired: "bg-muted/10 text-muted-foreground border-border",
  reserved: "bg-chart-4/10 text-chart-4 border-chart-4/20",
};

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
  usePageTitle("Marketplace");
  useStructuredData([
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "name": "Second-Life Battery Marketplace",
      "url": "https://www.circulair.energy/marketplace",
      "description": "Browse second-life battery records. Transactions and payments are unavailable; records are not safety certification.",
      "breadcrumb": {
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://www.circulair.energy/" },
          { "@type": "ListItem", "position": 2, "name": "Marketplace", "item": "https://www.circulair.energy/marketplace" }
        ]
      }
    }
  ]);

  const [search, setSearch] = useState("");
  const [listingType, setListingType] = useState("all");
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 12;
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<"browse" | "my">("browse");
  const { data, isLoading, error, refetch } = trpc.marketplace.list.useQuery({
    listingType: listingType !== "all" ? listingType : undefined,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  });

  const { data: stats } = trpc.marketplace.stats.useQuery();

  const allPageListings = data?.items ?? [];
  const listings = allPageListings.filter((item) =>
    `${item.bpan} ${item.description ?? ""}`.toLowerCase().includes(search.trim().toLowerCase())
  );
  const total = data?.total ?? 0;

  return (
    <div className="p-6 space-y-5 animate-fade-up">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Second-Life Marketplace</h1>
          <p className="text-muted-foreground text-sm mt-1">Read-only battery listings; condition and valuation are not independently verified</p>
        </div>
        <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => navigate("/marketplace/create")}>
          <Plus className="w-3.5 h-3.5 mr-1.5" /> Prepare Listing (publication unavailable)
        </Button>
      </div>

      <div role="status" className="rounded-lg border border-amber-500/30 p-3 text-sm">
        Payments, offers, seller acceptance, publication and listing changes are unavailable while
        authorization, reservation, verified settlement, refund and payout gates remain open.
        Browsing remains available. Do not arrange payment or physical handover based on listing status.
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-secondary/30 p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab("browse")}
          className={`px-4 py-1.5 text-sm rounded-md transition-all font-medium ${
            activeTab === "browse" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <ShoppingCart className="w-3.5 h-3.5 inline mr-1.5" /> Browse
        </button>
        <button
          onClick={() => setActiveTab("my")}
          className={`px-4 py-1.5 text-sm rounded-md transition-all font-medium ${
            activeTab === "my" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Package className="w-3.5 h-3.5 inline mr-1.5" /> My Listings
        </button>
      </div>

      {activeTab === "browse" && <>
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Active Listings", value: stats?.activeListings ?? 0, icon: ShoppingCart },
          { label: "Recorded Sold Listings (unverified)", value: stats?.totalTransactions ?? 0, icon: TrendingUp },
          { label: "Recorded Value INR (unaudited)", value: `₹${((stats?.totalValueInr ?? 0) / 100000).toFixed(1)}L`, icon: DollarSign },
          { label: "Avg SOH Listed", value: "Not measured", icon: Zap },
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
            placeholder="Filter BPAN/description on this page"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card border-border font-mono text-sm h-9"
          />
        </div>
        <Select value={listingType} onValueChange={(value) => { setListingType(value); setPage(0); }}>
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
        <Button
          variant="outline"
          size="sm"
          className="border-border h-9 gap-1.5"
          disabled={listings.length === 0}
          onClick={() => {
            const cols: CsvColumn<typeof listings[0]>[] = [
              { key: "bpan", header: "BPAN" },
              { key: "listingType", header: "Type", format: (r) => r.listingType?.replace(/_/g, " ") ?? "" },
              { key: "askingPriceInr", header: "Asking price (unverified)", format: (r) => formatPrice((r as { listingCurrencyAmount?: string | null }).listingCurrencyAmount ?? r.askingPriceInr, (r as { listingCurrency?: string }).listingCurrency ?? "INR") },
              { key: "status", header: "Status" },
              { key: "description", header: "Description" },
              { key: "createdAt", header: "Listed", format: (r) => r.createdAt ? new Date(r.createdAt).toLocaleDateString() : "" },
            ];
            downloadCsv(listings, cols, `marketplace-${new Date().toISOString().slice(0, 10)}`);
          }}
        >
          <Download className="w-3.5 h-3.5" /> CSV
        </Button>
      </div>

      {/* Listings Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-5 animate-pulse h-52" />
          ))}
        </div>
      ) : error ? (
        <div role="alert" className="rounded-xl border border-destructive/30 p-6">Unable to load listings. No availability or sale status can be confirmed.</div>
      ) : listings.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-16 text-center">
          <ShoppingCart className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="font-display text-lg font-bold mb-2">No Listings Found</h3>
          <p className="text-muted-foreground text-sm">No matching records on this page. Publication and transactions are unavailable.</p>
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
                  <Button size="sm" className="flex-1 bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 text-xs h-7" onClick={() => navigate(`/marketplace/${listing.id}`)}>
                    View Details
                  </Button>
                  {listing.status === "active" && (
                    <Button size="sm" className="flex-1 bg-primary text-primary-foreground text-xs h-7" disabled>
                      Purchase unavailable
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {total > PAGE_SIZE && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-muted-foreground">
            Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total}
          </p>
          <div className="flex gap-1">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-3 py-1.5 text-xs rounded-lg bg-secondary text-foreground/90 hover:bg-secondary/70 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={(page + 1) * PAGE_SIZE >= total}
              className="px-3 py-1.5 text-xs rounded-lg bg-secondary text-foreground/90 hover:bg-secondary/70 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
      </>}

      {/* My Listings Tab */}
      {activeTab === "my" && <MyListingsTab navigate={navigate} />}
    </div>
  );
}

function MyListingsTab({ navigate }: { navigate: (path: string) => void }) {
  const { data, isLoading, error } = trpc.marketplace.myListings.useQuery({ limit: 50 });
  const items = data?.items ?? [];

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => <div key={i} className="h-24 bg-card border border-border rounded-xl animate-pulse" />)}
      </div>
    );
  }

  if (error) return <div role="alert" className="p-6">Unable to load your listing records.</div>;

  if (items.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-16 text-center">
        <Package className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
        <h3 className="font-display text-lg font-bold mb-2">No Listings Yet</h3>
        <p className="text-muted-foreground text-sm mb-4">Publication is unavailable; you may prepare details without saving them.</p>
        <Button onClick={() => navigate("/marketplace/create")} className="bg-primary text-primary-foreground">
          <Plus className="w-3.5 h-3.5 mr-1.5" /> Prepare Listing (publication unavailable)
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((listing) => {
        const soh = Number(listing.sohAtListing ?? 0);
        return (
          <div key={listing.id} className="bg-card border border-border rounded-xl p-5 hover:border-primary/30 transition-all">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div>
                  <div className="font-mono text-sm text-primary">{listing.bpan}</div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-muted-foreground capitalize">{listing.listingType.replace(/_/g, " ")}</span>
                    <span className="text-xs text-muted-foreground">SOH: {soh.toFixed(1)}%</span>
                    <span className="text-xs text-muted-foreground">{listing.capacityKwh} kWh</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="font-display text-lg font-bold">
                    {listing.askingPriceInr ? `\u20B9${Number(listing.askingPriceInr).toLocaleString()}` : "Price unavailable"}
                  </div>
                  <Badge variant="outline" className={`font-mono text-[9px] capitalize ${LISTING_STATUS_STYLES[listing.status] ?? ""}`}>
                    {listing.status}
                  </Badge>
                </div>
                {listing.status === "active" && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive border-destructive/30 hover:bg-destructive/10 text-xs"
                    disabled
                  >
                    Withdrawal unavailable
                  </Button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
