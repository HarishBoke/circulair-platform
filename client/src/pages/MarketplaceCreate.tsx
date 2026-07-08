import { useState, useCallback, useRef } from "react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useLocation } from "wouter";
import {
  ArrowLeft, Upload, X, Camera, CheckCircle2, Battery, Tag,
  MapPin, FileText, ImagePlus, ChevronRight, Loader2, AlertTriangle,
} from "lucide-react";
import { CURRENCIES } from "@shared/currencies";

const CONDITION_GRADES = [
  { value: "excellent", label: "Excellent", description: "Like new, minimal wear, SOH > 90%", color: "text-emerald-400" },
  { value: "good", label: "Good", description: "Normal wear, fully functional, SOH 75-90%", color: "text-primary" },
  { value: "fair", label: "Fair", description: "Moderate wear, some capacity loss, SOH 60-75%", color: "text-amber-400" },
  { value: "poor", label: "Poor", description: "Significant degradation, SOH < 60%", color: "text-red-400" },
];

const LISTING_TYPES = [
  { value: "second_life_pack", label: "Second Life Pack", desc: "Complete pack for energy storage" },
  { value: "direct_reuse", label: "Direct Reuse", desc: "Battery suitable for direct vehicle reuse" },
  { value: "module_repurposing", label: "Module Repurposing", desc: "Modules for repurposing applications" },
  { value: "black_mass", label: "Black Mass", desc: "End-of-life material for recycling" },
];

const CURRENCY_OPTIONS = Object.values(CURRENCIES).slice(0, 12);

type PhotoPreview = {
  id: string;
  file: File;
  preview: string;
  caption: string;
  uploading: boolean;
  uploaded: boolean;
  error?: string;
};

export default function MarketplaceCreate() {
  usePageTitle("List Battery for Sale");
  const [, navigate] = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step management
  const [step, setStep] = useState(1);
  const totalSteps = 4;

  // Form state
  const [selectedBatteryId, setSelectedBatteryId] = useState<number | null>(null);
  const [selectedBpan, setSelectedBpan] = useState("");
  const [listingType, setListingType] = useState<string>("second_life_pack");
  const [askingPrice, setAskingPrice] = useState<number>(0);
  const [currency, setCurrency] = useState("INR");
  const [description, setDescription] = useState("");
  const [conditionGrade, setConditionGrade] = useState("");
  const [conditionNotes, setConditionNotes] = useState("");
  const [location, setLocation] = useState("");
  const [photos, setPhotos] = useState<PhotoPreview[]>([]);
  const [createdListingId, setCreatedListingId] = useState<number | null>(null);

  // Data queries
  const { data: myBatteries, isLoading: batteriesLoading } = trpc.marketplace.myBatteries.useQuery();
  const selectedBattery = myBatteries?.find((b) => b.id === selectedBatteryId);

  // Mutations
  const createMutation = trpc.marketplace.createListing.useMutation({
    onSuccess: async (data) => {
      const listingId = data.listing?.id;
      if (listingId && photos.length > 0) {
        setCreatedListingId(listingId);
        // Upload photos sequentially
        for (let i = 0; i < photos.length; i++) {
          const photo = photos[i];
          setPhotos((prev) => prev.map((p) => p.id === photo.id ? { ...p, uploading: true } : p));
          try {
            const base64 = await fileToBase64(photo.file);
            await uploadPhotoMutation.mutateAsync({
              listingId,
              base64Data: base64,
              mimeType: photo.file.type,
              caption: photo.caption,
              sortOrder: i,
              fileSizeBytes: photo.file.size,
            });
            setPhotos((prev) => prev.map((p) => p.id === photo.id ? { ...p, uploading: false, uploaded: true } : p));
          } catch {
            setPhotos((prev) => prev.map((p) => p.id === photo.id ? { ...p, uploading: false, error: "Upload failed" } : p));
          }
        }
      }
      // Update condition and location
      if (listingId && (conditionGrade || conditionNotes || location)) {
        try {
          await updateMutation.mutateAsync({
            listingId,
            conditionGrade: conditionGrade || undefined,
            conditionNotes: conditionNotes || undefined,
            location: location || undefined,
          });
        } catch { /* supplementary */ }
      }
      toast.success("Battery listed successfully!");
      setStep(5); // Success step
    },
    onError: (err) => {
      toast.error(err.message || "Failed to create listing");
    },
  });

  const uploadPhotoMutation = trpc.marketplace.uploadPhoto.useMutation();
  const updateMutation = trpc.marketplace.update.useMutation();

  // File handling
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const maxPhotos = 6;
    const remaining = maxPhotos - photos.length;
    if (remaining <= 0) {
      toast.error("Maximum 6 photos allowed");
      return;
    }
    const newPhotos: PhotoPreview[] = files.slice(0, remaining).map((file) => ({
      id: Math.random().toString(36).slice(2),
      file,
      preview: URL.createObjectURL(file),
      caption: "",
      uploading: false,
      uploaded: false,
    }));
    setPhotos((prev) => [...prev, ...newPhotos]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [photos.length]);

  const removePhoto = useCallback((id: string) => {
    setPhotos((prev) => {
      const removed = prev.find((p) => p.id === id);
      if (removed) URL.revokeObjectURL(removed.preview);
      return prev.filter((p) => p.id !== id);
    });
  }, []);

  const handleSubmit = () => {
    if (!selectedBatteryId || !selectedBpan) {
      toast.error("Please select a battery");
      return;
    }
    createMutation.mutate({
      bpan: selectedBpan,
      batteryId: selectedBatteryId,
      listingType: listingType as any,
      askingPrice: askingPrice > 0 ? askingPrice : undefined,
      currency,
      description: description || undefined,
      targetMarkets: ["IN"],
    });
  };

  const canProceed = (s: number) => {
    if (s === 1) return selectedBatteryId !== null;
    if (s === 2) return listingType !== "";
    if (s === 3) return true; // Photos are optional
    return true;
  };

  const selectedCurrencyMeta = CURRENCIES[currency];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/marketplace")} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Marketplace
        </Button>
      </div>

      <div className="max-w-3xl mx-auto">
        {/* Progress Steps */}
        {step <= totalSteps && (
          <div className="flex items-center justify-between mb-8">
            {[
              { num: 1, label: "Battery", icon: Battery },
              { num: 2, label: "Pricing", icon: Tag },
              { num: 3, label: "Photos", icon: Camera },
              { num: 4, label: "Review", icon: FileText },
            ].map(({ num, label, icon: Icon }, i) => (
              <div key={num} className="flex items-center flex-1">
                <div className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                    step > num ? "bg-primary border-primary text-primary-foreground" :
                    step === num ? "border-primary text-primary bg-primary/10" :
                    "border-border text-muted-foreground"
                  }`}>
                    {step > num ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-4 h-4" />}
                  </div>
                  <span className={`text-[10px] mt-1.5 font-mono uppercase tracking-wider ${step >= num ? "text-primary" : "text-muted-foreground"}`}>{label}</span>
                </div>
                {i < 3 && <div className={`flex-1 h-px mx-3 mt-[-16px] ${step > num ? "bg-primary" : "bg-border"}`} />}
              </div>
            ))}
          </div>
        )}

        {/* Step 1: Select Battery */}
        {step === 1 && (
          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="font-display text-xl font-bold mb-1">Select Battery</h2>
            <p className="text-sm text-muted-foreground mb-6">Choose a battery from your registered inventory to list on the marketplace.</p>

            {batteriesLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => <div key={i} className="h-20 bg-secondary/30 rounded-lg animate-pulse" />)}
              </div>
            ) : !myBatteries || myBatteries.length === 0 ? (
              <div className="text-center py-12">
                <Battery className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="font-display font-bold mb-2">No Batteries Found</h3>
                <p className="text-sm text-muted-foreground mb-4">You need to register a battery before listing it for sale.</p>
                <Button onClick={() => navigate("/bpan/register")} className="bg-primary text-primary-foreground">
                  Register a Battery
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {myBatteries.map((battery) => (
                  <button
                    key={battery.id}
                    onClick={() => { setSelectedBatteryId(battery.id); setSelectedBpan(battery.bpan); }}
                    className={`w-full text-left p-4 rounded-lg border transition-all ${
                      selectedBatteryId === battery.id
                        ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                        : "border-border bg-secondary/20 hover:border-primary/30"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-mono text-sm text-primary">{battery.bpan}</div>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-muted-foreground">{battery.chemistry}</span>
                          <span className="text-xs text-muted-foreground">{battery.capacityKwh} kWh</span>
                          <span className="text-xs text-muted-foreground">{battery.voltageV}V</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`font-display text-lg font-bold ${
                          Number(battery.currentSoh) > 75 ? "text-primary" :
                          Number(battery.currentSoh) > 50 ? "text-amber-400" : "text-red-400"
                        }`}>
                          {Number(battery.currentSoh ?? 0).toFixed(1)}%
                        </div>
                        <div className="text-[10px] text-muted-foreground font-mono">SOH</div>
                      </div>
                    </div>
                    <Badge variant="outline" className="mt-2 text-[9px] capitalize">{battery.status.replace(/_/g, " ")}</Badge>
                  </button>
                ))}
              </div>
            )}

            <div className="flex justify-end mt-6">
              <Button onClick={() => setStep(2)} disabled={!canProceed(1)} className="bg-primary text-primary-foreground">
                Continue <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Pricing & Condition */}
        {step === 2 && (
          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="font-display text-xl font-bold mb-1">Pricing & Condition</h2>
            <p className="text-sm text-muted-foreground mb-6">Set your asking price and describe the battery's condition.</p>

            <div className="space-y-5">
              {/* Listing Type */}
              <div>
                <Label className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-2 block">Listing Type</Label>
                <div className="grid grid-cols-2 gap-2">
                  {LISTING_TYPES.map((lt) => (
                    <button
                      key={lt.value}
                      onClick={() => setListingType(lt.value)}
                      className={`p-3 rounded-lg border text-left transition-all ${
                        listingType === lt.value
                          ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                          : "border-border bg-secondary/20 hover:border-primary/30"
                      }`}
                    >
                      <div className="text-sm font-medium">{lt.label}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">{lt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Price */}
              <div>
                <Label className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-2 block">Asking Price</Label>
                <div className="flex gap-2">
                  <Select value={currency} onValueChange={setCurrency}>
                    <SelectTrigger className="w-28 bg-secondary/30 border-border h-10 text-sm shrink-0">
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
                    value={askingPrice || ""}
                    onChange={(e) => setAskingPrice(parseInt(e.target.value) || 0)}
                    className="bg-secondary/30 border-border font-mono text-sm h-10 flex-1"
                    placeholder={`Amount in ${currency}`}
                  />
                </div>
                {selectedCurrencyMeta && (
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Price in {selectedCurrencyMeta.name}. A spot price will be auto-calculated based on SOH and capacity.
                  </p>
                )}
              </div>

              {/* Condition Grade */}
              <div>
                <Label className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-2 block">Condition Grade</Label>
                <div className="grid grid-cols-2 gap-2">
                  {CONDITION_GRADES.map((g) => (
                    <button
                      key={g.value}
                      onClick={() => setConditionGrade(g.value)}
                      className={`p-3 rounded-lg border text-left transition-all ${
                        conditionGrade === g.value
                          ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                          : "border-border bg-secondary/20 hover:border-primary/30"
                      }`}
                    >
                      <div className={`text-sm font-medium ${g.color}`}>{g.label}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">{g.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Condition Notes */}
              <div>
                <Label className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-2 block">Condition Notes (optional)</Label>
                <textarea
                  value={conditionNotes}
                  onChange={(e) => setConditionNotes(e.target.value)}
                  className="w-full bg-secondary/30 border border-border rounded-lg p-3 text-sm min-h-[80px] resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Describe any visible damage, wear patterns, or relevant history..."
                />
              </div>

              {/* Location */}
              <div>
                <Label className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-2 block">Location</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="bg-secondary/30 border-border text-sm h-10 pl-9"
                    placeholder="City, State, Country"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <Label className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-2 block">Description</Label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-secondary/30 border border-border rounded-lg p-3 text-sm min-h-[100px] resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Describe the battery, its history, intended use case, and any additional details buyers should know..."
                />
              </div>
            </div>

            <div className="flex justify-between mt-6">
              <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
              <Button onClick={() => setStep(3)} disabled={!canProceed(2)} className="bg-primary text-primary-foreground">
                Continue <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Photos */}
        {step === 3 && (
          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="font-display text-xl font-bold mb-1">Photos</h2>
            <p className="text-sm text-muted-foreground mb-6">Add up to 6 photos of the battery. The first photo will be the primary listing image.</p>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />

            {/* Photo Grid */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              {photos.map((photo, i) => (
                <div key={photo.id} className="relative aspect-square rounded-lg overflow-hidden border border-border bg-secondary/30 group">
                  <img src={photo.preview} alt={photo.caption || `Photo ${i + 1}`} className="w-full h-full object-cover" />
                  {i === 0 && (
                    <div className="absolute top-2 left-2">
                      <Badge className="bg-primary text-primary-foreground text-[9px]">Primary</Badge>
                    </div>
                  )}
                  {photo.uploading && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <Loader2 className="w-6 h-6 text-foreground animate-spin" />
                    </div>
                  )}
                  {photo.uploaded && (
                    <div className="absolute top-2 right-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    </div>
                  )}
                  {photo.error && (
                    <div className="absolute top-2 right-2">
                      <AlertTriangle className="w-5 h-5 text-red-400" />
                    </div>
                  )}
                  <button
                    onClick={() => removePhoto(photo.id)}
                    className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 text-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                  <input
                    value={photo.caption}
                    onChange={(e) => setPhotos((prev) => prev.map((p) => p.id === photo.id ? { ...p, caption: e.target.value } : p))}
                    placeholder="Caption..."
                    className="absolute bottom-0 left-0 right-0 bg-black/60 text-foreground text-[10px] px-2 py-1 border-none outline-none placeholder:text-foreground/50"
                  />
                </div>
              ))}

              {photos.length < 6 && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-square rounded-lg border-2 border-dashed border-border hover:border-primary/50 flex flex-col items-center justify-center gap-2 transition-colors bg-secondary/10"
                >
                  <ImagePlus className="w-8 h-8 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground font-mono">Add Photo</span>
                </button>
              )}
            </div>

            <p className="text-[10px] text-muted-foreground">
              Accepted formats: JPEG, PNG, WebP. Max 6 photos. First photo becomes the primary listing image.
            </p>

            <div className="flex justify-between mt-6">
              <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
              <Button onClick={() => setStep(4)} className="bg-primary text-primary-foreground">
                Continue <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Review */}
        {step === 4 && (
          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="font-display text-xl font-bold mb-1">Review Listing</h2>
            <p className="text-sm text-muted-foreground mb-6">Confirm the details before publishing your listing.</p>

            <div className="space-y-4">
              {/* Battery Summary */}
              <div className="bg-secondary/20 rounded-lg p-4 border border-border">
                <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-2">Battery</div>
                <div className="font-mono text-primary text-sm">{selectedBpan}</div>
                {selectedBattery && (
                  <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                    <span>{selectedBattery.chemistry}</span>
                    <span>{selectedBattery.capacityKwh} kWh</span>
                    <span>SOH: {Number(selectedBattery.currentSoh ?? 0).toFixed(1)}%</span>
                  </div>
                )}
              </div>

              {/* Pricing Summary */}
              <div className="bg-secondary/20 rounded-lg p-4 border border-border">
                <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-2">Pricing</div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-muted-foreground">Listing Type</div>
                    <div className="text-sm capitalize">{listingType.replace(/_/g, " ")}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Asking Price</div>
                    <div className="text-sm font-display font-bold">
                      {askingPrice > 0 ? `${selectedCurrencyMeta?.symbol ?? ""}${askingPrice.toLocaleString()} ${currency}` : "Market Price"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Condition Summary */}
              {(conditionGrade || location) && (
                <div className="bg-secondary/20 rounded-lg p-4 border border-border">
                  <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-2">Condition & Location</div>
                  <div className="grid grid-cols-2 gap-4">
                    {conditionGrade && (
                      <div>
                        <div className="text-xs text-muted-foreground">Condition</div>
                        <div className="text-sm capitalize">{conditionGrade}</div>
                      </div>
                    )}
                    {location && (
                      <div>
                        <div className="text-xs text-muted-foreground">Location</div>
                        <div className="text-sm">{location}</div>
                      </div>
                    )}
                  </div>
                  {conditionNotes && (
                    <div className="mt-2">
                      <div className="text-xs text-muted-foreground">Notes</div>
                      <div className="text-sm text-muted-foreground">{conditionNotes}</div>
                    </div>
                  )}
                </div>
              )}

              {/* Description */}
              {description && (
                <div className="bg-secondary/20 rounded-lg p-4 border border-border">
                  <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-2">Description</div>
                  <p className="text-sm text-muted-foreground">{description}</p>
                </div>
              )}

              {/* Photos Summary */}
              {photos.length > 0 && (
                <div className="bg-secondary/20 rounded-lg p-4 border border-border">
                  <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-2">Photos ({photos.length})</div>
                  <div className="flex gap-2">
                    {photos.map((p, i) => (
                      <div key={p.id} className="w-16 h-16 rounded-lg overflow-hidden border border-border relative">
                        <img src={p.preview} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                        {i === 0 && <div className="absolute bottom-0 left-0 right-0 bg-primary/80 text-[8px] text-center text-primary-foreground">Primary</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-between mt-6">
              <Button variant="outline" onClick={() => setStep(3)}>Back</Button>
              <Button
                onClick={handleSubmit}
                disabled={createMutation.isPending}
                className="bg-primary text-primary-foreground min-w-[160px]"
              >
                {createMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Publishing...</>
                ) : (
                  <><Upload className="w-4 h-4 mr-2" /> Publish Listing</>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Step 5: Success */}
        {step === 5 && (
          <div className="bg-card border border-border rounded-xl p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-primary" />
            </div>
            <h2 className="font-display text-2xl font-bold mb-2">Listing Published!</h2>
            <p className="text-muted-foreground mb-6">
              Your battery <span className="font-mono text-primary">{selectedBpan}</span> is now live on the marketplace.
            </p>

            {photos.length > 0 && (
              <div className="mb-6">
                <div className="text-sm text-muted-foreground mb-2">Photo Upload Status</div>
                <div className="flex justify-center gap-2">
                  {photos.map((p) => (
                    <div key={p.id} className="flex items-center gap-1">
                      {p.uploaded ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : p.error ? (
                        <AlertTriangle className="w-4 h-4 text-red-400" />
                      ) : p.uploading ? (
                        <Loader2 className="w-4 h-4 text-primary animate-spin" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-border" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={() => navigate("/marketplace")}>
                View Marketplace
              </Button>
              <Button onClick={() => {
                setStep(1);
                setSelectedBatteryId(null);
                setSelectedBpan("");
                setListingType("second_life_pack");
                setAskingPrice(0);
                setDescription("");
                setConditionGrade("");
                setConditionNotes("");
                setLocation("");
                setPhotos([]);
                setCreatedListingId(null);
              }} className="bg-primary text-primary-foreground">
                List Another Battery
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data URL prefix (e.g., "data:image/jpeg;base64,")
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
