import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import CirculairLogo from "@/components/CirculairLogo";
import { Button } from "@/components/ui/button";
import { LanguageSelector } from "@/components/LanguageSelector";

import {
  LayoutDashboard, Battery, Activity, Brain, ShoppingCart,
  Truck, Shield, BarChart3, Bell, MessageSquare, FileText,
  FlaskConical, Wrench, ChevronLeft, ChevronRight, LogOut,
  Settings, Menu, Search, Database, Users, Globe,
  ArrowRight, Lock, Cpu, ShieldCheck, Upload, BookOpen, Rocket,
  GitBranch, Leaf, Network, Code2, Zap, TrendingUp, Bot,
  ListChecks, Package, Settings2, Radio, AlertTriangle, HeartPulse, Sun, Moon
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

/* ─── NAV STRUCTURE ────────────────────────────────────────────────────────────
 * Consolidated from 15 sections → 7 clean groups.
 * Only features that are fully wired and working are shown.
 * Advanced / experimental features are grouped under "Advanced" to reduce noise.
 * ─────────────────────────────────────────────────────────────────────────── */
function useNavSections(isAdmin: boolean) {
  return [
    {
      label: "CORE",
      sectionKey: "CORE",
      items: [
        { icon: LayoutDashboard, label: "Dashboard",        href: "/dashboard" },
        { icon: Battery,         label: "Battery Registry", href: "/batteries" },
        { icon: Activity,        label: "IoT Telemetry",    href: "/telemetry" },
        { icon: Brain,           label: "AI SOH Prediction",href: "/ai-soh" },
        { icon: MessageSquare,   label: "AI Assistant",     href: "/assistant" },
      ],
    },
    {
      label: "OPERATIONS",
      sectionKey: "OPERATIONS",
      items: [
        { icon: ShieldCheck,  label: "Warranty",          href: "/warranty" },
        { icon: Wrench,       label: "Service History",   href: "/service-history" },
        { icon: Upload,       label: "Bulk Onboarding",   href: "/onboarding" },
        { icon: Bot,          label: "Autonomous Triage", href: "/autonomous-triage" },
        { icon: ListChecks,   label: "Triage Queue",      href: "/autonomous-triage/queue" },
      ],
    },
    {
      label: "MARKETPLACE",
      sectionKey: "MARKETPLACE",
      items: [
        { icon: ShoppingCart, label: "Marketplace",  href: "/marketplace" },
        { icon: Truck,        label: "Logistics",    href: "/logistics" },
        { icon: TrendingUp,   label: "Procurement",  href: "/predictive-procurement" },
      ],
    },
    {
      label: "COMPLIANCE",
      sectionKey: "COMPLIANCE",
      items: [
        { icon: Shield,       label: "EPR Compliance",    href: "/epr-compliance" },
        { icon: FlaskConical, label: "Yield Verification",href: "/yield-verification" },
        { icon: Globe,        label: "Compliance Hub",    href: "/compliance" },
      ],
    },
    {
      label: "INSIGHTS",
      sectionKey: "INSIGHTS",
      items: [
        { icon: BarChart3,      label: "Analytics",    href: "/analytics" },
        { icon: Bell,           label: "Alerts",       href: "/alerts", badge: true },
        { icon: FileText,       label: "Documents",    href: "/documents" },
        { icon: AlertTriangle,  label: "Alert Rules",  href: "/alert-rules" },
      ],
    },
    {
      label: "DEVELOPER",
      sectionKey: "DEVELOPER",
      items: [
        { icon: Rocket,   label: "Getting Started",  href: "/getting-started" },
        { icon: BookOpen, label: "API Reference",    href: "/api-reference" },
        { icon: Network,  label: "MCP Server",       href: "/mcp-server" },
        { icon: Code2,    label: "Developer Portal", href: "/developer-portal" },
        { icon: Database, label: "Data Integration", href: "/data-integration" },
        { icon: Radio,    label: "MQTT Tester",      href: "/mqtt-flow-tester" },
      ],
    },
    ...(isAdmin ? [{
      label: "ADMIN",
      sectionKey: "ADMIN",
      items: [
        { icon: HeartPulse, label: "Health Portal",       href: "/health" },
        { icon: Users,    label: "User Management",     href: "/admin/users" },
        { icon: Cpu,      label: "Super Admin",         href: "/admin/system" },
        { icon: Settings2,label: "Platform Settings",   href: "/settings/platform" },
        { icon: MessageSquare, label: "Feedback Review",href: "/admin/feedback" },
      ],
    }] : []),
    {
      label: "ADVANCED",
      sectionKey: "ADVANCED",
      collapsible: true,
      items: [
        { icon: GitBranch, label: "Digital Twin",       href: "/digital-twin" },
        { icon: Leaf,      label: "Carbon Accounting",  href: "/carbon-accounting" },
        { icon: Network,   label: "Federated Learning", href: "/federated-learning" },
        { icon: Zap,       label: "Solid-State",        href: "/solid-state" },
        { icon: BookOpen,  label: "CirculWiki",         href: "/wiki" },
      ],
    },
  ];
}

const ROLE_LABELS: Record<string, string> = {
  admin:            "Platform Admin",
  oem:              "OEM",
  manufacturer:     "Manufacturer",
  recycler:         "Recycler",
  bess_developer:   "BESS Developer",
  service_provider: "Service Provider",
  government:       "Government",
};

/* ─── AUTH SCREEN ──────────────────────────────────────────────────────────── */
function AuthScreen() {
  return (
    <div className="min-h-screen bg-background flex relative overflow-hidden">
      <div className="bg-grid" />
      <div className="bg-glow1" />
      <div className="bg-glow2" />

      {/* Left — branding */}
      <div className="hidden lg:flex flex-col justify-center flex-1 relative z-10 px-12 xl:px-20">
        <div className="max-w-lg">
          <Link href="/" aria-label="Back to home" className="flex items-center gap-3 mb-8 group w-fit">
            <CirculairLogo size={36} className="group-hover:opacity-80 transition-opacity" />
            <div>
              <div className="font-display text-2xl font-bold leading-tight group-hover:text-primary transition-colors">
                Circul<span className="text-primary">-AI-</span>r
              </div>
              <div className="font-mono text-[10px] text-muted-foreground tracking-widest uppercase">Battery Intelligence Platform</div>
            </div>
          </Link>

          <h1 className="font-display text-4xl font-bold mb-4 leading-tight">
            The Operating System for{" "}
            <span className="text-primary">Battery Circular Economy</span>
          </h1>
          <p className="text-muted-foreground text-lg leading-relaxed mb-10">
            End-to-end traceability, AI-driven health prediction, and regulatory compliance across 7 jurisdictions.
          </p>

          <div className="space-y-4">
            {[
              { icon: Battery,      title: "Battery Registry",    desc: "21-character BPAN generation with QR codes and lifecycle tracking" },
              { icon: Brain,        title: "AI SOH Prediction",   desc: "CNN-LSTM models with less than 2% RMSE for health estimation" },
              { icon: Shield,       title: "Regulatory Compliance", desc: "EU Battery Passport, India BWMR, China MIIT adapters" },
              { icon: ShoppingCart, title: "Second-Life Marketplace", desc: "Multi-currency marketplace with dynamic spot pricing" },
            ].map((feature) => (
              <div key={feature.title} className="flex items-start gap-3 group">
                <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                  <feature.icon className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <div className="text-sm font-semibold mb-0.5">{feature.title}</div>
                  <div className="text-sm text-muted-foreground">{feature.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right — sign-in card */}
      <div className="flex-1 flex items-center justify-center relative z-10 px-6">
        <div className="w-full max-w-md">
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-2xl shadow-black/40">
            <div className="h-1 bg-gradient-to-r from-primary via-chart-2 to-primary" />
            <div className="p-8">
              <Link href="/" aria-label="Back to home" className="lg:hidden flex items-center gap-3 mb-8 group w-fit">
                <CirculairLogo size={30} className="group-hover:opacity-80 transition-opacity" />
                <div>
                  <div className="font-display text-lg font-bold leading-tight group-hover:text-primary transition-colors">
                    Circul<span className="text-primary">-AI-</span>r
                  </div>
                  <div className="font-mono text-[9px] text-muted-foreground tracking-widest uppercase">Battery Intelligence</div>
                </div>
              </Link>

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
                    { icon: Lock,   label: "Encrypted" },
                    { icon: Globe,  label: "Multi-Region" },
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

/* ─── SIDEBAR NAV ITEM ─────────────────────────────────────────────────────── */
function NavItem({
  icon: Icon, label, href, badge, badgeCount, collapsed, isActive,
}: {
  icon: React.ElementType; label: string; href: string;
  badge?: boolean; badgeCount?: number; collapsed: boolean; isActive: boolean;
}) {
  return (
    <Link href={href} aria-current={isActive ? "page" : undefined}>
      <div
        title={collapsed ? label : undefined}
        className={`
          flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[13px] font-medium
          transition-all duration-150 cursor-pointer group relative
          ${isActive
            ? "bg-secondary text-foreground"
            : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
          }
        `}
      >
        {/* Active indicator bar */}
        {isActive && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary rounded-r-full" aria-hidden="true" />
        )}
        <Icon
          className={`w-4 h-4 flex-shrink-0 transition-colors ${isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"}`}
          aria-hidden="true"
        />
        {!collapsed && (
          <>
            <span className="truncate flex-1">{label}</span>
            {badge && (badgeCount ?? 0) > 0 && (
              <Badge className="ml-auto bg-destructive text-white text-[9px] px-1.5 py-0 h-4 min-w-4 flex items-center justify-center rounded-full">
                {badgeCount}
              </Badge>
            )}
          </>
        )}
        {collapsed && badge && (badgeCount ?? 0) > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-destructive rounded-full border border-sidebar" aria-hidden="true" />
        )}
      </div>
    </Link>
  );
}

/* ─── COLLAPSIBLE SECTION ──────────────────────────────────────────────────── */
function NavSection({
  section, location, unreadCount, collapsed, sidebarCollapsed,
}: {
  section: ReturnType<typeof useNavSections>[number];
  location: string;
  unreadCount: number;
  collapsed: boolean;
  sidebarCollapsed: boolean;
}) {
  const [open, setOpen] = useState(!("collapsible" in section && section.collapsible));
  const hasActive = section.items.some(
    (item) => location === item.href || (item.href !== "/dashboard" && location.startsWith(item.href))
  );

  // Auto-open if an item in this section is active
  useEffect(() => {
    if (hasActive) setOpen(true);
  }, [hasActive]);

  const isCollapsible = "collapsible" in section && section.collapsible;

  return (
    <div className="mb-1">
      {/* Section label */}
      {!sidebarCollapsed && (
        <button
          onClick={isCollapsible ? () => setOpen(!open) : undefined}
          className={`
            w-full flex items-center justify-between px-2.5 py-1.5 mb-0.5
            font-mono text-[10px] tracking-widest uppercase
            text-muted-foreground/50 hover:text-muted-foreground
            transition-colors
            ${isCollapsible ? "cursor-pointer" : "cursor-default"}
          `}
          aria-expanded={isCollapsible ? open : undefined}
        >
          <span>{section.label}</span>
          {isCollapsible && (
            <ChevronRight
              className={`w-3 h-3 transition-transform ${open ? "rotate-90" : ""}`}
              aria-hidden="true"
            />
          )}
        </button>
      )}

      {/* Items */}
      {(open || sidebarCollapsed) && (
        <div className="space-y-0.5">
          {section.items.map((item) => {
            const isActive = location === item.href || (item.href !== "/dashboard" && location.startsWith(item.href));
            return (
              <NavItem
                key={item.href}
                icon={item.icon}
                label={item.label}
                href={item.href}
                badge={"badge" in item ? item.badge : undefined}
                badgeCount={unreadCount}
                collapsed={sidebarCollapsed}
                isActive={isActive}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── MAIN LAYOUT ──────────────────────────────────────────────────────────── */
/* ─── THEME TOGGLE BUTTON ─────────────────────────────────────────────────── */
function ThemeToggleButton() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      onClick={(e) => toggleTheme?.(e)}
      className="relative p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors overflow-hidden group"
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
    >
      {/* Icon cross-fade animation */}
      <span
        key={theme}
        className="block transition-all duration-300 ease-in-out"
        style={{
          animation: "theme-icon-in 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) both",
        }}
      >
        {theme === "dark" ? <Sun className="w-4 h-4" aria-hidden="true" /> : <Moon className="w-4 h-4" aria-hidden="true" />}
      </span>
    </button>
  );
}

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, loading, isAuthenticated, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isAdmin = (user as any)?.role === "admin";
  const platformRole = (user as any)?.platformRole ?? "oem";
  const NAV_SECTIONS = useNavSections(isAdmin);

  const { data: unreadCount } = trpc.alerts.unreadCount.useQuery(undefined, {
    refetchInterval: 30000,
    enabled: isAuthenticated,
  });

  useEffect(() => { setMobileOpen(false); }, [location]);

  // Track whether the main content area has been scrolled — used to show header shadow
  const [scrolled, setScrolled] = useState(false);
  const mainRef = useRef<HTMLElement>(null);
  const handleScroll = useCallback(() => {
    setScrolled((mainRef.current?.scrollTop ?? 0) > 4);
  }, []);

  if (loading) return <LoadingScreen />;
  if (!isAuthenticated) return <AuthScreen />;

  /* ── Sidebar inner content ── */
  const SidebarContent = ({ isMobile = false }: { isMobile?: boolean }) => (
    <div className="flex flex-col h-full">
      {/* Logo row — clicking navigates back to the landing page */}
      <div className={`flex items-center gap-3 border-b border-sidebar-border ${collapsed && !isMobile ? "px-3 py-4 justify-center" : "px-4 py-4"}`}>
        <Link href="/" aria-label="Go to landing page" className="flex items-center gap-3 min-w-0 group flex-1">
          <CirculairLogo size={22} className="flex-shrink-0 group-hover:opacity-80 transition-opacity" />
          {(!collapsed || isMobile) && (
            <div className="min-w-0">
              <div className="font-display text-sm font-bold leading-tight tracking-tight group-hover:text-primary transition-colors">
                Circul<span className="text-primary">-AI-</span>r
              </div>
              <div className="font-mono text-[9px] text-muted-foreground/60 tracking-widest uppercase">
                Battery Intelligence
              </div>
            </div>
          )}
        </Link>
        {isMobile && (
          <button
            onClick={() => setMobileOpen(false)}
            className="ml-auto p-1 rounded-md text-muted-foreground hover:text-foreground"
            aria-label="Close navigation"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Nav sections */}
      <nav
        className="flex-1 overflow-y-auto py-3 px-2"
        aria-label="Main navigation"
      >
        {NAV_SECTIONS.map((section) => (
          <NavSection
            key={section.sectionKey}
            section={section}
            location={location}
            unreadCount={unreadCount ?? 0}
            collapsed={collapsed && !isMobile}
            sidebarCollapsed={collapsed && !isMobile}
          />
        ))}
      </nav>

      {/* User footer */}
      <div className="border-t border-sidebar-border p-3 space-y-2">
        {(!collapsed || isMobile) && (
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg bg-sidebar-accent/60">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-chart-2 to-chart-3 flex items-center justify-center flex-shrink-0 text-xs font-bold text-white">
              {user?.name?.charAt(0)?.toUpperCase() ?? "U"}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold truncate text-foreground">{user?.name ?? "User"}</div>
              <div className="font-mono text-[9px] text-muted-foreground truncate">
                {ROLE_LABELS[platformRole] ?? platformRole}
              </div>
            </div>
          </div>
        )}
        {(!collapsed || isMobile) && (
          <div className="px-1">
            <LanguageSelector />
          </div>
        )}
        {(!collapsed || isMobile) && (
          <div className="flex items-center gap-3 px-1">
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
          title={collapsed && !isMobile ? "Sign Out" : undefined}
          className={`flex items-center gap-2 w-full px-2.5 py-2 rounded-md text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all ${collapsed && !isMobile ? "justify-center" : ""}`}
        >
          <LogOut className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
          {(!collapsed || isMobile) && <span>Sign Out</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* WCAG: Skip-to-content */}
      <a href="#main-content" className="skip-to-content">Skip to main content</a>
      <div className="bg-grid" aria-hidden="true" />
      <div className="bg-glow1" aria-hidden="true" />
      <div className="bg-glow2" aria-hidden="true" />

      {/* Desktop Sidebar */}
      <aside
        className={`relative z-20 hidden lg:flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-200 ease-out ${collapsed ? "w-14" : "w-56"}`}
        aria-label="Main navigation"
      >
        <SidebarContent />
        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!collapsed}
          className="absolute -right-3 top-[4.5rem] w-6 h-6 rounded-full bg-sidebar border border-sidebar-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary transition-all z-10 shadow-sm"
        >
          {collapsed
            ? <ChevronRight className="w-3 h-3" aria-hidden="true" />
            : <ChevronLeft  className="w-3 h-3" aria-hidden="true" />
          }
        </button>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation menu">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setMobileOpen(false)} aria-hidden="true" />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-sidebar border-r border-sidebar-border z-50 shadow-2xl">
            <SidebarContent isMobile />
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 relative z-10 overflow-hidden">
        {/* Topbar — fixed at top of the right column, never scrolls away */}
        <header
          className={`flex-shrink-0 z-30 flex items-center justify-between px-4 lg:px-5 border-b border-border bg-background/90 backdrop-blur-md transition-shadow duration-300 ease-out${
            scrolled ? " shadow-[0_2px_16px_0_oklch(0_0_0/0.18)]" : ""
          }`}
          role="banner"
          style={{ height: "52px" }}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation menu"
              aria-expanded={mobileOpen}
              className="lg:hidden p-2 rounded-lg hover:bg-secondary text-muted-foreground"
            >
              <Menu className="w-5 h-5" aria-hidden="true" />
            </button>
            {/* Search hint */}
            <div className="hidden sm:flex items-center gap-2 bg-secondary/60 rounded-lg px-3 py-1.5 cursor-pointer hover:bg-secondary transition-colors" aria-hidden="true">
              <Search className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Search batteries, BPANs…</span>
              <kbd className="hidden md:inline text-[9px] text-muted-foreground/60 bg-background/80 border border-border rounded px-1.5 py-0.5 font-mono ml-3">⌘K</kbd>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Theme toggle — always visible in topbar */}
            <ThemeToggleButton />
            <Link href="/alerts">
              <button
                className="relative p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                aria-label={`Alerts${(unreadCount ?? 0) > 0 ? ` — ${unreadCount} unread` : ""}`}
              >
                <Bell className="w-4 h-4" aria-hidden="true" />
                {(unreadCount ?? 0) > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-destructive rounded-full flex items-center justify-center text-[8px] text-white font-bold" aria-hidden="true">
                    {unreadCount}
                  </span>
                )}
              </button>
            </Link>
            <Link href="/settings/platform">
              <button
                className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Platform settings"
              >
                <Settings className="w-4 h-4" aria-hidden="true" />
              </button>
            </Link>
          </div>
        </header>

        {/* Page Content — scrolls independently under the sticky header */}
        <main
          id="main-content"
          ref={mainRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto"
          tabIndex={-1}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
