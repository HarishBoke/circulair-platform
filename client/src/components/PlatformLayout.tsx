import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard, Battery, Activity, Brain, ShoppingCart,
  Truck, Shield, BarChart3, Bell, MessageSquare, FileText,
  FlaskConical, Wrench, ChevronLeft, ChevronRight, LogOut,
  User, Settings, Zap, Menu, X, Search
} from "lucide-react";

const NAV_SECTIONS = [
  {
    label: "OVERVIEW",
    items: [
      { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
    ],
  },
  {
    label: "BATTERY MANAGEMENT",
    items: [
      { icon: Battery, label: "BPAN Registry", href: "/batteries" },
      { icon: Activity, label: "IoT Telemetry", href: "/telemetry" },
      { icon: Wrench, label: "Service History", href: "/service-history" },
    ],
  },
  {
    label: "AI & INTELLIGENCE",
    items: [
      { icon: Brain, label: "AI SOH Prediction", href: "/ai-soh" },
      { icon: MessageSquare, label: "AI Assistant", href: "/assistant" },
    ],
  },
  {
    label: "MARKETPLACE",
    items: [
      { icon: ShoppingCart, label: "Marketplace", href: "/marketplace" },
      { icon: Truck, label: "Logistics", href: "/logistics" },
    ],
  },
  {
    label: "COMPLIANCE",
    items: [
      { icon: Shield, label: "EPR Compliance", href: "/epr-compliance" },
      { icon: FlaskConical, label: "Yield Verification", href: "/yield-verification" },
    ],
  },
  {
    label: "REPORTING",
    items: [
      { icon: BarChart3, label: "Analytics", href: "/analytics" },
      { icon: FileText, label: "Documents", href: "/documents" },
      { icon: Bell, label: "Alerts", href: "/alerts", badge: true },
    ],
  },
];

const ROLE_LABELS: Record<string, string> = {
  admin: "Platform Admin",
  oem: "OEM",
  manufacturer: "Manufacturer",
  recycler: "Recycler",
  bess_developer: "BESS Developer",
  service_provider: "Service Provider",
  government: "Government",
};

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, loading, isAuthenticated, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const { data: unreadCount } = trpc.alerts.unreadCount.useQuery(undefined, {
    refetchInterval: 30000,
    enabled: isAuthenticated,
  });

  useEffect(() => {
    setMobileOpen(false);
  }, [location]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-chart-2 flex items-center justify-center animate-pulse-glow">
            <Zap className="w-6 h-6 text-primary-foreground" />
          </div>
          <p className="text-muted-foreground font-mono text-sm">Loading Circul-AI-r...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden">
        <div className="bg-grid" />
        <div className="bg-glow1" />
        <div className="bg-glow2" />
        <div className="relative z-10 text-center max-w-md px-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-chart-2 flex items-center justify-center mx-auto mb-6 animate-pulse-glow">
            <Zap className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="font-display text-3xl font-bold mb-2">
            Circul<span className="text-primary">-AI-</span>r
          </h1>
          <p className="text-muted-foreground mb-8 text-sm leading-relaxed">
            Battery Intelligence Platform for India's circular economy. Sign in to access the BPAN registry, AI analytics, and compliance tools.
          </p>
          <Button
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
            onClick={() => window.location.href = getLoginUrl()}
          >
            Sign In to Platform
          </Button>
        </div>
      </div>
    );
  }

  const platformRole = (user as any)?.platformRole ?? "oem";

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-border">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-chart-2 flex items-center justify-center flex-shrink-0 animate-pulse-glow">
          <Zap className="w-4 h-4 text-primary-foreground" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <div className="font-display text-sm font-bold leading-tight">
              Circul<span className="text-primary">-AI-</span>r
            </div>
            <div className="font-mono text-[9px] text-muted-foreground tracking-widest uppercase">
              Battery Intelligence
            </div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label} className="mb-2">
            {!collapsed && (
              <div className="font-mono text-[9px] text-muted-foreground/60 tracking-widest uppercase px-2 py-1.5">
                {section.label}
              </div>
            )}
            {section.items.map((item) => {
              const isActive = location === item.href || (item.href !== "/dashboard" && location.startsWith(item.href));
              return (
                <Link key={item.href} href={item.href}>
                  <div className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all cursor-pointer group relative ${
                    isActive
                      ? "bg-primary/10 text-primary border border-primary/20"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground border border-transparent"
                  }`}>
                    <item.icon className={`w-4 h-4 flex-shrink-0 ${isActive ? "text-primary" : "group-hover:text-foreground"}`} />
                    {!collapsed && (
                      <span className="truncate">{item.label}</span>
                    )}
                    {!collapsed && item.badge && (unreadCount ?? 0) > 0 && (
                      <Badge className="ml-auto bg-destructive text-destructive-foreground text-[9px] px-1.5 py-0 h-4 min-w-4 flex items-center justify-center">
                        {unreadCount}
                      </Badge>
                    )}
                    {collapsed && item.badge && (unreadCount ?? 0) > 0 && (
                      <span className="absolute -top-1 -right-1 w-3 h-3 bg-destructive rounded-full" />
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* User & Footer */}
      <div className="border-t border-border p-3 space-y-2">
        {!collapsed && (
          <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg bg-secondary/50">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-chart-2 to-chart-3 flex items-center justify-center flex-shrink-0 text-xs font-bold text-white">
              {user?.name?.charAt(0)?.toUpperCase() ?? "U"}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-medium truncate">{user?.name ?? "User"}</div>
              <div className="font-mono text-[9px] text-primary truncate">
                {ROLE_LABELS[platformRole] ?? platformRole}
              </div>
            </div>
          </div>
        )}
        <button
          onClick={() => logout()}
          className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all ${collapsed ? "justify-center" : ""}`}
        >
          <LogOut className="w-3.5 h-3.5 flex-shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <div className="bg-grid" />
      <div className="bg-glow1" />
      <div className="bg-glow2" />

      {/* Desktop Sidebar */}
      <aside className={`relative z-20 hidden lg:flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300 ${collapsed ? "w-16" : "w-56"}`}>
        <SidebarContent />
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-sidebar border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary transition-all z-10"
        >
          {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </button>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-sidebar border-r border-sidebar-border z-50">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        {/* Topbar */}
        <header className="flex items-center justify-between h-14 px-4 lg:px-6 border-b border-border bg-background/80 backdrop-blur-sm flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden p-1.5 rounded-lg hover:bg-secondary transition-colors"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden sm:flex items-center gap-2 bg-secondary/50 border border-border rounded-lg px-3 py-1.5 w-64">
              <Search className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              <input
                placeholder="Search BPAN, battery..."
                className="bg-transparent text-xs outline-none w-full text-foreground placeholder:text-muted-foreground font-mono"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const val = (e.target as HTMLInputElement).value.trim();
                    if (val.length === 21) window.location.href = `/batteries/${val}`;
                  }
                }}
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 bg-primary/10 border border-primary/20 rounded-full px-3 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-blink" />
              <span className="font-mono text-[10px] text-primary">LIVE</span>
            </div>
            <Link href="/alerts">
              <button className="relative p-2 rounded-lg hover:bg-secondary transition-colors">
                <Bell className="w-4 h-4 text-muted-foreground" />
                {(unreadCount ?? 0) > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-destructive rounded-full text-[9px] text-white flex items-center justify-center font-bold">
                    {unreadCount}
                  </span>
                )}
              </button>
            </Link>
            <Link href="/assistant">
              <button className="p-2 rounded-lg hover:bg-secondary transition-colors">
                <MessageSquare className="w-4 h-4 text-muted-foreground" />
              </button>
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
