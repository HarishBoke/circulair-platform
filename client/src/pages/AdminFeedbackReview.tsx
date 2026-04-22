/**
 * AdminFeedbackReview — Full admin page for reviewing, filtering,
 * and managing all user-submitted wiki feedback.
 */
import { usePageTitle } from "@/hooks/usePageTitle";
import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MessageSquare,
  Star,
  AlertTriangle,
  Edit3,
  ThumbsUp,
  ThumbsDown,
  HelpCircle,
  CheckCircle2,
  XCircle,
  GitMerge,
  Clock,
  Search,
  ChevronLeft,
  ChevronRight,
  Filter,
  BarChart3,
  Eye,
  X,
  Send,
  FileText,
  User,
  Calendar,
  Loader2,
  RefreshCw,
  Inbox,
  ArrowUpRight,
} from "lucide-react";

// ─── CONSTANTS ──────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

const FEEDBACK_TYPES = [
  { value: "suggest_edit", label: "Suggest Edit", icon: Edit3, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
  { value: "flag_outdated", label: "Flag Outdated", icon: AlertTriangle, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
  { value: "flag_inaccurate", label: "Flag Inaccurate", icon: XCircle, color: "text-red-400", bg: "bg-red-500/10 border-red-500/20" },
  { value: "request_topic", label: "Request Topic", icon: HelpCircle, color: "text-violet-400", bg: "bg-violet-500/10 border-violet-500/20" },
  { value: "rate_helpful", label: "Helpful", icon: ThumbsUp, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
  { value: "rate_not_helpful", label: "Not Helpful", icon: ThumbsDown, color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/20" },
  { value: "general", label: "General", icon: MessageSquare, color: "text-muted-foreground", bg: "bg-secondary/50 border-border" },
] as const;

const STATUS_CONFIG = {
  pending: { label: "Pending", icon: Clock, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
  approved: { label: "Approved", icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
  rejected: { label: "Rejected", icon: XCircle, color: "text-red-400", bg: "bg-red-500/10 border-red-500/20" },
  merged: { label: "Merged", icon: GitMerge, color: "text-violet-400", bg: "bg-violet-500/10 border-violet-500/20" },
} as const;

type FeedbackType = typeof FEEDBACK_TYPES[number]["value"];
type StatusType = keyof typeof STATUS_CONFIG;

function getTypeConfig(type: string) {
  return FEEDBACK_TYPES.find((t) => t.value === type) ?? FEEDBACK_TYPES[6];
}

function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatDateTime(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function timeAgo(d: Date | string | null | undefined): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(d);
}

// ─── MAIN COMPONENT ─────────────────────────────────────────────────────────

export default function AdminFeedbackReview() {
  usePageTitle("Feedback Review");

  const [statusFilter, setStatusFilter] = useState<StatusType | "all">("all");
  const [typeFilter, setTypeFilter] = useState<FeedbackType | "all">("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(0);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Debounce search
  const searchTimeout = useMemo(() => {
    return setTimeout(() => setDebouncedSearch(search), 300);
  }, [search]);
  // Clean up is handled by React re-render clearing previous timeout reference

  const { data: stats, refetch: refetchStats } = trpc.wikiFeedback.stats.useQuery();

  const { data: feedbackData, isLoading, refetch: refetchList } = trpc.wikiFeedback.list.useQuery({
    status: statusFilter === "all" ? undefined : statusFilter,
    type: typeFilter === "all" ? undefined : typeFilter,
    search: debouncedSearch || undefined,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  });

  const reviewMutation = trpc.wikiFeedback.review.useMutation({
    onSuccess: () => {
      refetchList();
      refetchStats();
      setSelectedId(null);
      setReviewNotes("");
    },
  });

  const items = feedbackData?.items ?? [];
  const total = feedbackData?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const handleReview = (id: number, status: "approved" | "rejected" | "merged") => {
    reviewMutation.mutate({ id, status, reviewNotes: reviewNotes || undefined });
  };

  const handleBulkReview = (status: "approved" | "rejected" | "merged") => {
    const ids = Array.from(selectedIds);
    ids.forEach((id) => {
      reviewMutation.mutate({ id, status });
    });
    setSelectedIds(new Set());
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map((i) => i.id)));
    }
  };

  const selectedItem = items.find((i) => i.id === selectedId);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Feedback Review</h1>
              <p className="text-xs text-muted-foreground/70">Manage wiki article feedback and suggestions</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="border-white/10 text-muted-foreground hover:text-white"
            onClick={() => { refetchList(); refetchStats(); }}
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Refresh
          </Button>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
            {[
              { key: "total", label: "Total", value: stats.total, icon: BarChart3, color: "text-foreground/90", bg: "bg-white/5 border-white/10" },
              { key: "pending", label: "Pending", value: stats.pending, icon: Clock, color: "text-amber-400", bg: "bg-amber-500/5 border-amber-500/20" },
              { key: "approved", label: "Approved", value: stats.approved, icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/5 border-emerald-500/20" },
              { key: "rejected", label: "Rejected", value: stats.rejected, icon: XCircle, color: "text-red-400", bg: "bg-red-500/5 border-red-500/20" },
              { key: "merged", label: "Merged", value: stats.merged, icon: GitMerge, color: "text-violet-400", bg: "bg-violet-500/5 border-violet-500/20" },
            ].map((s) => (
              <button
                key={s.key}
                onClick={() => {
                  setStatusFilter(s.key === "total" ? "all" : s.key as StatusType);
                  setPage(0);
                }}
                className={`p-3 rounded-xl border transition-all text-left ${s.bg} ${
                  (s.key === "total" && statusFilter === "all") || statusFilter === s.key
                    ? "ring-1 ring-white/20"
                    : "hover:border-white/20"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <s.icon className={`w-4 h-4 ${s.color}`} />
                  <span className={`text-lg font-bold font-mono ${s.color}`}>{s.value}</span>
                </div>
                <span className="text-[10px] text-muted-foreground/70 uppercase tracking-wider">{s.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Filters Row */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/70" />
            <Input
              placeholder="Search articles, content, users..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-muted-foreground/60 h-9"
            />
          </div>

          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as StatusType | "all"); setPage(0); }}>
            <SelectTrigger className="w-[140px] bg-white/5 border-white/10 text-foreground/90 h-9">
              <Filter className="w-3.5 h-3.5 mr-1.5 text-muted-foreground/70" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="merged">Merged</SelectItem>
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v as FeedbackType | "all"); setPage(0); }}>
            <SelectTrigger className="w-[160px] bg-white/5 border-white/10 text-foreground/90 h-9">
              <Filter className="w-3.5 h-3.5 mr-1.5 text-muted-foreground/70" />
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {FEEDBACK_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {(statusFilter !== "all" || typeFilter !== "all" || search) && (
            <button
              onClick={() => { setStatusFilter("all"); setTypeFilter("all"); setSearch(""); setDebouncedSearch(""); setPage(0); }}
              className="flex items-center gap-1 text-xs text-muted-foreground/70 hover:text-foreground/90 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Clear filters
            </button>
          )}

          <div className="ml-auto text-xs text-muted-foreground/70">
            {total} result{total !== 1 ? "s" : ""}
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-3 mb-4 p-3 bg-primary/5 border border-primary/20 rounded-xl">
            <span className="text-sm text-primary font-medium">{selectedIds.size} selected</span>
            <div className="flex items-center gap-2 ml-auto">
              <Button size="sm" variant="outline" className="h-7 text-xs border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10" onClick={() => handleBulkReview("approved")}>
                <CheckCircle2 className="w-3 h-3 mr-1" /> Approve
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs border-red-500/30 text-red-400 hover:bg-red-500/10" onClick={() => handleBulkReview("rejected")}>
                <XCircle className="w-3 h-3 mr-1" /> Reject
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs border-violet-500/30 text-violet-400 hover:bg-violet-500/10" onClick={() => handleBulkReview("merged")}>
                <GitMerge className="w-3 h-3 mr-1" /> Merge
              </Button>
              <button onClick={() => setSelectedIds(new Set())} className="text-xs text-muted-foreground/70 hover:text-foreground/90 ml-2">
                Clear
              </button>
            </div>
          </div>
        )}

        {/* Main Content: Table + Detail Panel */}
        <div className="flex gap-4">
          {/* Table */}
          <div className={`flex-1 min-w-0 ${selectedItem ? "hidden lg:block" : ""}`}>
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-6 h-6 text-muted-foreground/70 animate-spin" />
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Inbox className="w-12 h-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-sm font-medium text-muted-foreground mb-1">No feedback found</h3>
                <p className="text-xs text-muted-foreground/60">
                  {statusFilter !== "all" || typeFilter !== "all" || search
                    ? "Try adjusting your filters"
                    : "No wiki feedback has been submitted yet"}
                </p>
              </div>
            ) : (
              <div className="bg-white/[0.02] border border-white/5 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/5 text-muted-foreground/70 text-xs uppercase tracking-wider">
                      <th className="text-left px-4 py-3 w-8">
                        <input
                          type="checkbox"
                          checked={selectedIds.size === items.length && items.length > 0}
                          onChange={toggleSelectAll}
                          className="rounded border-border bg-transparent"
                        />
                      </th>
                      <th className="text-left px-4 py-3">Article</th>
                      <th className="text-left px-4 py-3 hidden md:table-cell">Type</th>
                      <th className="text-left px-4 py-3 hidden lg:table-cell">User</th>
                      <th className="text-left px-4 py-3 hidden sm:table-cell">Rating</th>
                      <th className="text-left px-4 py-3">Status</th>
                      <th className="text-left px-4 py-3 hidden xl:table-cell">Submitted</th>
                      <th className="text-right px-4 py-3 w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => {
                      const typeConf = getTypeConfig(item.type!);
                      const statusConf = STATUS_CONFIG[item.status as StatusType] ?? STATUS_CONFIG.pending;
                      const isSelected = selectedIds.has(item.id);

                      return (
                        <tr
                          key={item.id}
                          className={`border-b border-white/5 transition-colors cursor-pointer ${
                            selectedId === item.id
                              ? "bg-primary/5"
                              : isSelected
                              ? "bg-white/[0.03]"
                              : "hover:bg-white/[0.02]"
                          }`}
                          onClick={() => setSelectedId(item.id)}
                        >
                          <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelect(item.id)}
                              className="rounded border-border bg-transparent"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2 min-w-0">
                              <FileText className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
                              <span className="text-foreground truncate max-w-[200px]">{item.articleTitle}</span>
                            </div>
                            {item.content && (
                              <p className="text-[11px] text-muted-foreground/60 truncate max-w-[250px] mt-0.5 ml-5.5">
                                {item.content}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell">
                            <Badge variant="outline" className={`text-[10px] ${typeConf.bg}`}>
                              <typeConf.icon className={`w-3 h-3 mr-1 ${typeConf.color}`} />
                              {typeConf.label}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 hidden lg:table-cell">
                            <div className="flex items-center gap-1.5">
                              <User className="w-3 h-3 text-muted-foreground/60" />
                              <span className="text-xs text-muted-foreground truncate max-w-[100px]">
                                {item.userName || "Anonymous"}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 hidden sm:table-cell">
                            {item.rating ? (
                              <div className="flex items-center gap-1">
                                {Array.from({ length: 5 }).map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`w-3 h-3 ${i < item.rating! ? "text-amber-400 fill-amber-400" : "text-muted-foreground/50"}`}
                                  />
                                ))}
                              </div>
                            ) : (
                              <span className="text-muted-foreground/50 text-xs">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant="outline" className={`text-[10px] ${statusConf.bg}`}>
                              <statusConf.icon className={`w-3 h-3 mr-1 ${statusConf.color}`} />
                              {statusConf.label}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 hidden xl:table-cell">
                            <span className="text-xs text-muted-foreground/70">{timeAgo(item.createdAt)}</span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Eye className="w-3.5 h-3.5 text-muted-foreground/60" />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-white/5">
                    <span className="text-xs text-muted-foreground/70">
                      Page {page + 1} of {totalPages}
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 border-white/10 text-muted-foreground"
                        disabled={page === 0}
                        onClick={() => setPage((p) => p - 1)}
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 border-white/10 text-muted-foreground"
                        disabled={page >= totalPages - 1}
                        onClick={() => setPage((p) => p + 1)}
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Detail Panel */}
          {selectedItem && (
            <div className="w-full lg:w-[400px] shrink-0">
              <div className="bg-white/[0.02] border border-white/5 rounded-xl overflow-hidden sticky top-6">
                {/* Detail Header */}
                <div className="p-4 border-b border-white/5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-mono text-muted-foreground/60 uppercase">Feedback #{selectedItem.id}</span>
                    <button
                      onClick={() => setSelectedId(null)}
                      className="p-1 rounded-lg hover:bg-white/5 text-muted-foreground/70 hover:text-foreground/90 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <h3 className="text-sm font-medium text-white mb-1">{selectedItem.articleTitle}</h3>
                  <div className="flex items-center gap-2 flex-wrap">
                    {(() => {
                      const tc = getTypeConfig(selectedItem.type!);
                      return (
                        <Badge variant="outline" className={`text-[10px] ${tc.bg}`}>
                          <tc.icon className={`w-3 h-3 mr-1 ${tc.color}`} />
                          {tc.label}
                        </Badge>
                      );
                    })()}
                    {(() => {
                      const sc = STATUS_CONFIG[selectedItem.status as StatusType] ?? STATUS_CONFIG.pending;
                      return (
                        <Badge variant="outline" className={`text-[10px] ${sc.bg}`}>
                          <sc.icon className={`w-3 h-3 mr-1 ${sc.color}`} />
                          {sc.label}
                        </Badge>
                      );
                    })()}
                  </div>
                </div>

                {/* Detail Body */}
                <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
                  {/* User Info */}
                  <div>
                    <label className="text-[10px] text-muted-foreground/60 uppercase tracking-wider block mb-1.5">Submitted By</label>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center">
                        <User className="w-3.5 h-3.5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-xs text-foreground">{selectedItem.userName || "Anonymous"}</p>
                        {selectedItem.userEmail && (
                          <p className="text-[10px] text-muted-foreground/70">{selectedItem.userEmail}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Dates */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-muted-foreground/60 uppercase tracking-wider block mb-1">Submitted</label>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3 h-3 text-muted-foreground/60" />
                        <span className="text-xs text-muted-foreground">{formatDateTime(selectedItem.createdAt)}</span>
                      </div>
                    </div>
                    {selectedItem.reviewedAt && (
                      <div>
                        <label className="text-[10px] text-muted-foreground/60 uppercase tracking-wider block mb-1">Reviewed</label>
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3 h-3 text-muted-foreground/60" />
                          <span className="text-xs text-muted-foreground">{formatDateTime(selectedItem.reviewedAt)}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Rating */}
                  {selectedItem.rating && (
                    <div>
                      <label className="text-[10px] text-muted-foreground/60 uppercase tracking-wider block mb-1.5">Rating</label>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${i < selectedItem.rating! ? "text-amber-400 fill-amber-400" : "text-muted-foreground/50"}`}
                          />
                        ))}
                        <span className="text-xs text-muted-foreground ml-2">{selectedItem.rating}/5</span>
                      </div>
                    </div>
                  )}

                  {/* Section */}
                  {selectedItem.section && (
                    <div>
                      <label className="text-[10px] text-muted-foreground/60 uppercase tracking-wider block mb-1.5">Article Section</label>
                      <p className="text-xs text-foreground/90 bg-white/5 rounded-lg px-3 py-2">{selectedItem.section}</p>
                    </div>
                  )}

                  {/* Content */}
                  {selectedItem.content && (
                    <div>
                      <label className="text-[10px] text-muted-foreground/60 uppercase tracking-wider block mb-1.5">Feedback Content</label>
                      <div className="text-xs text-foreground/90 bg-white/5 rounded-lg px-3 py-2 leading-relaxed whitespace-pre-wrap max-h-40 overflow-y-auto">
                        {selectedItem.content}
                      </div>
                    </div>
                  )}

                  {/* Suggested Content */}
                  {selectedItem.suggestedContent && (
                    <div>
                      <label className="text-[10px] text-muted-foreground/60 uppercase tracking-wider block mb-1.5">Suggested Edit</label>
                      <div className="text-xs text-emerald-300 bg-emerald-500/5 border border-emerald-500/10 rounded-lg px-3 py-2 leading-relaxed whitespace-pre-wrap max-h-40 overflow-y-auto">
                        {selectedItem.suggestedContent}
                      </div>
                    </div>
                  )}

                  {/* Existing Review Notes */}
                  {selectedItem.reviewNotes && (
                    <div>
                      <label className="text-[10px] text-muted-foreground/60 uppercase tracking-wider block mb-1.5">Review Notes</label>
                      <div className="text-xs text-foreground/90 bg-violet-500/5 border border-violet-500/10 rounded-lg px-3 py-2 leading-relaxed">
                        {selectedItem.reviewNotes}
                      </div>
                    </div>
                  )}

                  {/* View Article Link */}
                  <a
                    href={`/wiki?article=${selectedItem.articleId}`}
                    className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors"
                  >
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    View Article in CirculWiki
                  </a>
                </div>

                {/* Review Actions */}
                {selectedItem.status === "pending" && (
                  <div className="p-4 border-t border-white/5 space-y-3">
                    <div>
                      <label className="text-[10px] text-muted-foreground/60 uppercase tracking-wider block mb-1.5">Review Notes (optional)</label>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Add review notes..."
                          value={reviewNotes}
                          onChange={(e) => setReviewNotes(e.target.value)}
                          className="bg-white/5 border-white/10 text-white placeholder:text-muted-foreground/60 h-8 text-xs"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        className="flex-1 h-8 text-xs bg-emerald-600 hover:bg-emerald-500 text-white"
                        onClick={() => handleReview(selectedItem.id, "approved")}
                        disabled={reviewMutation.isPending}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 h-8 text-xs border-red-500/30 text-red-400 hover:bg-red-500/10"
                        onClick={() => handleReview(selectedItem.id, "rejected")}
                        disabled={reviewMutation.isPending}
                      >
                        <XCircle className="w-3.5 h-3.5 mr-1" />
                        Reject
                      </Button>
                      {selectedItem.suggestedContent && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 h-8 text-xs border-violet-500/30 text-violet-400 hover:bg-violet-500/10"
                          onClick={() => handleReview(selectedItem.id, "merged")}
                          disabled={reviewMutation.isPending}
                        >
                          <GitMerge className="w-3.5 h-3.5 mr-1" />
                          Merge
                        </Button>
                      )}
                    </div>
                    {reviewMutation.isPending && (
                      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground/70">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Processing...
                      </div>
                    )}
                  </div>
                )}

                {/* Already reviewed info */}
                {selectedItem.status !== "pending" && (
                  <div className="p-4 border-t border-white/5">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground/70">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Reviewed {selectedItem.reviewedAt ? formatDateTime(selectedItem.reviewedAt) : ""}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
