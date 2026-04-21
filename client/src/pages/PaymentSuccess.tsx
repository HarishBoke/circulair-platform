import { useEffect } from "react";
import { Link, useSearch } from "wouter";
import { CheckCircle, ArrowLeft, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PaymentSuccess() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const sessionId = params.get("session_id");

  useEffect(() => {
    // Scroll to top on mount
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="max-w-md w-full border-green-500/30 bg-green-950/20">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
          </div>
          <CardTitle className="text-2xl text-green-400">Payment Successful</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">
            Your payment has been processed successfully. The seller will be notified and the listing
            will be marked as sold.
          </p>

          {sessionId && (
            <div className="bg-muted/30 rounded-lg p-3 text-xs text-muted-foreground font-mono break-all">
              Session: {sessionId}
            </div>
          )}

          <div className="bg-muted/20 rounded-lg p-4 text-sm text-left space-y-2">
            <p className="font-medium text-foreground">What happens next?</p>
            <ul className="space-y-1 text-muted-foreground list-disc list-inside">
              <li>The seller receives a payment confirmation</li>
              <li>Coordinate pickup/delivery with the seller directly</li>
              <li>Your order appears in My Orders for tracking</li>
              <li>A receipt will be sent to your email via Stripe</li>
            </ul>
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <Link href="/marketplace/orders">
              <Button className="w-full" variant="default">
                <ShoppingBag className="w-4 h-4 mr-2" />
                View My Orders
              </Button>
            </Link>
            <Link href="/marketplace">
              <Button className="w-full" variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Marketplace
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
