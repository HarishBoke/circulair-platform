import { useState, useEffect, useMemo } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Shield,
  ArrowRight,
  MoreHorizontal,
  CheckCircle2,
  Lock,
} from "lucide-react";
import { toast } from "sonner";

// ─── Constants ────────────────────────────────────────────────────────────────
const PAGE_SIZE = 20;

const ROLES = [
  { value: "admin",            label: "Admin",            color: "text-red-400",     bg: "bg-red-400/10" },
  { value: "oem",              label: "OEM",              color: "text-sky-400",     bg: "bg-sky-400/10" },
  { value: "manufacturer",     label: "Manufacturer",     color: "text-violet-400",  bg: "bg-violet-400/10" },
  { value: "recycler",         label: "Recycler",         color: "text-emerald-400", bg: "bg-emerald-400/10" },
  { value: "bess_developer",   label: "BESS Developer",   color: "text-amber-400",   bg: "bg-amber-400/10" },
  { value: "service_provider", label: "Service Provider", color: "text-cyan-400",    bg: "bg-cyan-400/10" },
  { value: "government",       label: "Government",       color: "text-orange-400",  bg: "bg-orange-400/10" },
] as const;

type RoleValue = (typeof ROLES)[number]["value"];

// ─── Pure helpers ─────────────────────────────────────────────────────────────
function getRoleCfg(role: string) {
  return (
    ROLES.find((r) => r.value === role) ?? {
      value: role,
      label: role,
      color: "text-zinc-400",
      bg: "bg-zinc-400/10",
    }
  );
}

function timeAgo(date: Date | string | null | undefined): string | null {
  if (!date) return null;
  const ms = Date.now() - new Date(date).getTime();
  const m = Math.floor(ms / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

// ─── Shared sub-components ────────────────────────────────────────────────────
function RoleBadge({ role }: { role: string }) {
  const cfg = getRoleCfg(role);
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${cfg.bg} ${cfg.color}`}
    >
      {cfg.label}
    </span>
  );
}

function Initials({ name, email }: { name?: string | null; email?: string | null }) {
  const ch = (name ?? email ?? "?").charAt(0).toUpperCase();
  return (
    <span className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-semibold text-zinc-300 flex-shrink-0 select-none">
      {ch}
    </span>
  );
}

// ─── Edit dialog ──────────────────────────────────────────────────────────────
interface EditUser {
  id: number;
  name: string | null;
  email: string | null;
  platformRole: string;
  role: string;
  organization: string | null;
}

function EditDialog({ user, onClose }: { user: EditUser | null; onClose: () => void }) {
  const utils = trpc.useUtils();

  // Re-initialise local state whenever the target user changes (key prop handles unmount,
  // but we also guard here so stale state is never shown if the dialog stays mounted).
  const [platformRole, setPlatformRole] = useState<RoleValue>("oem");
  const [systemRole, setSystemRole] = useState<"user" | "admin">("user");
  const [org, setOrg] = useState("");
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (user) {
      setPlatformRole((user.platformRole as RoleValue) ?? "oem");
      setSystemRole((user.role as "user" | "admin") ?? "user");
      setOrg(user.organization ?? "");
      setReason("");
    }
  }, [user?.id]); // re-sync only when the target user changes

  const mutation = trpc.admin.updateUserRole.useMutation({
    onSuccess: () => {
      toast.success("User updated successfully");
      utils.admin.listUsers.invalidate();
      utils.admin.roleStats.invalidate();
      utils.admin.auditLog.invalidate();
      onClose();
    },
    onError: (err) => toast.error(err.message),
  });

  if (!user) return null;

  const handleSave = () => {
    mutation.mutate({
      userId: user.id,
      platformRole,
      systemRole,
      organization: org.trim() || undefined,
      reason: reason.trim() || undefined,
    });
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[360px] bg-zinc-950 border border-zinc-800 rounded-2xl p-0 gap-0 shadow-2xl">
        <DialogHeader className="px-6 pt-6 pb-4">
          <div className="flex items-center gap-3">
            <Initials name={user.name} email={user.email} />
            <div className="min-w-0">
              <DialogTitle className="text-sm font-semibold text-white leading-tight truncate">
                {user.name ?? user.email ?? `User #${user.id}`}
              </DialogTitle>
              {user.email && (
                <p className="text-xs text-zinc-500 truncate mt-0.5">{user.email}</p>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="px-6 pb-6 space-y-4">
          {/* Platform role */}
          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-400 font-medium">Platform Role</Label>
            <Select value={platformRole} onValueChange={(v) => setPlatformRole(v as RoleValue)}>
              <SelectTrigger className="h-9 bg-zinc-900 border-zinc-800 text-sm text-white rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800 rounded-xl">
                {ROLES.map((r) => (
                  <SelectItem
                    key={r.value}
                    value={r.value}
                    className="text-sm text-zinc-200 focus:bg-zinc-800 rounded-lg"
                  >
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* System access */}
          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-400 font-medium">System Access</Label>
            <Select value={systemRole} onValueChange={(v) => setSystemRole(v as "user" | "admin")}>
              <SelectTrigger className="h-9 bg-zinc-900 border-zinc-800 text-sm text-white rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800 rounded-xl">
                <SelectItem value="user" className="text-sm text-zinc-200 focus:bg-zinc-800 rounded-lg">
                  Standard User
                </SelectItem>
                <SelectItem value="admin" className="text-sm text-red-400 focus:bg-zinc-800 rounded-lg">
                  <span className="flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5" /> Administrator
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Organization */}
          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-400 font-medium">Organization</Label>
            <Input
              value={org}
              onChange={(e) => setOrg(e.target.value)}
              placeholder="e.g. Tata Motors, CPCB…"
              className="h-9 bg-zinc-900 border-zinc-800 text-sm text-white placeholder:text-zinc-600 rounded-lg"
            />
          </div>

          {/* Reason */}
          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-400 font-medium">
              Reason{" "}
              <span className="text-zinc-600 font-normal">(optional)</span>
            </Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why is this change being made?"
              rows={2}
              className="bg-zinc-900 border-zinc-800 text-sm text-white placeholder:text-zinc-600 resize-none rounded-lg"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <Button
              variant="ghost"
              className="flex-1 h-9 text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg"
              onClick={onClose}
              disabled={mutation.isPending}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 h-9 text-sm bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg"
              disabled={mutation.isPending}
              onClick={handleSave}
            >
              {mutation.isPending ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                  Save
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Audit log tab ────────────────────────────────────────────────────────────
function AuditLog() {
  const { data, isLoading } = trpc.admin.auditLog.useQuery({ limit: 100 });

  if (isLoading) {
    return (
      <div className="p-6 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-10 rounded-xl bg-zinc-800/40 animate-pulse" />
        ))}
      </div>
    );
  }

  if (!data?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-zinc-600">
        <p className="text-sm">No role changes recorded yet.</p>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 py-4 space-y-1">
      {data.map((entry) => (
        <div
          key={entry.id}
          className="flex items-start gap-4 py-3 border-b border-zinc-800/50 last:border-0"
        >
          {/* Left: target user + role change */}
          <div className="flex-1 min-w-0">
            <p className="text-sm text-zinc-200 font-medium truncate">
              {entry.targetUserName ?? `User #${entry.targetUserId}`}
            </p>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              {entry.previousPlatformRole ? (
                <RoleBadge role={entry.previousPlatformRole} />
              ) : (
                <span className="text-xs text-zinc-600">—</span>
              )}
              <ArrowRight className="w-3 h-3 text-zinc-600 flex-shrink-0" />
              <RoleBadge role={entry.newPlatformRole} />
            </div>
            {entry.reason && (
              <p className="text-xs text-zinc-500 mt-1 italic truncate">
                "{entry.reason}"
              </p>
            )}
          </div>

          {/* Right: changed-by + timestamp */}
          <div className="text-right flex-shrink-0">
            <p className="text-xs text-zinc-500">
              {entry.changedByName ?? `User #${entry.changedByUserId}`}
            </p>
            <p className="text-xs text-zinc-600 mt-0.5">{timeAgo(entry.createdAt)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── User row ─────────────────────────────────────────────────────────────────
interface UserRowUser {
  id: number;
  name: string | null;
  email: string | null;
  platformRole: string;
  role: string;
  organization: string | null;
  lastSignedIn: Date | null;
}

function UserRow({
  u,
  onOpenDetails,
}: {
  u: UserRowUser;
  onOpenDetails: () => void;
}) {
  const utils = trpc.useUtils();

  const mutation = trpc.admin.updateUserRole.useMutation({
    onSuccess: () => {
      toast.success("Role updated");
      utils.admin.listUsers.invalidate();
      utils.admin.roleStats.invalidate();
      utils.admin.auditLog.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleRoleChange = (newRole: RoleValue) => {
    if (newRole === u.platformRole || mutation.isPending) return;
    mutation.mutate({
      userId: u.id,
      platformRole: newRole,
      systemRole: u.role as "user" | "admin",
      organization: u.organization ?? undefined,
      reason: "Quick role change via admin panel",
    });
  };

  return (
    <div className="flex items-center gap-3 sm:grid sm:grid-cols-[1fr_180px_100px_36px] sm:gap-4 px-3 py-3 rounded-xl hover:bg-zinc-800/40 transition-colors">
      {/* User info */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <Initials name={u.name} email={u.email} />
        <div className="min-w-0">
          <p className="text-sm font-medium text-zinc-100 truncate leading-tight">
            {u.name ?? u.email ?? `User #${u.id}`}
          </p>
          <p className="text-xs text-zinc-500 truncate mt-0.5">
            {u.email ?? "No email"}
            {u.organization ? (
              <span className="text-zinc-600"> · {u.organization}</span>
            ) : null}
            {u.lastSignedIn ? (
              <span className="text-zinc-600 hidden sm:inline">
                {" "}
                · {timeAgo(u.lastSignedIn)}
              </span>
            ) : null}
          </p>
          {/* Mobile-only: role badge below name */}
          <div className="flex items-center gap-2 mt-1 sm:hidden">
            <RoleBadge role={u.platformRole} />
            {u.role === "admin" && (
              <span className="inline-flex items-center gap-0.5 text-xs font-medium text-red-400">
                <Shield className="w-3 h-3" /> Admin
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Platform role dropdown — desktop only */}
      <div className="hidden sm:flex items-center w-[180px]">
        <Select
          value={u.platformRole}
          onValueChange={handleRoleChange}
          disabled={mutation.isPending}
        >
          <SelectTrigger className="h-8 bg-zinc-900 border-zinc-800 text-xs text-zinc-200 rounded-lg disabled:opacity-50 w-full">
            {mutation.isPending ? (
              <span className="flex items-center gap-1.5 text-zinc-400">
                <RefreshCw className="w-3 h-3 animate-spin" />
                Saving…
              </span>
            ) : (
              <SelectValue />
            )}
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-800 rounded-xl">
            {ROLES.map((r) => (
              <SelectItem
                key={r.value}
                value={r.value}
                className="text-xs text-zinc-200 focus:bg-zinc-800 rounded-lg"
              >
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* System access — desktop only */}
      <div className="hidden sm:flex items-center w-[100px]">
        {u.role === "admin" ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-red-400">
            <Shield className="w-3 h-3" /> Admin
          </span>
        ) : (
          <span className="text-xs text-zinc-500">Standard</span>
        )}
      </div>

      {/* Details button */}
      <div className="flex-shrink-0 sm:w-9 flex justify-end">
        <button
          onClick={onOpenDetails}
          className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
          title="Edit details (org, system role, reason)"
          aria-label="Edit user details"
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function AdminUserManagement() {
  const { user } = useAuth();

  const [tab, setTab] = useState<"users" | "audit">("users");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [roleFilter, setRoleFilter] = useState("all");
  const [accessFilter, setAccessFilter] = useState("all");
  const [page, setPage] = useState(0);
  const [editing, setEditing] = useState<EditUser | null>(null);

  // Reset to page 0 only when the debounced search value changes
  useEffect(() => {
    setPage(0);
  }, [debouncedSearch]);

  // Stable query input — depends on debouncedSearch (not raw search)
  const queryInput = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      platformRole:
        roleFilter !== "all" ? (roleFilter as RoleValue) : undefined,
      role:
        accessFilter !== "all"
          ? (accessFilter as "user" | "admin")
          : undefined,
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
    }),
    [debouncedSearch, roleFilter, accessFilter, page],
  );

  const { data, isLoading, refetch } = trpc.admin.listUsers.useQuery(queryInput);
  const { data: stats } = trpc.admin.roleStats.useQuery();
  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0;

  // Access guard — rendered after all hooks to satisfy Rules of Hooks
  if (user && user.role !== "admin") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Lock className="w-8 h-8 text-zinc-600" />
        <p className="text-sm text-zinc-400">Administrator access required.</p>
      </div>
    );
  }

  const hasFilters =
    debouncedSearch !== "" || roleFilter !== "all" || accessFilter !== "all";

  const openEditDialog = (u: UserRowUser) =>
    setEditing({
      id: u.id,
      name: u.name,
      email: u.email,
      platformRole: u.platformRole,
      role: u.role,
      organization: u.organization,
    });

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 sm:px-8 py-5 flex-shrink-0">
        <div>
          <h1 className="text-lg font-semibold text-white tracking-tight">
            User Management
          </h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {stats ? (
              <>
                {stats.total} user{stats.total !== 1 ? "s" : ""}&nbsp;·&nbsp;
                {stats.byRole?.admin ?? 0} admin
                {(stats.byRole?.admin ?? 0) !== 1 ? "s" : ""}
              </>
            ) : (
              "Loading…"
            )}
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="p-2 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
          title="Refresh user list"
          aria-label="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* ── Tab bar ────────────────────────────────────────────────────── */}
      <div className="flex gap-1 px-5 sm:px-8 flex-shrink-0">
        {(["users", "audit"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors ${
              tab === t
                ? "bg-zinc-800 text-white"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {t === "users" ? "Users" : "Audit Log"}
          </button>
        ))}
      </div>

      <div className="h-px bg-zinc-800 mx-5 sm:mx-8 mt-3 flex-shrink-0" />

      {/* ── Content ────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto min-h-0">

        {/* ══ USERS TAB ══════════════════════════════════════════════════ */}
        {tab === "users" && (
          <>
            {/* Filter row */}
            <div className="flex flex-col sm:flex-row gap-2 px-5 sm:px-8 py-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, email or org…"
                  className="pl-9 h-9 bg-zinc-900 border-zinc-800 text-sm text-white placeholder:text-zinc-600 rounded-lg focus-visible:ring-primary/50"
                />
              </div>

              <Select
                value={roleFilter}
                onValueChange={(v) => {
                  setRoleFilter(v);
                  setPage(0);
                }}
              >
                <SelectTrigger className="h-9 w-full sm:w-44 bg-zinc-900 border-zinc-800 text-sm text-zinc-300 rounded-lg">
                  <SelectValue placeholder="All roles" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800 rounded-xl">
                  <SelectItem value="all" className="text-sm text-zinc-300 focus:bg-zinc-800">
                    All roles
                  </SelectItem>
                  {ROLES.map((r) => (
                    <SelectItem
                      key={r.value}
                      value={r.value}
                      className="text-sm text-zinc-300 focus:bg-zinc-800"
                    >
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={accessFilter}
                onValueChange={(v) => {
                  setAccessFilter(v);
                  setPage(0);
                }}
              >
                <SelectTrigger className="h-9 w-full sm:w-36 bg-zinc-900 border-zinc-800 text-sm text-zinc-300 rounded-lg">
                  <SelectValue placeholder="All access" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800 rounded-xl">
                  <SelectItem value="all" className="text-sm text-zinc-300 focus:bg-zinc-800">
                    All access
                  </SelectItem>
                  <SelectItem value="user" className="text-sm text-zinc-300 focus:bg-zinc-800">
                    Standard
                  </SelectItem>
                  <SelectItem value="admin" className="text-sm text-zinc-300 focus:bg-zinc-800">
                    Admin only
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Loading skeleton */}
            {isLoading && (
              <div className="px-5 sm:px-8 space-y-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="h-14 rounded-xl bg-zinc-800/40 animate-pulse" />
                ))}
              </div>
            )}

            {/* Empty state */}
            {!isLoading && !data?.items.length && (
              <div className="flex flex-col items-center justify-center py-24 gap-2 text-zinc-600">
                <p className="text-sm">No users found.</p>
                {hasFilters && (
                  <button
                    className="text-xs text-primary hover:underline"
                    onClick={() => {
                      setSearch("");
                      setRoleFilter("all");
                      setAccessFilter("all");
                      setPage(0);
                    }}
                  >
                    Clear filters
                  </button>
                )}
              </div>
            )}

            {/* User list */}
            {!isLoading && !!data?.items.length && (
              <div className="px-5 sm:px-8">
                {/* Column headers — desktop only */}
                <div className="hidden sm:grid grid-cols-[1fr_180px_100px_36px] gap-4 px-3 pb-2 text-xs font-medium text-zinc-500 uppercase tracking-wide">
                  <span>User</span>
                  <span>Platform Role</span>
                  <span>Access</span>
                  <span />
                </div>

                <div className="space-y-1">
                  {data.items.map((u) => (
                    <UserRow
                      key={u.id}
                      u={u as UserRowUser}
                      onOpenDetails={() => openEditDialog(u as UserRowUser)}
                    />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between py-4 mt-2">
                    <p className="text-xs text-zinc-600">
                      {page * PAGE_SIZE + 1}–
                      {Math.min((page + 1) * PAGE_SIZE, data.total)} of{" "}
                      {data.total}
                    </p>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={page === 0}
                        onClick={() => setPage((p) => p - 1)}
                        className="h-8 w-8 p-0 text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-30 rounded-lg"
                        aria-label="Previous page"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      <span className="text-xs text-zinc-500 px-2">
                        {page + 1} / {totalPages}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={page >= totalPages - 1}
                        onClick={() => setPage((p) => p + 1)}
                        className="h-8 w-8 p-0 text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-30 rounded-lg"
                        aria-label="Next page"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* ══ AUDIT TAB ══════════════════════════════════════════════════ */}
        {tab === "audit" && <AuditLog />}
      </div>

      {/* Edit dialog — key forces full remount when target user changes */}
      <EditDialog
        key={editing?.id ?? "none"}
        user={editing}
        onClose={() => setEditing(null)}
      />
    </div>
  );
}
