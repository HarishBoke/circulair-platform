import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  Shield,
  Search,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  History,
  Building2,
  UserCog,
  CheckCircle2,
  AlertCircle,
  BarChart3,
} from "lucide-react";
import { toast } from "sonner";

// ─── Constants ────────────────────────────────────────────────────────────────
const PLATFORM_ROLES = [
  { value: "admin", label: "Admin", color: "bg-red-500/20 text-red-400 border-red-500/30" },
  { value: "oem", label: "OEM", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  { value: "manufacturer", label: "Battery Manufacturer", color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  { value: "recycler", label: "Recycler", color: "bg-green-500/20 text-green-400 border-green-500/30" },
  { value: "bess_developer", label: "BESS Developer", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  { value: "service_provider", label: "Service Provider", color: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30" },
  { value: "government", label: "Government Regulator", color: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
] as const;

type PlatformRoleValue = (typeof PLATFORM_ROLES)[number]["value"];

function getRoleMeta(role: string) {
  return PLATFORM_ROLES.find((r) => r.value === role) ?? {
    value: role,
    label: role,
    color: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
  };
}

function RoleBadge({ role }: { role: string }) {
  const meta = getRoleMeta(role);
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${meta.color}`}>
      {meta.label}
    </span>
  );
}

function SystemRoleBadge({ role }: { role: string }) {
  if (role === "admin") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/30">
        <Shield className="w-3 h-3" /> Admin
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-zinc-700/50 text-zinc-400 border border-zinc-600/30">
      User
    </span>
  );
}

function formatDate(date: Date | string | null | undefined) {
  if (!date) return "—";
  return new Date(date).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

// ─── Role Stats Bar ───────────────────────────────────────────────────────────
function RoleStatsSection() {
  const { data: stats, isLoading } = trpc.admin.roleStats.useQuery();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {PLATFORM_ROLES.map((r) => (
          <div key={r.value} className="h-20 rounded-lg bg-zinc-800/50 animate-pulse" />
        ))}
      </div>
    );
  }

  const total = stats?.total ?? 0;
  const byRole = stats?.byPlatformRole ?? {};

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
      {PLATFORM_ROLES.map((r) => {
        const cnt = byRole[r.value] ?? 0;
        const pct = total > 0 ? Math.round((cnt / total) * 100) : 0;
        return (
          <Card key={r.value} className="bg-zinc-900/60 border-zinc-700/50 hover:border-zinc-600/70 transition-colors">
            <CardContent className="p-3">
              <p className="text-xs text-zinc-500 truncate">{r.label}</p>
              <p className="text-2xl font-bold font-mono text-zinc-100 mt-1">{cnt}</p>
              <div className="mt-2 h-1 rounded-full bg-zinc-700">
                <div
                  className="h-1 rounded-full transition-all"
                  style={{
                    width: `${pct}%`,
                    background: `var(--color-${r.value === "admin" ? "red" : r.value === "oem" ? "blue" : r.value === "manufacturer" ? "purple" : r.value === "recycler" ? "green" : r.value === "bess_developer" ? "yellow" : r.value === "service_provider" ? "cyan" : "orange"}-400)`,
                  }}
                />
              </div>
              <p className="text-xs text-zinc-600 mt-1">{pct}% of total</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ─── Edit Role Dialog ─────────────────────────────────────────────────────────
interface EditRoleDialogProps {
  user: {
    id: number;
    name: string | null;
    email: string | null;
    platformRole: string;
    role: string;
    organization: string | null;
  } | null;
  onClose: () => void;
  onSuccess: () => void;
}

function EditRoleDialog({ user, onClose, onSuccess }: EditRoleDialogProps) {
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
      toast.success("Role updated", {
        description: `${user?.name ?? "User"}'s role has been updated successfully.`,
      });
      utils.admin.listUsers.invalidate();
      utils.admin.roleStats.invalidate();
      utils.admin.auditLog.invalidate();
      onSuccess();
    },
    onError: (err) => {
      toast.error("Update failed", {
        description: err.message,
      });
    },
  });

  if (!user) return null;

  return (
    <Dialog open={!!user} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-zinc-900 border-zinc-700 text-zinc-100 max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCog className="w-5 h-5 text-blue-400" />
            Edit User Role
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            Update platform and system roles for{" "}
            <span className="text-zinc-200 font-medium">{user.name ?? user.email ?? `User #${user.id}`}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Platform Role */}
          <div className="space-y-1.5">
            <Label className="text-zinc-300">Platform Role</Label>
            <Select value={platformRole} onValueChange={(v) => setPlatformRole(v as PlatformRoleValue)}>
              <SelectTrigger className="bg-zinc-800 border-zinc-600 text-zinc-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                {PLATFORM_ROLES.map((r) => (
                  <SelectItem key={r.value} value={r.value} className="text-zinc-100 focus:bg-zinc-700">
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-zinc-500">Controls which dashboard and features the user can access.</p>
          </div>

          {/* System Role */}
          <div className="space-y-1.5">
            <Label className="text-zinc-300">System Role</Label>
            <Select value={systemRole} onValueChange={(v) => setSystemRole(v as "user" | "admin")}>
              <SelectTrigger className="bg-zinc-800 border-zinc-600 text-zinc-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                <SelectItem value="user" className="text-zinc-100 focus:bg-zinc-700">User</SelectItem>
                <SelectItem value="admin" className="text-zinc-100 focus:bg-zinc-700">Admin (full access)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Organization */}
          <div className="space-y-1.5">
            <Label className="text-zinc-300">Organization</Label>
            <Input
              value={organization}
              onChange={(e) => setOrganization(e.target.value)}
              placeholder="e.g. Tata Motors, CPCB, Exide..."
              className="bg-zinc-800 border-zinc-600 text-zinc-100 placeholder:text-zinc-500"
            />
          </div>

          {/* Reason */}
          <div className="space-y-1.5">
            <Label className="text-zinc-300">Reason for change <span className="text-zinc-500">(optional)</span></Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Briefly describe why this role change is being made..."
              rows={2}
              className="bg-zinc-800 border-zinc-600 text-zinc-100 placeholder:text-zinc-500 resize-none"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} className="border-zinc-600 text-zinc-300 hover:bg-zinc-800">
            Cancel
          </Button>
          <Button
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
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {mutation.isPending ? (
              <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
            ) : (
              <><CheckCircle2 className="w-4 h-4 mr-2" /> Save Changes</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Audit Log Table ──────────────────────────────────────────────────────────
function AuditLogSection() {
  const { data, isLoading } = trpc.admin.auditLog.useQuery({ limit: 100 });

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-12 rounded bg-zinc-800/50 animate-pulse" />
        ))}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-zinc-500">
        <History className="w-12 h-12 mb-3 opacity-30" />
        <p className="text-sm">No role changes recorded yet.</p>
        <p className="text-xs mt-1 text-zinc-600">Changes will appear here when roles are updated.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-700/50">
            <th className="text-left py-2 px-3 text-zinc-400 font-medium">Target User</th>
            <th className="text-left py-2 px-3 text-zinc-400 font-medium">Previous Role</th>
            <th className="text-left py-2 px-3 text-zinc-400 font-medium">New Role</th>
            <th className="text-left py-2 px-3 text-zinc-400 font-medium">Changed By</th>
            <th className="text-left py-2 px-3 text-zinc-400 font-medium">Reason</th>
            <th className="text-left py-2 px-3 text-zinc-400 font-medium">When</th>
          </tr>
        </thead>
        <tbody>
          {data.map((entry) => (
            <tr key={entry.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
              <td className="py-2.5 px-3">
                <p className="text-zinc-200 font-medium">{entry.targetUserName ?? "—"}</p>
                <p className="text-xs text-zinc-500">{entry.targetUserEmail ?? `User #${entry.targetUserId}`}</p>
              </td>
              <td className="py-2.5 px-3">
                {entry.previousPlatformRole ? (
                  <RoleBadge role={entry.previousPlatformRole} />
                ) : (
                  <span className="text-zinc-600">—</span>
                )}
              </td>
              <td className="py-2.5 px-3">
                <RoleBadge role={entry.newPlatformRole} />
              </td>
              <td className="py-2.5 px-3">
                <p className="text-zinc-300">{entry.changedByName ?? `User #${entry.changedByUserId}`}</p>
              </td>
              <td className="py-2.5 px-3 max-w-[200px]">
                <p className="text-zinc-400 text-xs truncate">{entry.reason ?? "—"}</p>
              </td>
              <td className="py-2.5 px-3 text-zinc-500 text-xs whitespace-nowrap">
                {formatDate(entry.createdAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AdminUserManagement() {
  const { user } = useAuth();

  // Filters & pagination
  const [search, setSearch] = useState("");
  const [filterPlatformRole, setFilterPlatformRole] = useState<string>("all");
  const [filterSystemRole, setFilterSystemRole] = useState<string>("all");
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 15;

  // Edit dialog state
  const [editingUser, setEditingUser] = useState<null | {
    id: number;
    name: string | null;
    email: string | null;
    platformRole: string;
    role: string;
    organization: string | null;
  }>(null);

  // Query
  const queryInput = useMemo(() => ({
    search: search || undefined,
    platformRole: (filterPlatformRole !== "all" ? filterPlatformRole : undefined) as PlatformRoleValue | undefined,
    role: (filterSystemRole !== "all" ? filterSystemRole : undefined) as "user" | "admin" | undefined,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  }), [search, filterPlatformRole, filterSystemRole, page]);

  const { data, isLoading, refetch } = trpc.admin.listUsers.useQuery(queryInput);

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0;

  // Guard: only admins can access this page
  if (user && user.role !== "admin") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-zinc-400">
        <AlertCircle className="w-16 h-16 text-red-500/50" />
        <h2 className="text-xl font-semibold text-zinc-200">Access Denied</h2>
        <p className="text-sm">You need administrator privileges to access this page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display text-zinc-100 flex items-center gap-2">
            <Users className="w-7 h-7 text-blue-400" />
            User Role Management
          </h1>
          <p className="text-zinc-400 text-sm mt-1">
            Manage platform access and roles for all registered users across the Circul-AI-r ecosystem.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          className="border-zinc-600 text-zinc-300 hover:bg-zinc-800"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Role Stats */}
      <Card className="bg-zinc-900/40 border-zinc-700/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-zinc-400 flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Role Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RoleStatsSection />
        </CardContent>
      </Card>

      {/* Tabs: Users / Audit Log */}
      <Tabs defaultValue="users">
        <TabsList className="bg-zinc-800/60 border border-zinc-700/50">
          <TabsTrigger value="users" className="data-[state=active]:bg-zinc-700 data-[state=active]:text-zinc-100 text-zinc-400">
            <Users className="w-4 h-4 mr-2" />
            Users
          </TabsTrigger>
          <TabsTrigger value="audit" className="data-[state=active]:bg-zinc-700 data-[state=active]:text-zinc-100 text-zinc-400">
            <History className="w-4 h-4 mr-2" />
            Audit Log
          </TabsTrigger>
        </TabsList>

        {/* ── Users Tab ── */}
        <TabsContent value="users" className="mt-4 space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <Input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                placeholder="Search by name, email, or organization..."
                className="pl-9 bg-zinc-800/60 border-zinc-600 text-zinc-100 placeholder:text-zinc-500"
              />
            </div>
            <Select
              value={filterPlatformRole}
              onValueChange={(v) => { setFilterPlatformRole(v); setPage(0); }}
            >
              <SelectTrigger className="w-[200px] bg-zinc-800/60 border-zinc-600 text-zinc-100">
                <SelectValue placeholder="Platform Role" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                <SelectItem value="all" className="text-zinc-100 focus:bg-zinc-700">All Platform Roles</SelectItem>
                {PLATFORM_ROLES.map((r) => (
                  <SelectItem key={r.value} value={r.value} className="text-zinc-100 focus:bg-zinc-700">
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filterSystemRole}
              onValueChange={(v) => { setFilterSystemRole(v); setPage(0); }}
            >
              <SelectTrigger className="w-[160px] bg-zinc-800/60 border-zinc-600 text-zinc-100">
                <SelectValue placeholder="System Role" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                <SelectItem value="all" className="text-zinc-100 focus:bg-zinc-700">All System Roles</SelectItem>
                <SelectItem value="user" className="text-zinc-100 focus:bg-zinc-700">User</SelectItem>
                <SelectItem value="admin" className="text-zinc-100 focus:bg-zinc-700">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <Card className="bg-zinc-900/40 border-zinc-700/50 overflow-hidden">
            {isLoading ? (
              <div className="space-y-2 p-4">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="h-14 rounded bg-zinc-800/50 animate-pulse" />
                ))}
              </div>
            ) : !data || data.items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-zinc-500">
                <Users className="w-12 h-12 mb-3 opacity-30" />
                <p className="text-sm">No users found</p>
                {(search || filterPlatformRole !== "all" || filterSystemRole !== "all") && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-3 text-zinc-400 hover:text-zinc-200"
                    onClick={() => { setSearch(""); setFilterPlatformRole("all"); setFilterSystemRole("all"); setPage(0); }}
                  >
                    Clear filters
                  </Button>
                )}
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-zinc-700/50 bg-zinc-800/30">
                        <th className="text-left py-3 px-4 text-zinc-400 font-medium">User</th>
                        <th className="text-left py-3 px-4 text-zinc-400 font-medium">Organization</th>
                        <th className="text-left py-3 px-4 text-zinc-400 font-medium">Platform Role</th>
                        <th className="text-left py-3 px-4 text-zinc-400 font-medium">System Role</th>
                        <th className="text-left py-3 px-4 text-zinc-400 font-medium">Last Sign-in</th>
                        <th className="text-left py-3 px-4 text-zinc-400 font-medium">Joined</th>
                        <th className="text-right py-3 px-4 text-zinc-400 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.items.map((u) => (
                        <tr
                          key={u.id}
                          className="border-b border-zinc-800/50 hover:bg-zinc-800/20 transition-colors"
                        >
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-300 flex-shrink-0">
                                {(u.name ?? u.email ?? "?").charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="text-zinc-200 font-medium">{u.name ?? "—"}</p>
                                <p className="text-xs text-zinc-500">{u.email ?? "No email"}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            {u.organization ? (
                              <span className="flex items-center gap-1 text-zinc-300">
                                <Building2 className="w-3 h-3 text-zinc-500" />
                                {u.organization}
                              </span>
                            ) : (
                              <span className="text-zinc-600">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <RoleBadge role={u.platformRole} />
                          </td>
                          <td className="py-3 px-4">
                            <SystemRoleBadge role={u.role} />
                          </td>
                          <td className="py-3 px-4 text-zinc-500 text-xs">
                            {formatDate(u.lastSignedIn)}
                          </td>
                          <td className="py-3 px-4 text-zinc-500 text-xs">
                            {formatDate(u.createdAt)}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-zinc-600 text-zinc-300 hover:bg-zinc-700 hover:text-zinc-100 text-xs"
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
                            >
                              <UserCog className="w-3 h-3 mr-1" />
                              Edit Role
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-700/50">
                  <p className="text-xs text-zinc-500">
                    Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, data.total)} of {data.total} users
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={page === 0}
                      onClick={() => setPage((p) => p - 1)}
                      className="border-zinc-600 text-zinc-400 hover:bg-zinc-800 disabled:opacity-40"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-xs text-zinc-400 px-2">
                      Page {page + 1} of {totalPages || 1}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={page >= totalPages - 1}
                      onClick={() => setPage((p) => p + 1)}
                      className="border-zinc-600 text-zinc-400 hover:bg-zinc-800 disabled:opacity-40"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </Card>
        </TabsContent>

        {/* ── Audit Log Tab ── */}
        <TabsContent value="audit" className="mt-4">
          <Card className="bg-zinc-900/40 border-zinc-700/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                <History className="w-4 h-4 text-zinc-400" />
                Role Change History
                <Badge variant="outline" className="ml-auto border-zinc-600 text-zinc-500 text-xs">
                  Last 100 entries
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <AuditLogSection />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Role Dialog */}
      <EditRoleDialog
        user={editingUser}
        onClose={() => setEditingUser(null)}
        onSuccess={() => setEditingUser(null)}
      />
    </div>
  );
}
