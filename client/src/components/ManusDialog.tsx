import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArrowRight, Shield, Globe, Battery } from "lucide-react";
import CirculairLogo from "@/components/CirculairLogo";

interface ManusDialogProps {
  title?: string;
  logo?: string;
  open?: boolean;
  onLogin: () => void;
  onOpenChange?: (open: boolean) => void;
  onClose?: () => void;
}

export function ManusDialog({
  title,
  logo,
  open = false,
  onLogin,
  onOpenChange,
  onClose,
}: ManusDialogProps) {
  const [internalOpen, setInternalOpen] = useState(open);

  useEffect(() => {
    if (!onOpenChange) {
      setInternalOpen(open);
    }
  }, [open, onOpenChange]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (onOpenChange) {
      onOpenChange(nextOpen);
    } else {
      setInternalOpen(nextOpen);
    }
    if (!nextOpen) {
      onClose?.();
    }
  };

  return (
    <Dialog
      open={onOpenChange ? open : internalOpen}
      onOpenChange={handleOpenChange}
    >
      <DialogContent className="py-0 bg-card border-border rounded-2xl w-[420px] max-w-[95vw] shadow-2xl shadow-primary/5 p-0 gap-0 text-center overflow-hidden">
        {/* Top accent bar */}
        <div className="h-1 bg-gradient-to-r from-primary via-chart-2 to-primary" />

        <div className="flex flex-col items-center gap-3 p-6 pt-8">
          {/* Logo */}
          <div className="flex items-center justify-center">
            {logo ? (
              <img src={logo} alt="Platform logo" className="w-16 h-16 rounded-lg" />
            ) : (
              <CirculairLogo size={56} />
            )}
          </div>

          {/* Branding */}
          <div>
            <DialogTitle className="font-display text-xl font-bold text-foreground leading-tight">
              {title || (
                <>Circul<span className="text-primary">-AI-</span>r</>
              )}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-1">
              Battery Intelligence Platform
            </DialogDescription>
          </div>

          {/* Trust badges */}
          <div className="flex items-center gap-4 mt-2">
            {[
              { icon: Shield, label: "Secure" },
              { icon: Globe, label: "Multi-Region" },
              { icon: Battery, label: "IoT Ready" },
            ].map((badge) => (
              <div key={badge.label} className="flex items-center gap-1.5 text-muted-foreground">
                <badge.icon className="w-3 h-3 text-primary/60" />
                <span className="font-mono text-[9px] tracking-wider uppercase">{badge.label}</span>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter className="px-6 py-5 bg-secondary/30 border-t border-border/50">
          <div className="w-full space-y-3">
            <Button
              onClick={onLogin}
              className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-sm font-semibold"
            >
              Sign In to Platform <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <p className="text-[10px] text-muted-foreground font-mono">
              Enterprise-grade authentication with role-based access control
            </p>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
