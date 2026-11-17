import { Link } from "wouter";
import { AlertTriangle, ArrowLeft, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/** Redirect/query parameters are never evidence of payment or settlement. */
export default function PaymentSuccess() {
  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
      <Card className="max-w-md w-full border-amber-500/30">
        <CardHeader className="text-center pb-2">
          <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto mb-3" />
          <CardTitle className="text-2xl">Payment not verified</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">
            Checkout and purchases are currently unavailable. This return page cannot confirm a charge,
            reservation, completed sale, seller payout or receipt. A URL or session identifier is not proof of payment.
          </p>
          <div role="status" className="bg-muted/20 rounded-lg p-4 text-sm text-left space-y-2">
            <p className="font-medium">Do not retry payment or arrange handover based on this page.</p>
            <p className="text-muted-foreground">
              If you previously attempted payment, retain your own receipt and request reconciliation through
              your established support contact. Existing order records are not certification of settlement or payout.
            </p>
          </div>
          <div className="flex flex-col gap-2 pt-2">
            <Button className="w-full" variant="outline" asChild>
              <Link href="/marketplace/orders"><ShoppingBag className="w-4 h-4 mr-2" /> View existing order records</Link>
            </Button>
            <Button className="w-full" variant="outline" asChild>
              <Link href="/marketplace"><ArrowLeft className="w-4 h-4 mr-2" /> Back to Marketplace</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
