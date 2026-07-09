import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import PlatformLayout from "@/components/PlatformLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  User, Building2, Mail, Shield, Key, Clock, Activity,
  Battery, ShoppingCart, Bell, FileText, CheckCircle2,
  AlertCircle, Loader2, Eye, EyeOff, Edit3, Save, X
} from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────

const PLATFORM_ROLES = [
  { value: "oem", label: "OEM" },
  { value: "manufacturer", label: "Battery Manufacturer" },
  { value: "recycler", label: "Recycler" },
  { value: "bess_developer", label: "BESS Developer" },
  { value: "service_provider", label: "Service Provider" },
  { value: "government", label: "Government / Regulator" },
  { value: "admin_viewer", label: "Admin Viewer" },
] as const;

const ROLE_BADGE_COLORS: Record<string, string> = {
  oem: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  manufacturer: "bg-violet-500/15 text-violet-400 border-violet-500/30",
  recycler: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  bess_developer: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  service_provider: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
  government: "bg-rose-500/15 text-rose-400 border-rose-500/30",
  admin_viewer: "bg-primary/15 text-primary border-primary/30",
  admin: "bg-primary/20 text-primary border-primary/40",
  user: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
};

function formatDate(d: Date | string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatDateTime(d: Date | string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-3 p-4 rounded-xl bg-card border border-border/60 hover:border-primary/30 transition-colors">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon className="w-4.5 h-4.5" />
      </div>
      <div>
        <div className="text-xl font-bold font-mono text-foreground">{value.toLocaleString()}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function UserProfile() {
  const { user: authUser, loading: authLoading } = useAuth({ redirectOnUnauthenticated: true });
  const utils = trpc.useUtils();

  // ── Data fetching ──────────────────────────────────────────────────────────
  const { data: profile, isLoading: profileLoading } = trpc.profile.get.useQuery(undefined, {
    enabled: !!authUser,
  });
  const { data: stats, isLoading: statsLoading } = trpc.profile.activityStats.useQuery(undefined, {
    enabled: !!authUser,
  });

  // ── Profile edit state ─────────────────────────────────────────────────────
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: "", organization: "", platformRole: "" });

  useEffect(() => {
    if (profile) {
      setProfileForm({
        name: profile.name ?? "",
        organization: profile.organization ?? "",
        platformRole: profile.platformRole ?? "oem",
      });
    }
  }, [profile]);

  const updateProfileMutation = trpc.profile.update.useMutation({
    onSuccess: () => {
      toast.success("Profile updated", { description: "Your account details have been saved." });
      setEditingProfile(false);
      utils.profile.get.invalidate();
      utils.auth.me.invalidate();
    },
    onError: (err) => {
      toast.error("Update failed", { description: err.message });
    },
  });

  // ── Password change state ──────────────────────────────────────────────────
  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [pwErrors, setPwErrors] = useState<string[]>([]);

  const changePasswordMutation = trpc.profile.changePassword.useMutation({
    onSuccess: () => {
      toast.success("Password changed", { description: "Your password has been updated successfully." });
      setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setPwErrors([]);
    },
    onError: (err) => {
      toast.error("Password change failed", { description: err.message });
    },
  });

  function validatePassword() {
    const errs: string[] = [];
    if (!pwForm.currentPassword) errs.push("Current password is required");
    if (pwForm.newPassword.length < 8) errs.push("New password must be at least 8 characters");
    if (pwForm.newPassword !== pwForm.confirmPassword) errs.push("Passwords do not match");
    if (pwForm.newPassword === pwForm.currentPassword) errs.push("New password must differ from current password");
    return errs;
  }

  function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validatePassword();
    if (errs.length > 0) { setPwErrors(errs); return; }
    setPwErrors([]);
    changePasswordMutation.mutate({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
  }

  // ── Loading state ──────────────────────────────────────────────────────────
  if (authLoading || profileLoading) {
    return (
      <PlatformLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </PlatformLayout>
    );
  }

  if (!authUser || !profile) return null;

  const roleBadgeClass = ROLE_BADGE_COLORS[profile.platformRole] ?? ROLE_BADGE_COLORS.user;
  const systemRoleBadgeClass = ROLE_BADGE_COLORS[profile.role] ?? ROLE_BADGE_COLORS.user;
  const initials = (profile.name ?? "U").split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
  const isEmailAuth = profile.loginMethod === "email";

  return (
    <PlatformLayout>
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">

        {/* ── Page header ── */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Profile</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your account details and preferences</p>
        </div>

        {/* ── Profile hero card ── */}
        <Card className="border-border/60 bg-card">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
              {/* Avatar */}
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/80 to-chart-3 flex items-center justify-center flex-shrink-0 text-2xl font-bold text-white shadow-lg">
                {initials}
              </div>
              {/* Identity */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-bold text-foreground truncate">{profile.name ?? "Unnamed User"}</h2>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border font-mono uppercase tracking-wide ${systemRoleBadgeClass}`}>
                    {profile.role}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-1 text-sm text-muted-foreground">
                  <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">{profile.email ?? "—"}</span>
                </div>
                {profile.organization && (
                  <div className="flex items-center gap-1.5 mt-0.5 text-sm text-muted-foreground">
                    <Building2 className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate">{profile.organization}</span>
                  </div>
                )}
                <div className="flex flex-wrap gap-2 mt-3">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold border ${roleBadgeClass}`}>
                    {PLATFORM_ROLES.find(r => r.value === profile.platformRole)?.label ?? profile.platformRole}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs text-muted-foreground border border-border/60 bg-muted/30">
                    <Clock className="w-3 h-3" />
                    Member since {formatDate(profile.createdAt)}
                  </span>
                </div>
              </div>
              {/* Edit toggle */}
              <Button
                variant="outline"
                size="sm"
                className="flex-shrink-0"
                onClick={() => setEditingProfile(v => !v)}
              >
                {editingProfile ? <><X className="w-3.5 h-3.5 mr-1.5" />Cancel</> : <><Edit3 className="w-3.5 h-3.5 mr-1.5" />Edit Profile</>}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* ── Activity stats ── */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Activity Overview</h3>
          {statsLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[...Array(4)].map((_, i) => <div key={i} className="h-20 rounded-xl bg-card border border-border/60 animate-pulse" />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard icon={Battery} label="Batteries" value={stats?.batteries ?? 0} color="bg-primary/15 text-primary" />
              <StatCard icon={ShoppingCart} label="My Listings" value={stats?.listings ?? 0} color="bg-chart-2/15 text-chart-2" />
              <StatCard icon={Bell} label="Alerts" value={stats?.alerts ?? 0} color="bg-amber-500/15 text-amber-400" />
              <StatCard icon={FileText} label="Documents" value={stats?.documents ?? 0} color="bg-violet-500/15 text-violet-400" />
            </div>
          )}
        </div>

        {/* ── Account details + edit form ── */}
        <Card className="border-border/60 bg-card">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-primary" />
              <CardTitle className="text-base">Account Details</CardTitle>
            </div>
            <CardDescription>Your personal information and platform role</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {editingProfile ? (
              /* ── Edit form ── */
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  updateProfileMutation.mutate({
                    name: profileForm.name.trim() || undefined,
                    organization: profileForm.organization.trim() || null,
                    platformRole: profileForm.platformRole as any,
                  });
                }}
                className="space-y-4"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="profile-name">Display Name</Label>
                    <Input
                      id="profile-name"
                      value={profileForm.name}
                      onChange={e => setProfileForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="Your full name"
                      maxLength={200}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="profile-org">Organisation</Label>
                    <Input
                      id="profile-org"
                      value={profileForm.organization}
                      onChange={e => setProfileForm(f => ({ ...f, organization: e.target.value }))}
                      placeholder="Company or organisation name"
                      maxLength={255}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="profile-role">Platform Role</Label>
                  <Select
                    value={profileForm.platformRole}
                    onValueChange={v => setProfileForm(f => ({ ...f, platformRole: v }))}
                  >
                    <SelectTrigger id="profile-role" className="w-full sm:w-64">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PLATFORM_ROLES.map(r => (
                        <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Changing your role updates your dashboard view and feature access.</p>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <Button type="submit" size="sm" disabled={updateProfileMutation.isPending}>
                    {updateProfileMutation.isPending ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
                    Save Changes
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => setEditingProfile(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            ) : (
              /* ── Read-only view ── */
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                {[
                  { label: "Display Name", value: profile.name ?? "—", icon: User },
                  { label: "Email Address", value: profile.email ?? "—", icon: Mail },
                  { label: "Organisation", value: profile.organization ?? "—", icon: Building2 },
                  { label: "Login Method", value: profile.loginMethod === "email" ? "Email & Password" : profile.loginMethod ?? "—", icon: Key },
                  { label: "Member Since", value: formatDate(profile.createdAt), icon: Clock },
                  { label: "Last Sign-in", value: formatDateTime(profile.lastSignedIn), icon: Activity },
                ].map(({ label, value, icon: Icon }) => (
                  <div key={label} className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-md bg-muted/50 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">{label}</div>
                      <div className="text-sm font-medium text-foreground mt-0.5">{value}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Security section ── */}
        <Card className="border-border/60 bg-card">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />
              <CardTitle className="text-base">Security</CardTitle>
            </div>
            <CardDescription>Manage your password and account security</CardDescription>
          </CardHeader>
          <CardContent>
            {!isEmailAuth ? (
              <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/30 border border-border/60">
                <AlertCircle className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-sm font-medium text-foreground">Password management unavailable</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Your account uses <span className="font-mono">{profile.loginMethod ?? "external"}</span> authentication. Password changes are managed through your identity provider.
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-md">
                <div className="space-y-1.5">
                  <Label htmlFor="pw-current">Current Password</Label>
                  <div className="relative">
                    <Input
                      id="pw-current"
                      type={showCurrent ? "text" : "password"}
                      value={pwForm.currentPassword}
                      onChange={e => setPwForm(f => ({ ...f, currentPassword: e.target.value }))}
                      placeholder="Enter current password"
                      autoComplete="current-password"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrent(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={showCurrent ? "Hide password" : "Show password"}
                    >
                      {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pw-new">New Password</Label>
                  <div className="relative">
                    <Input
                      id="pw-new"
                      type={showNew ? "text" : "password"}
                      value={pwForm.newPassword}
                      onChange={e => setPwForm(f => ({ ...f, newPassword: e.target.value }))}
                      placeholder="At least 8 characters"
                      autoComplete="new-password"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={showNew ? "Hide password" : "Show password"}
                    >
                      {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {/* Password strength indicator */}
                  {pwForm.newPassword.length > 0 && (
                    <div className="flex gap-1 mt-1.5">
                      {[8, 12, 16].map((threshold, i) => (
                        <div
                          key={i}
                          className={`h-1 flex-1 rounded-full transition-colors ${
                            pwForm.newPassword.length >= threshold
                              ? i === 0 ? "bg-amber-400" : i === 1 ? "bg-chart-2" : "bg-primary"
                              : "bg-muted"
                          }`}
                        />
                      ))}
                      <span className="text-[10px] text-muted-foreground ml-1 self-center">
                        {pwForm.newPassword.length < 8 ? "Too short" : pwForm.newPassword.length < 12 ? "Fair" : pwForm.newPassword.length < 16 ? "Good" : "Strong"}
                      </span>
                    </div>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pw-confirm">Confirm New Password</Label>
                  <Input
                    id="pw-confirm"
                    type="password"
                    value={pwForm.confirmPassword}
                    onChange={e => setPwForm(f => ({ ...f, confirmPassword: e.target.value }))}
                    placeholder="Repeat new password"
                    autoComplete="new-password"
                  />
                  {pwForm.confirmPassword && pwForm.newPassword !== pwForm.confirmPassword && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> Passwords do not match
                    </p>
                  )}
                  {pwForm.confirmPassword && pwForm.newPassword === pwForm.confirmPassword && pwForm.newPassword.length >= 8 && (
                    <p className="text-xs text-primary flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Passwords match
                    </p>
                  )}
                </div>

                {/* Validation errors */}
                {pwErrors.length > 0 && (
                  <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 space-y-1">
                    {pwErrors.map((e, i) => (
                      <p key={i} className="text-xs text-destructive flex items-center gap-1.5">
                        <AlertCircle className="w-3 h-3 flex-shrink-0" />{e}
                      </p>
                    ))}
                  </div>
                )}

                <Button type="submit" size="sm" disabled={changePasswordMutation.isPending}>
                  {changePasswordMutation.isPending ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Key className="w-3.5 h-3.5 mr-1.5" />}
                  Update Password
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        {/* ── Account info footer ── */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 px-1 pb-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Shield className="w-3.5 h-3.5 text-primary/60" />
            <span>User ID: <span className="font-mono text-foreground/70">#{profile.id}</span></span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Activity className="w-3.5 h-3.5 text-primary/60" />
            <span>Last active: <span className="text-foreground/70">{formatDateTime(profile.lastSignedIn)}</span></span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CheckCircle2 className="w-3.5 h-3.5 text-primary/60" />
            <span>Account verified</span>
          </div>
        </div>

      </div>
    </PlatformLayout>
  );
}
