import { useState, useMemo } from "react";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Users,
  Shield,
  Search,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  History,
  UserCog,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";

// ─── Role metadata ────────────────────────────────────────────────────────────
const PLATFORM_ROLES = [
  { value: "admin",            label: "Admin",              short: "ADM", dot: "bg-red-400" },
  { value: "oem",              label: "OEM",                short: "OEM", dot: "bg-blue-400" },
  { value: "manufacturer",     label: "Manufacturer",       short: "MFG", dot: "bg-violet-400" },
  { value: "recycler",         label: "Recycler",           short: "RCY", dot: "bg-emerald-400" },
  { value: "bess_developer",   label: "BESS Developer",     short: "BSS", dot: "bg-amber-400" },
  { value: "service_provider", label: "Service Provider",   short: "SVC", dot: "bg-cyan-400" },
  { value: "government",       label: "Government",         short: "GOV", dot: "bg-orange-400" },
] as const;

type PlatformRoleValue = (typeof PLATFORM_ROLES)[number]["value"];

function getRoleMeta(role: string) {
  return (
    PLATFORM_ROLES.find((r) => r.value === role) ?? {
      value: role, label: role, short: "???", dot: "bg-zinc-500",
    }
  );
}

// ─── Tiny pill badge ──────────────────────────────────────────────────────────
function RolePill({ role }: { role: string }) {
  const m = getRoleMeta(role);
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-200">
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${m.dot}`} />
      {m.label}
    </span>
  );
}

function SystemPill({ role }: { role: string }) {
  if (role === "admin")
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-400">
        <Shield className="w-3 h-3" /> Admin
      </span>
    );
  return <span className="text-xs text-zinc-500">User</span>;
}

function Avatar({ name, email }: { name?: string | null; email?: string | null }) {
  const letter = (name ?? email ?? "?").charAt(0).toUpperCase();
  return (
    <span className="w-7 h-7 rounded-full bg-gradient-to-br from-primary/60 to-chart-2/60 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
      {letter}
    </span>
  );
}

function formatRelative(date: Date | string | null | undefined) {
  if (!date) return "—";
  const d = new Date(date);
  const now = Date.now();
  const diff = now - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" });
}

// ─── Stat strip ──────────────────────────────────────────────────────────────
function StatStrip() {
  const { data, isLoading } = trpc.admin.roleStats.useQuery();
  const total = data?.total ?? 0;
  const byRole = data?.byPlatformRole ?? {};

  return (
    <div className="flex flex-wrap gap-x-6 gap-y-2 px-1">
      {isLoading
        ? Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-4 w-20 rounded bg-zinc-800 animate-pulse" />
          ))
        : PLATFORM_ROLES.map((r) => {
            const cnt = byRole[r.value] ?? 0;
            return (
              <span key={r.value} className="inline-flex items-center gap-1.5 text-xs text-zinc-400">
                <span className={`w-1.5 h-1.5 rounded-full ${r.dot}`} />
                <span className="text-zinc-300 font-medium">{cnt}</span>
                <span>{r.short}</span>
              </span>
            );
          })}
      {!isLoading && (
        <span className="inline-flex items-center gap-1.5 text-xs text-zinc-500 ml-auto">
          <Users className="w-3 h-3" />
          {total} total
        </span>
      )}
    </div>
  );
}

// ─── Edit Role Dialog ─────────────────────────────────────────────────────────
interface EditUser {
  id: number;
  name: string | null;
  email: string | null;
  platformRole: string;
  role: string;
  organization: string | null;
}

function EditRoleDialog({
  user,
  onClose,
  onSuccess,
}: {
  user: EditUser | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const utils = trpc.useUtils();
  const [platformRole, setPlatformRole] = useState<PlatformRoleValue>(
    (user?.platformRole as PlatformRoleValue) ?? "oem"
  );
  const [systemRole, setSystemRole] = useState<"user" | "admin">(
    (user?.role as "user" | "admin") ?? "user"
  );
  const [organization, setOrganization] = useState(user?.organization ?? "");
  const [reason, setReason] = useState("");

  const mutation = trpc.admin.updateUserRole.useMutation({
    onSuccess: () => {
      toast.success("Role updated successfully");
      utils.admin.listUsers.invalidate();
      utils.admin.roleStats.invalidate();
      utils.admin.auditLog.invalidate();
      onSuccess();
    },
    onError: (err) => toast.error(err.message),
  });

  if (!user) return null;

  const displayName = user.name ?? user.email ?? `User #${user.id}`;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm bg-zinc-950 border-zinc-800 text-zinc-100 p-0 gap-0">
        {/* Header */}
        <DialogHeader className="px-5 pt-5 pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <Avatar name={user.name} email={user.email} />
            <div className="min-w-0">
              <DialogTitle className="text-sm font-semibold text-zinc-100 truncate">
                {displayName}
              </DialogTitle>
              <DialogDescription className="text-xs text-zinc-500 truncate mt-0.5">
                {user.email ?? `User #${user.id}`}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          {/* Platform Role */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-zinc-400 uppercase tracking-wide">
              Platform Role
            </Label>
            <Select value={platformRole} onValueChange={(v) => setPlatformRole(v as PlatformRoleValue)}>
              <SelectTrigger className="h-9 bg-zinc-900 border-zinc-700 text-zinc-100 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-700">
                {PLATFORM_ROLES.map((r) => (
                  <SelectItem key={r.value} value={r.value} className="text-zinc-100 text-sm focus:bg-zinc-800">
                    <span className="flex items-center gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full ${r.dot}`} />
                      {r.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* System Role */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-zinc-400 uppercase tracking-wide">
              System Access
            </Label>
            <Select value={systemRole} onValueChange={(v) => setSystemRole(v as "user" | "admin")}>
              <SelectTrigger className="h-9 bg-zinc-900 border-zinc-700 text-zinc-100 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-700">
                <SelectItem value="user" className="text-zinc-100 text-sm focus:bg-zinc-800">User</SelectItem>
                <SelectItem value="admin" className="text-zinc-100 text-sm focus:bg-zinc-800">
                  <span className="flex items-center gap-2 text-red-400">
                    <Shield className="w-3.5 h-3.5" /> Admin (full access)
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Organization */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-zinc-400 uppercase tracking-wide">
              Organization
            </Label>
            <Input
              value={organization}
              onChange={(e) => setOrganization(e.target.value)}
              placeholder="e.g. Tata Motors, CPCB…"
              className="h-9 bg-zinc-900 border-zinc-700 text-zinc-100 text-sm placeholder:text-zinc-600"
            />
          </div>

          {/* Reason */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-zinc-400 uppercase tracking-wide">
              Reason <span className="normal-case text-zinc-600">(optional)</span>
            </Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why is this change being made?"
              rows={2}
              className="bg-zinc-900 border-zinc-700 text-zinc-100 text-sm placeholder:text-zinc-600 resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="px-5 py-4 border-t border-zinc-800 flex-row gap-2 justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={() =>
              mutation.mutate({
                userId: user.id,
                platformRole,
                systemRole,
                organization: organization || undefined,
                reason: reason || undefined,
              })
            }
            disabled={mutation.isPending}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {mutation.isPending ? (
              <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
            )}
            {mutation.isPending ? "Saving…" : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Audit Log ────────────────────────────────────────────────────────────────
function AuditLog() {
  const { data, isLoading } = trpc.admin.auditLog.useQuery({ limit: 100 });

  if (isLoading)
    return (
      <div className="space-y-2 p-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-10 rounded-lg bg-zinc-800/50 animate-pulse" />
        ))}
      </div>
    );

  if (!data?.length)
    return (
      <div className="flex flex-col items-center justify-center py-20 text-zinc-600">
        <History className="w-8 h-8 mb-2 opacity-40" />
        <p className="text-sm">No role changes recorded yet.</p>
      </div>
    );

  return (
    <div className="divide-y divide-zinc-800/60">
      {data.map((entry) => (
        <div key={entry.id} className="flex items-start gap-3 px-4 py-3 hover:bg-zinc-800/20 transition-colors">
          {/* Timeline dot */}
          <div className="mt-1 w-1.5 h-1.5 rounded-full bg-primary/60 flex-shrink-0 ring-2 ring-primary/20" />

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
              <span className="font-medium text-zinc-200 truncate">
                {entry.targetUserName ?? `User #${entry.targetUserId}`}
              </span>
              {/* Role change arrow */}
              <span className="inline-flex items-center gap-1 text-xs text-zinc-500">
                {entry.previousPlatformRole ? (
                  <RolePill role={entry.previousPlatformRole} />
                ) : (
                  <span className="text-zinc-600">—</span>
                )}
                <ArrowRight className="w-3 h-3 text-zinc-600" />
                <RolePill role={entry.newPlatformRole} />
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5 text-xs text-zinc-500">
              <span>by {entry.changedByName ?? `User #${entry.changedByUserId}`}</span>
              {entry.reason && (
                <span className="italic text-zinc-600 truncate max-w-[200px]">"{entry.reason}"</span>
              )}
            </div>
          </div>

          <span className="text-xs text-zinc-600 whitespace-nowrap flex-shrink-0 mt-0.5">
            {formatRelative(entry.createdAt)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Mobile user card ─────────────────────────────────────────────────────────
function UserCard({
  u,
  onEdit,
}: {
  u: {
    id: number;
    name: string | null;
    email: string | null;
    platformRole: string;
    role: string;
    organization: string | null;
    lastSignedIn: Date | null;
    createdAt: Date;
  };
  onEdit: () => void;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-800/20 transition-colors border-b border-zinc-800/50 last:border-0">
      <Avatar name={u.name} email={u.email} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-zinc-200 truncate">
            {u.name ?? u.email ?? `User #${u.id}`}
          </span>
          <SystemPill role={u.role} />
        </div>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <RolePill role={u.platformRole} />
          {u.organization && (
            <span className="text-xs text-zinc-500 truncate">{u.organization}</span>
          )}
        </div>
        <p className="text-xs text-zinc-600 mt-0.5">{u.email ?? "No email"}</p>
      </div>
      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
        <span className="text-xs text-zinc-600">{formatRelative(u.lastSignedIn)}</span>
        <button
          onClick={onEdit}
          className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-primary transition-colors"
        >
          <Pencil className="w-3 h-3" /> Edit
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
  const [filterPlatformRole, setFilterPlatformRole] = useState<string>("all");
  const [filterSystemRole, setFilterSystemRole] = useState<string>("all");
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 15;

  const [editingUser, setEditingUser] = useState<EditUser | null>(null);

  const queryInput = useMemo(
    () => ({
      search: search || undefined,
      platformRole: (filterPlatformRole !== "all" ? filterPlatformRole : undefined) as
        | PlatformRoleValue
        | undefined,
      role: (filterSystemRole !== "all" ? filterSystemRole : undefined) as
        | "user"
        | "admin"
        | undefined,
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
    }),
    [search, filterPlatformRole, filterSystemRole, page]
  );

  const { data, isLoading, refetch } = trpc.admin.listUsers.useQuery(queryInput);
  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0;

  // Access guard
  if (user && user.role !== "admin") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-zinc-500">
        <AlertCircle className="w-10 h-10 text-red-500/40" />
        <p className="text-sm font-medium text-zinc-300">Access Denied</p>
        <p className="text-xs">Administrator privileges required.</p>
      </div>
    );
  }

  const hasFilters =
    search !== "" || filterPlatformRole !== "all" || filterSystemRole !== "all";

  return (
    <div className="flex flex-col h-full">
      {/* ── Page header ── */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-border flex-shrink-0">
        <div>
          <h1 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            User Management
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5 hidden sm:block">
            Manage platform roles and access for all registered users.
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => refetch()}
          className="text-muted-foreground hover:text-foreground h-8 px-2"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span className="ml-1.5 hidden sm:inline text-xs">Refresh</span>
        </Button>
      </div>

      {/* ── Stat strip ── */}
      <div className="px-4 sm:px-6 py-2.5 border-b border-border/50 bg-zinc-900/30 flex-shrink-0">
        <StatStrip />
      </div>

      {/* ── Tab bar ── */}
      <div className="flex items-center gap-0 px-4 sm:px-6 border-b border-border flex-shrink-0">
        {(["users", "audit"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`inline-flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 transition-colors ${
              tab === t
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "users" ? (
              <><Users className="w-3.5 h-3.5" /> Users {data ? <span className="ml-0.5 text-zinc-600">({data.total})</span> : null}</>
            ) : (
              <><History className="w-3.5 h-3.5" /> Audit Log</>
            )}
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto">
        {tab === "users" && (
          <>
            {/* Filter bar */}
            <div className="flex flex-col sm:flex-row gap-2 px-4 sm:px-6 py-3 border-b border-border/50 bg-zinc-900/20 flex-shrink-0">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(0);
                  }}
                  placeholder="Search name, email, org…"
                  className="pl-8 h-8 text-xs bg-zinc-900 border-zinc-700 text-zinc-100 placeholder:text-zinc-600"
                />
              </div>
              <Select
                value={filterPlatformRole}
                onValueChange={(v) => {
                  setFilterPlatformRole(v);
                  setPage(0);
                }}
              >
                <SelectTrigger className="h-8 w-full sm:w-44 text-xs bg-zinc-900 border-zinc-700 text-zinc-100">
                  <SelectValue placeholder="Platform role" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-700">
                  <SelectItem value="all" className="text-zinc-100 text-xs focus:bg-zinc-800">
                    All roles
                  </SelectItem>
                  {PLATFORM_ROLES.map((r) => (
                    <SelectItem
                      key={r.value}
                      value={r.value}
                      className="text-zinc-100 text-xs focus:bg-zinc-800"
                    >
                      <span className="flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full ${r.dot}`} />
                        {r.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={filterSystemRole}
                onValueChange={(v) => {
                  setFilterSystemRole(v);
                  setPage(0);
                }}
              >
                <SelectTrigger className="h-8 w-full sm:w-36 text-xs bg-zinc-900 border-zinc-700 text-zinc-100">
                  <SelectValue placeholder="System role" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-700">
                  <SelectItem value="all" className="text-zinc-100 text-xs focus:bg-zinc-800">
                    All access
                  </SelectItem>
                  <SelectItem value="user" className="text-zinc-100 text-xs focus:bg-zinc-800">
                    User
                  </SelectItem>
                  <SelectItem value="admin" className="text-zinc-100 text-xs focus:bg-zinc-800">
                    Admin
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Table — desktop; Cards — mobile */}
            {isLoading ? (
              <div className="space-y-px p-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="h-12 rounded-lg bg-zinc-800/40 animate-pulse" />
                ))}
              </div>
            ) : !data?.items.length ? (
              <div className="flex flex-col items-center justify-center py-20 text-zinc-600">
                <Users className="w-8 h-8 mb-2 opacity-30" />
                <p className="text-sm">No users found.</p>
                {hasFilters && (
                  <button
                    className="mt-2 text-xs text-primary hover:underline"
                    onClick={() => {
                      setSearch("");
                      setFilterPlatformRole("all");
                      setFilterSystemRole("all");
                      setPage(0);
                    }}
                  >
                    Clear filters
                  </button>
                )}
              </div>
            ) : (
              <>
                {/* Mobile cards (< md) */}
                <div className="md:hidden divide-y divide-zinc-800/50">
                  {data.items.map((u) => (
                    <UserCard
                      key={u.id}
                      u={u as any}
                      onEdit={() =>
                        setEditingUser({
                          id: u.id,
                          name: u.name ?? null,
                          email: u.email ?? null,
                          platformRole: u.platformRole,
                          role: u.role,
                          organization: u.organization ?? null,
                        })
                      }
                    />
                  ))}
                </div>

                {/* Desktop table (≥ md) */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 z-10 bg-zinc-950/90 backdrop-blur-sm">
                      <tr className="border-b border-zinc-800">
                        <th className="text-left py-2.5 px-4 text-xs font-medium text-zinc-500 uppercase tracking-wide">
                          User
                        </th>
                        <th className="text-left py-2.5 px-4 text-xs font-medium text-zinc-500 uppercase tracking-wide">
                          Organization
                        </th>
                        <th className="text-left py-2.5 px-4 text-xs font-medium text-zinc-500 uppercase tracking-wide">
                          Platform Role
                        </th>
                        <th className="text-left py-2.5 px-4 text-xs font-medium text-zinc-500 uppercase tracking-wide">
                          Access
                        </th>
                        <th className="text-left py-2.5 px-4 text-xs font-medium text-zinc-500 uppercase tracking-wide hidden lg:table-cell">
                          Last Sign-in
                        </th>
                        <th className="text-left py-2.5 px-4 text-xs font-medium text-zinc-500 uppercase tracking-wide hidden xl:table-cell">
                          Joined
                        </th>
                        <th className="py-2.5 px-4 w-16" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/50">
                      {data.items.map((u) => (
                        <tr
                          key={u.id}
                          className="hover:bg-zinc-800/20 transition-colors group"
                        >
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              <Avatar name={u.name} email={u.email} />
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-zinc-200 truncate">
                                  {u.name ?? "—"}
                                </p>
                                <p className="text-xs text-zinc-500 truncate">{u.email ?? "No email"}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-xs text-zinc-400 max-w-[140px]">
                            <span className="truncate block">{u.organization ?? "—"}</span>
                          </td>
                          <td className="py-3 px-4">
                            <RolePill role={u.platformRole} />
                          </td>
                          <td className="py-3 px-4">
                            <SystemPill role={u.role} />
                          </td>
                          <td className="py-3 px-4 text-xs text-zinc-500 hidden lg:table-cell">
                            {formatRelative((u as any).lastSignedIn)}
                          </td>
                          <td className="py-3 px-4 text-xs text-zinc-600 hidden xl:table-cell">
                            {formatRelative(u.createdAt)}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() =>
                                setEditingUser({
                                  id: u.id,
                                  name: u.name ?? null,
                                  email: u.email ?? null,
                                  platformRole: u.platformRole,
                                  role: u.role,
                                  organization: u.organization ?? null,
                                })
                              }
                              className="opacity-0 group-hover:opacity-100 inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-primary transition-all"
                            >
                              <Pencil className="w-3 h-3" /> Edit
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-t border-zinc-800/60">
                  <p className="text-xs text-zinc-600">
                    {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, data.total)} of{" "}
                    {data.total}
                  </p>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={page === 0}
                      onClick={() => setPage((p) => p - 1)}
                      className="h-7 w-7 p-0 text-zinc-400 hover:text-zinc-200 disabled:opacity-30"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-xs text-zinc-500 px-2">
                      {page + 1} / {totalPages || 1}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={page >= totalPages - 1}
                      onClick={() => setPage((p) => p + 1)}
                      className="h-7 w-7 p-0 text-zinc-400 hover:text-zinc-200 disabled:opacity-30"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {tab === "audit" && (
          <div>
            <div className="px-4 sm:px-6 py-3 border-b border-zinc-800/50 flex items-center justify-between">
              <p className="text-xs text-zinc-500">Showing last 100 role change events</p>
            </div>
            <AuditLog />
          </div>
        )}
      </div>

      {/* Edit dialog */}
      <EditRoleDialog
        user={editingUser}
        onClose={() => setEditingUser(null)}
        onSuccess={() => setEditingUser(null)}
      />
    </div>
  );
}
