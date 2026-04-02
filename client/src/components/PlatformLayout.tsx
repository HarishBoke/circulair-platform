import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";

import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import CirculairLogo from "@/components/CirculairLogo";
import { Button } from "@/components/ui/button";

import {
  LayoutDashboard, Battery, Activity, Brain, ShoppingCart,
  Truck, Shield, BarChart3, Bell, MessageSquare, FileText,
  FlaskConical, Wrench, ChevronLeft, ChevronRight, LogOut,
  User, Settings, Menu, X, Search, Database, Radio, Users, Globe, Settings2,
  ArrowRight, Lock, Cpu, Landmark, ShieldCheck, Upload, BookOpen, Rocket
} from "lucide-react";
import { LanguageSelector } from "@/components/LanguageSelector";

function useNavSections() {
  return [
    {
      label: "OVERVIEW",
      sectionKey: "OVERVIEW",
      items: [
        { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
      ],
    },
    {
      label: "BATTERY MANAGEMENT",
      sectionKey: "BATTERY_MGMT",
      items: [
        { icon: Battery, label: "BPAN Registry", href: "/batteries" },
        { icon: Activity, label: "IoT Telemetry", href: "/telemetry" },
        { icon: Wrench, label: "Service History", href: "/service-history" },
      ],
    },
    {
      label: "AI & INTELLIGENCE",
      sectionKey: "AI",
      items: [
        { icon: Brain, label: "AI SOH Prediction", href: "/ai-soh" },
        { icon: MessageSquare, label: "AI Assistant", href: "/assistant" },
      ],
    },
    {
      label: "WARRANTY & ONBOARDING",
      sectionKey: "WARRANTY",
      items: [
        { icon: ShieldCheck, label: "Warranty Management", href: "/warranty" },
        { icon: Upload, label: "Bulk Onboarding", href: "/onboarding" },
      ],
    },
    {
      label: "MARKETPLACE",
      sectionKey: "MARKETPLACE",
      items: [
        { icon: ShoppingCart, label: "Marketplace", href: "/marketplace" },
        { icon: Truck, label: "Logistics", href: "/logistics" },
      ],
    },
    {
      label: "COMPLIANCE",
      sectionKey: "COMPLIANCE",
      items: [
        { icon: Shield, label: "EPR Compliance", href: "/epr-compliance" },
        { icon: FlaskConical, label: "Yield Verification", href: "/yield-verification" },
        { icon: Globe, label: "Compliance Dashboard", href: "/compliance" },
      ],
    },
    {
      label: "REPORTING",
      sectionKey: "REPORTING",
      items: [
        { icon: BarChart3, label: "Analytics", href: "/analytics" },
        { icon: FileText, label: "Documents", href: "/documents" },
        { icon: Bell, label: "Alerts", href: "/alerts", badge: true },
      ],
    },
    {
      label: "INTEGRATIONS",
      sectionKey: "INTEGRATIONS",
      items: [
        { icon: Database, label: "Data Integration", href: "/data-integration" },
        { icon: Radio, label: "MQTT Flow Tester", href: "/mqtt-flow-tester" },
      ],
    },
    {
      label: "KNOWLEDGE",
      sectionKey: "KNOWLEDGE",
      items: [
        { icon: Rocket, label: "Getting Started", href: "/getting-started" },
        { icon: BookOpen, label: "CirculWiki", href: "/wiki" },
      ],
    },
    {
      label: "ADMIN",
      sectionKey: "ADMIN",
      items: [
        { icon: Users, label: "User Management", href: "/admin/users" },
        { icon: Cpu, label: "Super Admin", href: "/admin/system" },
        { icon: MessageSquare, label: "Feedback Review", href: "/admin/feedback" },
        { icon: Settings2, label: "Platform Settings", href: "/settings/platform" },
      ],
    },
  ];
}

const ROLE_LABELS: Record<string, string> = {
  admin: "Platform Admin",
  oem: "OEM",
  manufacturer: "Manufacturer",
  recycler: "Recycler",
  bess_developer: "BESS Developer",
  service_provider: "Service Provider",
  government: "Government",
};

/* ─── AUTH SCREEN ──────────────────────────────────────────────────────────── */
function AuthScreen() {
  return (
    <div className="min-h-screen bg-background flex relative overflow-hidden">
      <div className="bg-grid" />
      <div className="bg-glow1" />
      <div className="bg-glow2" />

      {/* Left side — branding & features */}
      <div className="hidden lg:flex flex-col justify-center flex-1 relative z-10 px-12 xl:px-20">
        <div className="max-w-lg">
          <div className="flex items-center gap-3 mb-8">
            <CirculairLogo size={36} />
            <div>
              <div className="font-display text-2xl font-bold leading-tight">
                Circul<span className="text-primary">-AI-</span>r
              </div>
              <div className="font-mono text-[10px] text-muted-foreground tracking-widest uppercase">Battery Intelligence Platform</div>
            </div>
          </div>

          <h1 className="font-display text-4xl font-bold mb-4 leading-tight">
            The Operating System for{" "}
            <span className="text-primary">Battery Circular Economy</span>
          </h1>
          <p className="text-muted-foreground text-lg leading-relaxed mb-10">
            End-to-end traceability, AI-driven health prediction, and regulatory compliance across 7 jurisdictions.
          </p>

          <div className="space-y-4">
            {[
              { icon: Battery, title: "Battery Registry", desc: "21-character BPAN generation with QR codes and lifecycle tracking" },
              { icon: Brain, title: "AI SOH Prediction", desc: "CNN-LSTM models with less than 2% RMSE for health estimation" },
              { icon: Shield, title: "Regulatory Compliance", desc: "EU Battery Passport, India BWMR, China MIIT adapters" },
              { icon: ShoppingCart, title: "Second-Life Marketplace", desc: "Multi-currency marketplace with dynamic spot pricing" },
            ].map((feature) => (
              <div key={feature.title} className="flex items-start gap-3 group">
                <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                  <feature.icon className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <div className="text-sm font-semibold mb-0.5">{feature.title}</div>
                  <div className="text-xs text-muted-foreground">{feature.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right side — sign in card */}
      <div className="flex-1 flex items-center justify-center relative z-10 px-6">
        <div className="w-full max-w-md">
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-2xl shadow-primary/5">
            {/* Top accent */}
            <div className="h-1 bg-gradient-to-r from-primary via-chart-2 to-primary" />

            <div className="p-8">
              {/* Mobile logo */}
              <div className="lg:hidden flex items-center gap-3 mb-8">
                <CirculairLogo size={30} />
                <div>
                  <div className="font-display text-lg font-bold leading-tight">
                    Circul<span className="text-primary">-AI-</span>r
                  </div>
                  <div className="font-mono text-[9px] text-muted-foreground tracking-widest uppercase">Battery Intelligence</div>
                </div>
              </div>

              <h2 className="font-display text-2xl font-bold mb-2">Welcome Back</h2>
              <p className="text-muted-foreground text-sm mb-8">
                Sign in to access the battery intelligence platform, manage your fleet, and track compliance.
              </p>

              <Button
                className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-sm font-semibold"
                onClick={() => window.location.href = "/login"}
              >
                Sign In to Platform <ArrowRight className="w-4 h-4 ml-2" />
              </Button>

              <div className="mt-6 pt-6 border-t border-border/50">
                <div className="flex items-center justify-center gap-6 text-muted-foreground">
                  {[
                    { icon: Lock, label: "Encrypted" },
                    { icon: Globe, label: "Multi-Region" },
                    { icon: Shield, label: "RBAC" },
                  ].map((badge) => (
                    <div key={badge.label} className="flex items-center gap-1.5">
                      <badge.icon className="w-3 h-3 text-primary/60" />
                      <span className="font-mono text-[9px] tracking-wider uppercase">{badge.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <p className="text-center text-[10px] text-muted-foreground mt-4 font-mono">
            Role-based access for OEM, Manufacturer, Recycler, BESS Developer, Government
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─── LOADING SCREEN ───────────────────────────────────────────────────────── */
function LoadingScreen() {
  return (
    <div className="flex items-center justify-center h-screen bg-background">
      <div className="flex flex-col items-center gap-4">
        <CirculairLogo size={36} />
        <div className="space-y-1 text-center">
          <p className="text-muted-foreground font-mono text-sm">Loading Circul-AI-r...</p>
          <div className="w-32 h-1 bg-secondary rounded-full overflow-hidden mx-auto">
            <div className="h-full bg-primary rounded-full animate-pulse" style={{ width: "60%" }} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── MAIN LAYOUT ──────────────────────────────────────────────────────────── */
export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, loading, isAuthenticated, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const NAV_SECTIONS = useNavSections();

  const { data: unreadCount } = trpc.alerts.unreadCount.useQuery(undefined, {
    refetchInterval: 30000,
    enabled: isAuthenticated,
  });

  useEffect(() => {
    setMobileOpen(false);
  }, [location]);

  if (loading) return <LoadingScreen />;
  if (!isAuthenticated) return <AuthScreen />;

  const platformRole = (user as any)?.platformRole ?? "oem";
  const isAdmin = (user as any)?.role === "admin";

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-border">
        <CirculairLogo size={24} className="flex-shrink-0" />
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
        {NAV_SECTIONS.map((section) => {
          // Filter admin items for non-admin users
          const items = section.sectionKey === "ADMIN" && !isAdmin
            ? section.items.filter((item) => item.href !== "/admin/users" && item.href !== "/admin/system")
            : section.items;
          if (items.length === 0) return null;

          return (
            <div key={section.sectionKey} className="mb-2">
              {!collapsed && (
                <div className="font-mono text-[9px] text-muted-foreground/60 tracking-widest uppercase px-2 py-1.5">
                  {section.sectionKey}
                </div>
              )}
              {items.map((item) => {
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
                      {!collapsed && (item as any).badge && (unreadCount ?? 0) > 0 && (
                        <Badge className="ml-auto bg-destructive text-destructive-foreground text-[9px] px-1.5 py-0 h-4 min-w-4 flex items-center justify-center">
                          {unreadCount}
                        </Badge>
                      )}
                      {collapsed && (item as any).badge && (unreadCount ?? 0) > 0 && (
                        <span className="absolute -top-1 -right-1 w-3 h-3 bg-destructive rounded-full" />
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          );
        })}
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
        {!collapsed && (
          <div className="px-1">
            <LanguageSelector />
          </div>
        )}
        {!collapsed && (
          <div className="flex items-center gap-3 px-1 pb-0.5">
            <a href="/privacy" className="text-[10px] text-muted-foreground hover:text-foreground transition-colors font-mono">Privacy</a>
            <span className="text-muted-foreground/30 text-[10px]">·</span>
            <button
              onClick={() => window.dispatchEvent(new Event("openCookieConsent"))}
              className="text-[10px] text-muted-foreground hover:text-foreground transition-colors font-mono cursor-pointer"
            >
              Cookies
            </button>
          </div>
        )}
        <button
          onClick={() => logout()}
          className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all ${collapsed ? "justify-center" : ""}`}
        >
          <LogOut className="w-3.5 h-3.5 flex-shrink-0" />
          {!collapsed && <span>{"Sign Out"}</span>}
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
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-secondary text-muted-foreground"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden sm:flex items-center gap-2 bg-secondary/50 rounded-lg px-3 py-1.5">
              <Search className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Search batteries, BPANs...</span>
              <kbd className="hidden md:inline text-[9px] text-muted-foreground bg-background border border-border rounded px-1.5 py-0.5 font-mono ml-4">Ctrl+K</kbd>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/alerts">
              <button className="relative p-2 rounded-lg hover:bg-secondary text-muted-foreground transition-colors">
                <Bell className="w-4 h-4" />
                {(unreadCount ?? 0) > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-destructive rounded-full flex items-center justify-center text-[8px] text-white font-bold">
                    {unreadCount}
                  </span>
                )}
              </button>
            </Link>
            <Link href="/settings/platform">
              <button className="p-2 rounded-lg hover:bg-secondary text-muted-foreground transition-colors">
                <Settings className="w-4 h-4" />
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
