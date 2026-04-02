import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  ArrowLeft, Shield, CheckCircle2, User, Phone, Mail, MessageCircle,
  Store, FileText, Calendar, Battery, CreditCard,
} from "lucide-react";

export default function WarrantyRegister() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState(1);
  const [registeredWarranty, setRegisteredWarranty] = useState<{
    warrantyId: number; warrantyEndDate: string; bpan: string;
  } | null>(null);

  const [form, setForm] = useState({
    bpan: "",
    serialNumber: "",
    modelNumber: "",
    warrantyType: "standard",
    coverageType: "full_replacement",
    warrantyTermMonths: 24,
    purchaseDate: new Date().toISOString().split("T")[0],
    warrantyStartDate: "",
    customerName: "",
    customerPhone: "",
    customerWhatsApp: "",
    customerEmail: "",
    customerAddress: "",
    dealerName: "",
    dealerCode: "",
    dealerPhone: "",
    dealerEmail: "",
    invoiceNumber: "",
    purchaseAmount: "",
    purchaseCurrency: "INR",
    manufacturer: "",
    notes: "",
  });

  // Lookup battery by BPAN
  const batteryQuery = trpc.bpan.get.useQuery(
    { bpan: form.bpan },
    { enabled: form.bpan.length === 21 }
  );

  const mutation = trpc.warranty.register.useMutation({
    onSuccess: (data) => {
      setRegisteredWarranty({
        warrantyId: data.warrantyId,
        warrantyEndDate: data.warrantyEndDate,
        bpan: form.bpan,
      });
      toast.success("Warranty registered successfully!");
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!batteryQuery.data) {
      toast.error("Please enter a valid BPAN first");
      return;
    }
    mutation.mutate({
      batteryId: batteryQuery.data.battery.id,
      bpan: form.bpan,
      serialNumber: form.serialNumber || undefined,
      modelNumber: form.modelNumber || undefined,
      warrantyType: form.warrantyType as any,
      coverageType: form.coverageType as any,
      warrantyTermMonths: form.warrantyTermMonths,
      purchaseDate: form.purchaseDate,
      warrantyStartDate: form.warrantyStartDate || undefined,
      customerName: form.customerName,
      customerPhone: form.customerPhone || undefined,
      customerWhatsApp: form.customerWhatsApp || undefined,
      customerEmail: form.customerEmail || undefined,
      customerAddress: form.customerAddress || undefined,
      dealerName: form.dealerName || undefined,
      dealerCode: form.dealerCode || undefined,
      dealerPhone: form.dealerPhone || undefined,
      dealerEmail: form.dealerEmail || undefined,
      invoiceNumber: form.invoiceNumber || undefined,
      purchaseAmount: form.purchaseAmount ? Number(form.purchaseAmount) : undefined,
      purchaseCurrency: form.purchaseCurrency,
      manufacturer: form.manufacturer || undefined,
      notes: form.notes || undefined,
    });
  };

  const set = (key: string, val: string) => setForm(prev => ({ ...prev, [key]: val }));

  if (registeredWarranty) {
    return (
      <div className="p-6 max-w-lg mx-auto animate-fade-up">
        <div className="bg-card border border-emerald-500/30 rounded-2xl p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
          </div>
          <h2 className="font-display text-2xl font-bold mb-2">Warranty Registered!</h2>
          <p className="text-muted-foreground text-sm mb-6">
            Battery {registeredWarranty.bpan} is now covered under warranty
          </p>
          <div className="bg-secondary/50 rounded-xl p-4 mb-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Warranty ID</span>
              <span className="font-mono font-bold text-primary">#{registeredWarranty.warrantyId}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">BPAN</span>
              <span className="font-mono text-xs">{registeredWarranty.bpan}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Coverage Until</span>
              <span className="font-bold text-emerald-400">
                {new Date(registeredWarranty.warrantyEndDate).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}
              </span>
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <Link href={`/batteries/${registeredWarranty.bpan}`}>
              <Button className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 text-xs">
                View Battery
              </Button>
            </Link>
            <Link href="/warranty">
              <Button variant="outline" className="flex-1 text-xs">Warranty Dashboard</Button>
            </Link>
          </div>
          <Button variant="ghost" size="sm" className="mt-4 text-muted-foreground text-xs" onClick={() => {
            setRegisteredWarranty(null);
            setStep(1);
            setForm(prev => ({ ...prev, bpan: "", customerName: "", customerPhone: "", customerEmail: "" }));
          }}>
            Register Another Warranty
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto animate-fade-up">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/warranty">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <div>
          <h1 className="font-display text-2xl font-bold flex items-center gap-2">
            <Shield className="w-6 h-6 text-emerald-400" /> Register Warranty
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">Register warranty at point of sale with customer details</p>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-2 mb-8">
        {[
          { n: 1, label: "Battery", icon: Battery },
          { n: 2, label: "Customer", icon: User },
          { n: 3, label: "Dealer", icon: Store },
          { n: 4, label: "Warranty", icon: Shield },
        ].map(({ n, label, icon: Icon }) => (
          <div key={n} className="flex items-center gap-2 flex-1">
            <button
              onClick={() => n <= step && setStep(n)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all w-full
                ${step === n ? "bg-primary/10 border border-primary/30 text-primary" :
                  step > n ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400" :
                  "bg-secondary/30 border border-border text-muted-foreground"}`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{label}</span>
              {step > n && <CheckCircle2 className="w-3 h-3 ml-auto text-emerald-400" />}
            </button>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit}>
        {/* Step 1: Battery Identification */}
        {step === 1 && (
          <div className="space-y-6 animate-fade-up">
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="font-display text-sm font-bold mb-4 flex items-center gap-2">
                <Battery className="w-4 h-4 text-primary" /> Battery Identification
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <Label className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-1.5 block">
                    BPAN (Battery Pack Aadhaar Number) *
                  </Label>
                  <Input
                    value={form.bpan}
                    onChange={(e) => set("bpan", e.target.value.toUpperCase().slice(0, 21))}
                    maxLength={21}
                    className="bg-secondary/30 border-border font-mono text-sm h-10"
                    placeholder="Enter 21-character BPAN"
                  />
                  {form.bpan.length === 21 && batteryQuery.isLoading && (
                    <p className="text-xs text-muted-foreground mt-1">Looking up battery...</p>
                  )}
                  {form.bpan.length === 21 && batteryQuery.data && (
                    <div className="mt-2 p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-lg">
                      <p className="text-xs text-emerald-400 font-medium">Battery found!</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {batteryQuery.data.battery.chemistry} · {batteryQuery.data.battery.capacityKwh} kWh · {batteryQuery.data.battery.voltageV}V · SOH: {batteryQuery.data.battery.currentSoh}%
                      </p>
                    </div>
                  )}
                  {form.bpan.length === 21 && batteryQuery.error && (
                    <p className="text-xs text-destructive mt-1">Battery not found. Register it first.</p>
                  )}
                </div>
                <div>
                  <Label className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-1.5 block">Serial Number</Label>
                  <Input value={form.serialNumber} onChange={(e) => set("serialNumber", e.target.value)} className="bg-secondary/30 border-border text-sm h-10" placeholder="Manufacturer serial" />
                </div>
                <div>
                  <Label className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-1.5 block">Model Number</Label>
                  <Input value={form.modelNumber} onChange={(e) => set("modelNumber", e.target.value)} className="bg-secondary/30 border-border text-sm h-10" placeholder="Model/SKU" />
                </div>
                <div>
                  <Label className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-1.5 block">Manufacturer</Label>
                  <Input value={form.manufacturer} onChange={(e) => set("manufacturer", e.target.value)} className="bg-secondary/30 border-border text-sm h-10" placeholder="OEM name" />
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="button" onClick={() => {
                if (form.bpan.length !== 21) { toast.error("Enter a valid 21-character BPAN"); return; }
                if (!batteryQuery.data) { toast.error("Battery not found for this BPAN"); return; }
                setStep(2);
              }} className="bg-primary text-primary-foreground">
                Next: Customer Details →
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Customer Information */}
        {step === 2 && (
          <div className="space-y-6 animate-fade-up">
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="font-display text-sm font-bold mb-4 flex items-center gap-2">
                <User className="w-4 h-4 text-primary" /> Customer Information
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <Label className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-1.5 block">Customer Name *</Label>
                  <Input value={form.customerName} onChange={(e) => set("customerName", e.target.value)} className="bg-secondary/30 border-border text-sm h-10" placeholder="Full name" />
                </div>
                <div>
                  <Label className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-1.5 block">
                    <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> Phone Number</span>
                  </Label>
                  <Input value={form.customerPhone} onChange={(e) => set("customerPhone", e.target.value)} className="bg-secondary/30 border-border text-sm h-10" placeholder="+91 98765 43210" />
                </div>
                <div>
                  <Label className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-1.5 block">
                    <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3" /> WhatsApp Number</span>
                  </Label>
                  <Input value={form.customerWhatsApp} onChange={(e) => set("customerWhatsApp", e.target.value)} className="bg-secondary/30 border-border text-sm h-10" placeholder="+91 98765 43210" />
                </div>
                <div>
                  <Label className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-1.5 block">
                    <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> Email Address</span>
                  </Label>
                  <Input type="email" value={form.customerEmail} onChange={(e) => set("customerEmail", e.target.value)} className="bg-secondary/30 border-border text-sm h-10" placeholder="customer@email.com" />
                </div>
                <div className="sm:col-span-2">
                  <Label className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-1.5 block">Address</Label>
                  <Textarea value={form.customerAddress} onChange={(e) => set("customerAddress", e.target.value)} className="bg-secondary/30 border-border text-sm min-h-[60px]" placeholder="Full address" />
                </div>
              </div>
              <div className="mt-4 p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg">
                <p className="text-xs text-amber-400 font-medium">Why collect contact details?</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Phone, WhatsApp, and email enable multi-channel warranty verification. Battery providers can verify warranty status via any of these channels — reducing call center load by 60%.
                </p>
              </div>
            </div>
            <div className="flex justify-between">
              <Button type="button" variant="outline" onClick={() => setStep(1)}>← Back</Button>
              <Button type="button" onClick={() => {
                if (!form.customerName.trim()) { toast.error("Customer name is required"); return; }
                setStep(3);
              }} className="bg-primary text-primary-foreground">
                Next: Dealer Info →
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Dealer / Point of Sale */}
        {step === 3 && (
          <div className="space-y-6 animate-fade-up">
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="font-display text-sm font-bold mb-4 flex items-center gap-2">
                <Store className="w-4 h-4 text-primary" /> Dealer / Point of Sale
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-1.5 block">Dealer Name</Label>
                  <Input value={form.dealerName} onChange={(e) => set("dealerName", e.target.value)} className="bg-secondary/30 border-border text-sm h-10" placeholder="Dealer/store name" />
                </div>
                <div>
                  <Label className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-1.5 block">Dealer Code</Label>
                  <Input value={form.dealerCode} onChange={(e) => set("dealerCode", e.target.value)} className="bg-secondary/30 border-border text-sm h-10" placeholder="DLR-001" />
                </div>
                <div>
                  <Label className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-1.5 block">Dealer Phone</Label>
                  <Input value={form.dealerPhone} onChange={(e) => set("dealerPhone", e.target.value)} className="bg-secondary/30 border-border text-sm h-10" placeholder="+91 98765 43210" />
                </div>
                <div>
                  <Label className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-1.5 block">Dealer Email</Label>
                  <Input type="email" value={form.dealerEmail} onChange={(e) => set("dealerEmail", e.target.value)} className="bg-secondary/30 border-border text-sm h-10" placeholder="dealer@company.com" />
                </div>
              </div>
            </div>
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="font-display text-sm font-bold mb-4 flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" /> Purchase Documentation
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-1.5 block">Invoice Number</Label>
                  <Input value={form.invoiceNumber} onChange={(e) => set("invoiceNumber", e.target.value)} className="bg-secondary/30 border-border text-sm h-10" placeholder="INV-2025-001" />
                </div>
                <div>
                  <Label className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-1.5 block">
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Purchase Date *</span>
                  </Label>
                  <Input type="date" value={form.purchaseDate} onChange={(e) => set("purchaseDate", e.target.value)} className="bg-secondary/30 border-border text-sm h-10" />
                </div>
                <div>
                  <Label className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-1.5 block">
                    <span className="flex items-center gap-1"><CreditCard className="w-3 h-3" /> Purchase Amount</span>
                  </Label>
                  <Input type="number" value={form.purchaseAmount} onChange={(e) => set("purchaseAmount", e.target.value)} className="bg-secondary/30 border-border text-sm h-10" placeholder="0.00" />
                </div>
                <div>
                  <Label className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-1.5 block">Currency</Label>
                  <Select value={form.purchaseCurrency} onValueChange={(v) => set("purchaseCurrency", v)}>
                    <SelectTrigger className="bg-secondary/30 border-border h-10 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      <SelectItem value="INR">INR (₹)</SelectItem>
                      <SelectItem value="USD">USD ($)</SelectItem>
                      <SelectItem value="EUR">EUR (€)</SelectItem>
                      <SelectItem value="GBP">GBP (£)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <div className="flex justify-between">
              <Button type="button" variant="outline" onClick={() => setStep(2)}>← Back</Button>
              <Button type="button" onClick={() => setStep(4)} className="bg-primary text-primary-foreground">
                Next: Warranty Terms →
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Warranty Terms & Confirm */}
        {step === 4 && (
          <div className="space-y-6 animate-fade-up">
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="font-display text-sm font-bold mb-4 flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-400" /> Warranty Terms
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <Label className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-1.5 block">Warranty Type</Label>
                  <Select value={form.warrantyType} onValueChange={(v) => set("warrantyType", v)}>
                    <SelectTrigger className="bg-secondary/30 border-border h-10 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      <SelectItem value="standard">Standard</SelectItem>
                      <SelectItem value="extended">Extended</SelectItem>
                      <SelectItem value="premium">Premium</SelectItem>
                      <SelectItem value="commercial">Commercial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-1.5 block">Coverage Type</Label>
                  <Select value={form.coverageType} onValueChange={(v) => set("coverageType", v)}>
                    <SelectTrigger className="bg-secondary/30 border-border h-10 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      <SelectItem value="full_replacement">Full Replacement</SelectItem>
                      <SelectItem value="pro_rata">Pro Rata</SelectItem>
                      <SelectItem value="labor_only">Labor Only</SelectItem>
                      <SelectItem value="parts_only">Parts Only</SelectItem>
                      <SelectItem value="comprehensive">Comprehensive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-1.5 block">Term (Months)</Label>
                  <Input type="number" value={form.warrantyTermMonths} onChange={(e) => set("warrantyTermMonths", e.target.value)} className="bg-secondary/30 border-border text-sm h-10" min={1} max={120} />
                </div>
                <div>
                  <Label className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-1.5 block">Warranty Start Date</Label>
                  <Input type="date" value={form.warrantyStartDate} onChange={(e) => set("warrantyStartDate", e.target.value)} className="bg-secondary/30 border-border text-sm h-10" />
                  <p className="text-[9px] text-muted-foreground mt-1">Leave blank to use purchase date</p>
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="bg-card border border-emerald-500/20 rounded-xl p-5">
              <h3 className="font-display text-sm font-bold mb-4">Registration Summary</h3>
              <div className="grid grid-cols-2 gap-y-2 gap-x-6 text-sm">
                <span className="text-muted-foreground">BPAN</span>
                <span className="font-mono text-xs">{form.bpan}</span>
                <span className="text-muted-foreground">Customer</span>
                <span>{form.customerName || "—"}</span>
                <span className="text-muted-foreground">Phone</span>
                <span>{form.customerPhone || "—"}</span>
                <span className="text-muted-foreground">Email</span>
                <span>{form.customerEmail || "—"}</span>
                <span className="text-muted-foreground">Dealer</span>
                <span>{form.dealerName || "—"}</span>
                <span className="text-muted-foreground">Invoice</span>
                <span>{form.invoiceNumber || "—"}</span>
                <span className="text-muted-foreground">Warranty</span>
                <span className="capitalize">{form.warrantyType} · {form.warrantyTermMonths} months</span>
                <span className="text-muted-foreground">Coverage</span>
                <span className="capitalize">{form.coverageType.replace(/_/g, " ")}</span>
              </div>
              <div className="mt-3">
                <Label className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-1.5 block">Notes</Label>
                <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} className="bg-secondary/30 border-border text-sm min-h-[50px]" placeholder="Optional notes..." />
              </div>
            </div>

            <div className="flex justify-between">
              <Button type="button" variant="outline" onClick={() => setStep(3)}>← Back</Button>
              <Button
                type="submit"
                disabled={mutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {mutation.isPending ? "Registering..." : "Register Warranty"}
              </Button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
