import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft, Battery, MapPin, Calendar, Zap,
  ShieldCheck, ChevronLeft, ChevronRight, User, Tag,
  Package, FileText, AlertTriangle, CheckCircle2, Clock,
  ExternalLink, Download
} from "lucide-react";
const CONDITION_COLORS: Record<string, string> = {
  excellent: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  good: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  fair: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  poor: "bg-red-500/10 text-red-400 border-red-500/30",
};

const LISTING_TYPE_LABELS: Record<string, string> = {
  direct_reuse: "Direct Reuse",
  module_repurposing: "Module Repurposing",
  black_mass: "Black Mass",
  second_life_pack: "Second Life Pack",
};

const CURRENCIES = [
  { code: "INR", symbol: "₹", name: "Indian Rupee" },
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "SGD", symbol: "S$", name: "Singapore Dollar" },
  { code: "AED", symbol: "AED", name: "UAE Dirham" },
];

export default function MarketplaceDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const listingId = Number(id);

  const [photoIndex, setPhotoIndex] = useState(0);

  const { data, isLoading, error } = trpc.marketplace.getById.useQuery(
    { listingId },
    { enabled: Number.isSafeInteger(listingId) && listingId > 0 }
  );

  if (isLoading) {
    return (
      <div className="p-8 space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-muted rounded" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-96 bg-muted rounded-xl" />
          <div className="space-y-4">
            <div className="h-48 bg-muted rounded-xl" />
            <div className="h-32 bg-muted rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center space-y-4">
        <AlertTriangle className="mx-auto h-12 w-12 text-amber-400" />
        <p className="text-muted-foreground">Listing not found or has been removed.</p>
        <Button variant="outline" onClick={() => navigate("/marketplace")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Marketplace
        </Button>
      </div>
    );
  }

  const { listing, photos, battery } = data;
  const isOwner = user?.id === listing.sellerId;
  const isActive = listing.status === "active";
  const currentPhoto = photos[photoIndex];
  const askingPrice = (listing as any).listingCurrencyAmount ?? listing.askingPriceInr;
  const currency = (listing as any).listingCurrency ?? "INR";
  const currencySymbol = CURRENCIES.find(c => c.code === currency)?.symbol ?? `${currency} `;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Back navigation */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/marketplace")} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back to Marketplace
        </Button>
        <Separator orientation="vertical" className="h-4" />
        <span className="text-sm text-muted-foreground font-mono">{listing.bpan}</span>
        <Badge
          variant="outline"
          className={listing.status === "active" ? "border-emerald-500/30 text-emerald-400" : "border-muted text-muted-foreground"}
        >
          {listing.status.charAt(0).toUpperCase() + listing.status.slice(1)}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Photos + Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Photo gallery */}
          <Card className="overflow-hidden border-border/50">
            <div className="relative bg-muted/30 aspect-[16/9] flex items-center justify-center">
              {photos.length > 0 && currentPhoto ? (
                <img
                  src={currentPhoto.url}
                  alt={currentPhoto.caption ?? `Photo ${photoIndex + 1}`}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="flex flex-col items-center gap-3 text-muted-foreground">
                  <Battery className="h-16 w-16 opacity-30" />
                  <span className="text-sm">No photos uploaded</span>
                </div>
              )}
              {photos.length > 1 && (
                <>
                  <button
                    onClick={() => setPhotoIndex((i) => (i - 1 + photos.length) % photos.length)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-foreground rounded-full p-2 transition-colors"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => setPhotoIndex((i) => (i + 1) % photos.length)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-foreground rounded-full p-2 transition-colors"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {photos.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setPhotoIndex(i)}
                        className={`w-2 h-2 rounded-full transition-colors ${i === photoIndex ? "bg-white" : "bg-white/40"}`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
            {photos.length > 1 && (
              <div className="flex gap-2 p-3 overflow-x-auto bg-muted/20">
                {photos.map((photo, i) => (
                  <button
                    key={photo.id}
                    onClick={() => setPhotoIndex(i)}
                    className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${i === photoIndex ? "border-primary" : "border-transparent"}`}
                  >
                    <img src={photo.url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </Card>

          {/* Battery specs */}
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Battery className="h-4 w-4 text-primary" /> Battery Specifications
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {[
                  { label: "BPAN", value: listing.bpan, icon: Tag },
                  { label: "Chemistry", value: listing.chemistry ?? battery?.chemistry ?? "—", icon: Zap },
                  { label: "Capacity", value: listing.capacityKwh ? `${listing.capacityKwh} kWh` : "—", icon: Battery },
                  { label: "SOH at Listing", value: listing.sohAtListing ? `${Number(listing.sohAtListing).toFixed(1)}%` : "—", icon: ShieldCheck },
                  { label: "RUL", value: listing.rulAtListing ? `${listing.rulAtListing} cycles` : "—", icon: Clock },
                  { label: "Listing Type", value: LISTING_TYPE_LABELS[listing.listingType] ?? listing.listingType, icon: Package },
                  { label: "Location", value: listing.location ?? "—", icon: MapPin },
                  { label: "Listed", value: new Date(listing.createdAt).toLocaleDateString(), icon: Calendar },
                  { label: "Manufacturer", value: battery?.manufacturerId ?? "—", icon: User },
                ].map(({ label, value, icon: Icon }) => (
                  <div key={label} className="space-y-1">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Icon className="h-3 w-3" /> {label}
                    </div>
                    <div className="text-sm font-medium">{value}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Condition report */}
          {(listing.conditionGrade || listing.conditionNotes) && (
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" /> Condition Report
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {listing.conditionGrade && (
                  <Badge
                    variant="outline"
                    className={`capitalize ${CONDITION_COLORS[listing.conditionGrade] ?? ""}`}
                  >
                    <CheckCircle2 className="mr-1.5 h-3 w-3" />
                    {listing.conditionGrade} Condition
                  </Badge>
                )}
                {listing.conditionNotes && (
                  <p className="text-sm text-muted-foreground leading-relaxed">{listing.conditionNotes}</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Description */}
          {listing.description && (
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" /> Description
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{listing.description}</p>
              </CardContent>
            </Card>
          )}

          {/* Health passport link */}
          {listing.healthPassportUrl && (
            <Card className="border-border/50 bg-primary/5">
              <CardContent className="pt-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  <span>Health Passport available</span>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" asChild>
                    <a href={listing.healthPassportUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="mr-1.5 h-3 w-3" /> View
                    </a>
                  </Button>
                  <Button size="sm" variant="outline" asChild>
                    <a href={listing.healthPassportUrl} download>
                      <Download className="mr-1.5 h-3 w-3" /> Download
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: Pricing + Actions */}
        <div className="space-y-4">
          {/* Price card */}
          <Card className="border-border/50 sticky top-4">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-2xl font-bold text-primary">
                    {askingPrice
                      ? `${currencySymbol}${Number(askingPrice).toLocaleString()}`
                      : "Price on request"}
                  </div>
                  {listing.spotPriceInr && (
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Spot: ₹{Number(listing.spotPriceInr).toLocaleString()}
                    </div>
                  )}
                </div>
                {listing.conditionGrade && (
                  <Badge
                    variant="outline"
                    className={`capitalize text-xs ${CONDITION_COLORS[listing.conditionGrade] ?? ""}`}
                  >
                    {listing.conditionGrade}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm text-muted-foreground">
                {LISTING_TYPE_LABELS[listing.listingType] ?? listing.listingType}
              </div>

              <div role="status" className="rounded-lg border border-amber-500/30 p-3 text-sm">
                Payments, offers and seller acceptance are unavailable. Browsing is read-only;
                prices and listing status are not evidence of verified settlement, payout or battery safety.
              </div>
              {isActive && !isOwner && <Button className="w-full" disabled>Purchase unavailable</Button>}

              {isOwner && (
                <div className="rounded-lg bg-muted/40 p-3 text-sm text-muted-foreground text-center">
                  This is your listing
                </div>
              )}

              {!isActive && (
                <div className="rounded-lg bg-muted/40 p-3 text-sm text-center">
                  <span className="capitalize font-medium">{listing.status}</span>
                  {listing.transactionDate && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {new Date(listing.transactionDate).toLocaleDateString()}
                    </div>
                  )}
                </div>
              )}

              <Separator />

              {/* Quick stats */}
              <div className="space-y-2">
                {listing.sohAtListing && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">State of Health</span>
                    <span className="font-medium text-emerald-400">{Number(listing.sohAtListing).toFixed(1)}%</span>
                  </div>
                )}
                {listing.capacityKwh && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Capacity</span>
                    <span className="font-medium">{listing.capacityKwh} kWh</span>
                  </div>
                )}
                {listing.rulAtListing && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Remaining Life</span>
                    <span className="font-medium">{listing.rulAtListing} cycles</span>
                  </div>
                )}
                {listing.location && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Location</span>
                    <span className="font-medium">{listing.location}</span>
                  </div>
                )}
              </div>

              <Separator />

              {/* View battery passport */}
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs"
                onClick={() => navigate(`/batteries/${listing.bpan}`)}
              >
                <ShieldCheck className="mr-1.5 h-3 w-3" /> View Battery Passport
              </Button>
            </CardContent>
          </Card>

          {/* Seller info */}
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" /> Seller
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">Seller identity and authority to sell have not been independently verified.</p>
            </CardContent>
          </Card>

          {/* Safety notice */}
          <Card className="border-amber-500/20 bg-amber-500/5">
            <CardContent className="pt-4">
              <div className="flex gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Transactions are unavailable. Battery condition is seller-reported, not safety certification.
                  A qualified independent inspection and an approved handling plan are required before any physical handover.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

    </div>
  );
}
