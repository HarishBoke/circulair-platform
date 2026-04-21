import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShoppingBag, ExternalLink, ArrowLeft, CheckCircle, XCircle, Clock, Ban } from "lucide-react";
import { Link } from "wouter";

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
  succeeded: { label: "Paid", variant: "default", icon: <CheckCircle className="w-3 h-3" /> },
  pending: { label: "Pending", variant: "secondary", icon: <Clock className="w-3 h-3" /> },
  failed: { label: "Failed", variant: "destructive", icon: <XCircle className="w-3 h-3" /> },
  cancelled: { label: "Cancelled", variant: "outline", icon: <Ban className="w-3 h-3" /> },
};

export default function MyOrders() {
  const { data: orders, isLoading } = trpc.marketplace.getMyOrders.useQuery();

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/marketplace">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Marketplace
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ShoppingBag className="w-6 h-6 text-primary" />
              My Orders
            </h1>
            <p className="text-sm text-muted-foreground">Your battery purchase history</p>
          </div>
        </div>

        {/* Orders list */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Card key={i} className="animate-pulse">
                <CardContent className="h-24 bg-muted/20 rounded-lg" />
              </Card>
            ))}
          </div>
        ) : !orders || orders.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center gap-4">
              <ShoppingBag className="w-12 h-12 text-muted-foreground/40" />
              <div>
                <p className="font-medium text-muted-foreground">No orders yet</p>
                <p className="text-sm text-muted-foreground/60 mt-1">
                  Browse the marketplace and make an offer to get started.
                </p>
              </div>
              <Link href="/marketplace">
                <Button variant="outline" size="sm">Browse Marketplace</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => {
              const status = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.pending;
              return (
                <Card key={order.id} className="hover:border-primary/30 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-sm font-medium">
                            Listing #{order.listingId}
                          </span>
                          <Badge variant={status.variant} className="flex items-center gap-1 text-xs">
                            {status.icon}
                            {status.label}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Offer #{order.offerId} · Payment ID: {order.stripePaymentIntentId.slice(0, 24)}...
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(order.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <Link href={`/marketplace/${order.listingId}`}>
                          <Button variant="ghost" size="sm" className="text-xs h-7">
                            <ExternalLink className="w-3 h-3 mr-1" />
                            View Listing
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Test card notice */}
        <Card className="border-yellow-500/30 bg-yellow-950/10">
          <CardContent className="p-4 text-sm text-yellow-400/80">
            <strong>Test mode:</strong> Use card <code className="font-mono bg-yellow-950/30 px-1 rounded">4242 4242 4242 4242</code> with any future expiry and any CVC to test payments. Claim your Stripe sandbox at{" "}
            <a
              href="https://dashboard.stripe.com/claim_sandbox/YWNjdF8xUnZlM0dTblg4bm5rR3ZZLDE3Nzc0MDE1NzEv100yrOFkcXB"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              dashboard.stripe.com
            </a>{" "}
            to activate.
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
