import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useStructuredData } from "@/hooks/useStructuredData";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import ArchitectureDiagram from "@/components/ArchitectureDiagram";
import {
  WIKI_CATEGORIES,
  WIKI_ARTICLES,
  searchWiki,
  getRelatedArticles,
  getArticlesByCategory,
  getWikiSystemPrompt,
  type WikiArticle,
  type WikiCategory,
  type WikiCategoryInfo,
} from "@/lib/wikiData";
import { trpc } from "@/lib/trpc";
import {
  Search,
  ArrowLeft,
  BookOpen,
  Clock,
  Tag,
  ChevronRight,
  ExternalLink,
  MessageSquare,
  Send,
  X,
  Loader2,
  LayoutDashboard,
  Zap,
  Shield,
  Plug,
  Boxes,
  Settings,
  Globe,
  Fingerprint,
  Layers,
  Users,
  Atom,
  TrendingDown,
  Brain,
  Activity,
  ShieldCheck,
  Award,
  Recycle,
  Leaf,
  Code,
  Bot,
  Wifi,
  Key,
  Server,
  Lock,
  Database,
  BadgeCheck,
  Store,
  PlusCircle,
  Cpu,
  FileText,
  Upload,
  Sparkles,
  ThumbsUp,
  ThumbsDown,
  AlertTriangle,
  Edit3,
  Star,
  CheckCircle2,
  Rocket,
  ChevronDown,
  ChevronUp,
  Heart,
} from "lucide-react";

// ─── ICON MAP ────────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  LayoutDashboard, Zap, Shield, Plug, Boxes, Settings, Globe, Fingerprint,
  Layers, Users, Atom, TrendingDown, Brain, Activity, ShieldCheck, Award,
  Recycle, Leaf, Code, Bot, Wifi, Key, Server, Lock, Database, BadgeCheck,
  Store, PlusCircle, Cpu, FileText, Upload,
};

function getIcon(name: string): React.ComponentType<{ className?: string; style?: React.CSSProperties }> {
  return ICON_MAP[name] || BookOpen;
}

// ─── ARTICLE-TO-DIAGRAM MAPPING ─────────────────────────────────────────────

const ARTICLE_DIAGRAM_MAP: Record<string, { type: "system" | "data-flow" | "security" | "modules"; title: string }> = {
  "platform-overview": { type: "system", title: "Platform Architecture" },
  "architecture-overview": { type: "system", title: "System Architecture" },
  "platform-modules": { type: "modules", title: "Platform Modules" },
  "security-architecture": { type: "security", title: "Security Architecture" },
  "data-model": { type: "data-flow", title: "Data Flow" },
  "telemetry-system": { type: "data-flow", title: "Telemetry Data Flow" },
  "mqtt-integration": { type: "data-flow", title: "MQTT Data Pipeline" },
  "rest-api": { type: "system", title: "API Architecture" },
  "mcp-integration": { type: "system", title: "MCP Integration Architecture" },
  "iso27001-compliance": { type: "security", title: "Security Controls" },
  "soc2-compliance": { type: "security", title: "SOC 2 Trust Services" },
};

// ─── MARKDOWN RENDERER ──────────────────────────────────────────────────────

function renderMarkdown(content: string): React.ReactNode {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Headers
    if (line.startsWith("### ")) {
      elements.push(
        <h3 key={key++} id={line.slice(4).toLowerCase().replace(/[^a-z0-9]+/g, "-")} className="text-lg font-semibold text-foreground mt-8 mb-3 scroll-mt-20">
          {line.slice(4)}
        </h3>
      );
      i++;
      continue;
    }
    if (line.startsWith("## ")) {
      elements.push(
        <h2 key={key++} id={line.slice(3).toLowerCase().replace(/[^a-z0-9]+/g, "-")} className="text-xl font-bold text-foreground mt-10 mb-4 scroll-mt-20 border-b border-border pb-2">
          {line.slice(3)}
        </h2>
      );
      i++;
      continue;
    }

    // Code blocks
    if (line.startsWith("```")) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      elements.push(
        <div key={key++} className="my-4 rounded-lg overflow-hidden border border-border">
          {lang && (
            <div className="bg-muted/50 px-4 py-1.5 text-xs text-muted-foreground font-mono border-b border-border">
              {lang}
            </div>
          )}
          <pre className="bg-background/80 p-4 overflow-x-auto text-sm">
            <code className="text-emerald-300 font-mono">{codeLines.join("\n")}</code>
          </pre>
        </div>
      );
      continue;
    }

    // Tables
    if (line.includes("|") && line.trim().startsWith("|")) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].includes("|") && lines[i].trim().startsWith("|")) {
        tableLines.push(lines[i]);
        i++;
      }
      if (tableLines.length >= 2) {
        const headers = tableLines[0].split("|").filter(Boolean).map((h) => h.trim());
        const rows = tableLines.slice(2).map((r) => r.split("|").filter(Boolean).map((c) => c.trim()));
        elements.push(
          <div key={key++} className="my-4 overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50">
                  {headers.map((h, hi) => (
                    <th key={hi} className="px-4 py-2.5 text-left text-foreground/90 font-medium whitespace-nowrap">
                      {renderInline(h)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, ri) => (
                  <tr key={ri} className="border-t border-white/5 hover:bg-white/[0.02]">
                    {row.map((cell, ci) => (
                      <td key={ci} className="px-4 py-2 text-muted-foreground">
                        {renderInline(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        continue;
      }
    }

    // Blockquotes
    if (line.startsWith("> ")) {
      elements.push(
        <blockquote key={key++} className="my-4 border-l-4 border-emerald-500/50 bg-emerald-500/5 px-4 py-3 text-foreground/90 italic rounded-r-lg">
          {renderInline(line.slice(2))}
        </blockquote>
      );
      i++;
      continue;
    }

    // List items
    if (line.match(/^[-*] /)) {
      const listItems: string[] = [];
      while (i < lines.length && lines[i].match(/^[-*] /)) {
        listItems.push(lines[i].slice(2));
        i++;
      }
      elements.push(
        <ul key={key++} className="my-3 space-y-1.5 pl-5">
          {listItems.map((item, li) => (
            <li key={li} className="text-muted-foreground list-disc marker:text-emerald-500/50">
              {renderInline(item)}
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Numbered lists
    if (line.match(/^\d+\. /)) {
      const listItems: string[] = [];
      while (i < lines.length && lines[i].match(/^\d+\. /)) {
        listItems.push(lines[i].replace(/^\d+\. /, ""));
        i++;
      }
      elements.push(
        <ol key={key++} className="my-3 space-y-1.5 pl-5">
          {listItems.map((item, li) => (
            <li key={li} className="text-muted-foreground list-decimal marker:text-emerald-500/50">
              {renderInline(item)}
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // Paragraphs
    if (line.trim()) {
      elements.push(
        <p key={key++} className="my-3 text-muted-foreground leading-relaxed">
          {renderInline(line)}
        </p>
      );
    }
    i++;
  }

  return <>{elements}</>;
}

function renderInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let k = 0;

  while (remaining.length > 0) {
    // Bold
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    if (boldMatch && boldMatch.index !== undefined) {
      if (boldMatch.index > 0) {
        parts.push(<span key={k++}>{renderCode(remaining.slice(0, boldMatch.index))}</span>);
      }
      parts.push(<strong key={k++} className="text-foreground font-semibold">{boldMatch[1]}</strong>);
      remaining = remaining.slice(boldMatch.index + boldMatch[0].length);
      continue;
    }
    // Inline code
    const codeMatch = remaining.match(/`(.+?)`/);
    if (codeMatch && codeMatch.index !== undefined) {
      if (codeMatch.index > 0) {
        parts.push(<span key={k++}>{remaining.slice(0, codeMatch.index)}</span>);
      }
      parts.push(
        <code key={k++} className="bg-muted text-emerald-300 px-1.5 py-0.5 rounded text-[0.85em] font-mono">
          {codeMatch[1]}
        </code>
      );
      remaining = remaining.slice(codeMatch.index + codeMatch[0].length);
      continue;
    }
    parts.push(<span key={k++}>{remaining}</span>);
    break;
  }

  return <>{parts}</>;
}

function renderCode(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let k = 0;
  while (remaining.length > 0) {
    const codeMatch = remaining.match(/`(.+?)`/);
    if (codeMatch && codeMatch.index !== undefined) {
      if (codeMatch.index > 0) parts.push(<span key={k++}>{remaining.slice(0, codeMatch.index)}</span>);
      parts.push(
        <code key={k++} className="bg-muted text-emerald-300 px-1.5 py-0.5 rounded text-[0.85em] font-mono">
          {codeMatch[1]}
        </code>
      );
      remaining = remaining.slice(codeMatch.index + codeMatch[0].length);
      continue;
    }
    parts.push(<span key={k++}>{remaining}</span>);
    break;
  }
  return <>{parts}</>;
}

// ─── TABLE OF CONTENTS ──────────────────────────────────────────────────────

function extractTOC(content: string): { id: string; title: string; level: number }[] {
  const toc: { id: string; title: string; level: number }[] = [];
  const lines = content.split("\n");
  for (const line of lines) {
    if (line.startsWith("### ")) {
      const title = line.slice(4);
      toc.push({ id: title.toLowerCase().replace(/[^a-z0-9]+/g, "-"), title, level: 3 });
    } else if (line.startsWith("## ")) {
      const title = line.slice(3);
      toc.push({ id: title.toLowerCase().replace(/[^a-z0-9]+/g, "-"), title, level: 2 });
    }
  }
  return toc;
}

// ─── AI CHAT COMPONENT ─────────────────────────────────────────────────────

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

function WikiChat({ onClose }: { onClose: () => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Hello! I'm **CirculWiki AI**, your intelligent guide to the Circul-AI-r platform. Ask me anything about battery lifecycle management, platform features, compliance, APIs, or battery science.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatMutation = trpc.wiki.chat.useMutation();

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || isLoading) return;
    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      // Search wiki for relevant articles
      const results = searchWiki(userMessage);
      const context = results
        .slice(0, 3)
        .map((a) => `[${a.title}]: ${a.summary}`)
        .join("\n");

      try {
        const response = await chatMutation.mutateAsync({
          message: userMessage,
          context,
          history: messages.slice(-6).map((m) => ({ role: m.role, content: m.content })),
        });
        setMessages((prev) => [...prev, { role: "assistant" as const, content: String(response.reply) }]);
      } catch {
        // Fallback to search-based response
        if (results.length > 0) {
          const reply = `Based on the knowledge base, here's what I found:\n\n${results
            .slice(0, 3)
            .map((a) => `**${a.title}**\n${a.summary}`)
            .join("\n\n")}\n\nWould you like me to go deeper into any of these topics?`;
          setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
        } else {
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: "I couldn't find a specific article. Try asking about platform features, battery chemistries, compliance, or APIs." },
          ]);
        }
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I encountered an error. Please try again." },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, chatMutation]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-background border border-border rounded-2xl shadow-2xl flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-foreground" />
            </div>
            <div>
              <h3 className="text-foreground font-semibold text-sm">CirculWiki AI</h3>
              <p className="text-muted-foreground/70 text-xs">Ask anything about the platform</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted/50 rounded-lg transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-emerald-600 text-foreground rounded-br-md"
                    : "bg-muted/50 text-foreground/90 rounded-bl-md border border-white/5"
                }`}
              >
                {renderInline(msg.content)}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-muted/50 rounded-2xl rounded-bl-md px-4 py-3 border border-white/5">
                <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-border">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Ask about batteries, compliance, APIs..."
              className="flex-1 bg-muted/50 border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition-colors"
            >
              <Send className="w-4 h-4 text-foreground" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── ARTICLE FEEDBACK COMPONENT ──────────────────────────────────────────────

function ArticleFeedback({ articleId, articleTitle }: { articleId: string; articleTitle: string }) {
  const { user } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [feedbackType, setFeedbackType] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [rating, setRating] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [hoveredStar, setHoveredStar] = useState(0);

  const submitMutation = trpc.wikiFeedback.submit.useMutation({
    onSuccess: () => {
      setSubmitted(true);
      setTimeout(() => {
        setExpanded(false);
        setSubmitted(false);
        setFeedbackType(null);
        setContent("");
        setRating(0);
      }, 2000);
    },
  });

  const handleSubmit = () => {
    if (!feedbackType) return;
    submitMutation.mutate({
      articleId,
      articleTitle,
      type: feedbackType as any,
      content: content || undefined,
      rating: rating > 0 ? rating : undefined,
    });
  };

  const FEEDBACK_TYPES = [
    { key: "rate_helpful", label: "Helpful", icon: ThumbsUp, color: "text-emerald-400" },
    { key: "rate_not_helpful", label: "Not helpful", icon: ThumbsDown, color: "text-amber-400" },
    { key: "suggest_edit", label: "Suggest edit", icon: Edit3, color: "text-blue-400" },
    { key: "flag_outdated", label: "Outdated", icon: AlertTriangle, color: "text-orange-400" },
    { key: "flag_inaccurate", label: "Inaccurate", icon: AlertTriangle, color: "text-red-400" },
    { key: "request_topic", label: "Request topic", icon: PlusCircle, color: "text-violet-400" },
  ];

  if (!user) return null;

  return (
    <div className="mt-10 pt-6 border-t border-white/5">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <Heart className="w-4 h-4" />
        Was this article helpful? Share your feedback
        {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>

      {expanded && (
        <div className="mt-4 p-5 bg-white/[0.02] border border-white/5 rounded-xl space-y-4 animate-in slide-in-from-top-2 duration-200">
          {submitted ? (
            <div className="flex items-center gap-3 text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
              <span className="text-sm">Thank you for your feedback!</span>
            </div>
          ) : (
            <>
              {/* Rating */}
              <div>
                <p className="text-xs text-muted-foreground/70 mb-2">Rate this article</p>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      onMouseEnter={() => setHoveredStar(s)}
                      onMouseLeave={() => setHoveredStar(0)}
                      onClick={() => setRating(s)}
                      className="p-0.5 transition-transform hover:scale-110"
                    >
                      <Star
                        className={`w-5 h-5 transition-colors ${
                          s <= (hoveredStar || rating)
                            ? "text-amber-400 fill-amber-400"
                            : "text-muted-foreground/60"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Feedback type */}
              <div>
                <p className="text-xs text-muted-foreground/70 mb-2">What kind of feedback?</p>
                <div className="flex flex-wrap gap-2">
                  {FEEDBACK_TYPES.map((ft) => {
                    const FtIcon = ft.icon;
                    return (
                      <button
                        key={ft.key}
                        onClick={() => setFeedbackType(ft.key)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border transition-all ${
                          feedbackType === ft.key
                            ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400"
                            : "border-border text-muted-foreground hover:border-border hover:text-foreground/90"
                        }`}
                      >
                        <FtIcon className={`w-3.5 h-3.5 ${feedbackType === ft.key ? "text-emerald-400" : ft.color}`} />
                        {ft.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Content */}
              {feedbackType && (
                <div>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder={
                      feedbackType === "suggest_edit"
                        ? "Describe what should be changed..."
                        : feedbackType === "request_topic"
                        ? "What topic would you like covered?"
                        : "Additional details (optional)..."
                    }
                    rows={3}
                    className="w-full bg-muted/50 border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:border-emerald-500/50 resize-none"
                  />
                </div>
              )}

              {/* Submit */}
              <div className="flex justify-end">
                <button
                  onClick={handleSubmit}
                  disabled={!feedbackType || submitMutation.isPending}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-sm text-foreground font-medium transition-colors"
                >
                  {submitMutation.isPending ? "Submitting..." : "Submit Feedback"}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── MAIN WIKI PAGE ─────────────────────────────────────────────────────────

export default function CirculWiki() {
  usePageTitle("CirculWiki");
  useStructuredData({
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": "CirculWiki — Battery Lifecycle Knowledge Base",
    "url": "https://www.circulair.energy/wiki",
    "description": "Community knowledge base covering battery lifecycle management, BPAN standards, SOH prediction, EPR compliance, and circular economy best practices.",
    "breadcrumb": {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://www.circulair.energy/" },
        { "@type": "ListItem", "position": 2, "name": "CirculWiki", "item": "https://www.circulair.energy/wiki" }
      ]
    }
  });

  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<WikiCategory | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<WikiArticle | null>(null);
  const [showChat, setShowChat] = useState(false);

  // Parse URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const articleId = params.get("article");
    const category = params.get("category") as WikiCategory | null;
    if (articleId) {
      const article = WIKI_ARTICLES.find((a) => a.id === articleId);
      if (article) {
        setSelectedArticle(article);
        setSelectedCategory(null);
      }
    } else if (category) {
      setSelectedCategory(category);
      setSelectedArticle(null);
    }
  }, []);

  const searchResults = useMemo(() => searchWiki(searchQuery), [searchQuery]);
  const categoryArticles = useMemo(
    () => (selectedCategory ? getArticlesByCategory(selectedCategory) : []),
    [selectedCategory]
  );
  const relatedArticles = useMemo(
    () => (selectedArticle ? getRelatedArticles(selectedArticle.id) : []),
    [selectedArticle]
  );
  const toc = useMemo(
    () => (selectedArticle ? extractTOC(selectedArticle.content) : []),
    [selectedArticle]
  );

  const openArticle = useCallback(
    (article: WikiArticle) => {
      setSelectedArticle(article);
      setSelectedCategory(null);
      setSearchQuery("");
      window.history.pushState({}, "", `/wiki?article=${article.id}`);
      window.scrollTo(0, 0);
    },
    []
  );

  const openCategory = useCallback((category: WikiCategory) => {
    setSelectedCategory(category);
    setSelectedArticle(null);
    setSearchQuery("");
    window.history.pushState({}, "", `/wiki?category=${category}`);
  }, []);

  const goHome = useCallback(() => {
    setSelectedArticle(null);
    setSelectedCategory(null);
    setSearchQuery("");
    window.history.pushState({}, "", "/wiki");
  }, []);

  const getCategoryInfo = useCallback(
    (id: WikiCategory): WikiCategoryInfo | undefined => WIKI_CATEGORIES.find((c) => c.id === id),
    []
  );

  // ── ARTICLE VIEW ──────────────────────────────────────────────────────────

  if (selectedArticle) {
    const catInfo = getCategoryInfo(selectedArticle.category);
    const ArticleIcon = getIcon(selectedArticle.icon);

    return (
      <div className="min-h-screen bg-background">
        {/* Top bar */}
        <div className="sticky top-0 z-30 bg-background/90 backdrop-blur-xl border-b border-white/5">
          <div className="max-w-7xl mx-auto px-6 py-3 flex items-center gap-4">
            <button onClick={goHome} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm">
              <ArrowLeft className="w-4 h-4" />
              CirculWiki
            </button>
            <ChevronRight className="w-3 h-3 text-muted-foreground/60" />
            <button
              onClick={() => openCategory(selectedArticle.category)}
              className="text-muted-foreground hover:text-foreground transition-colors text-sm"
            >
              {catInfo?.title}
            </button>
            <ChevronRight className="w-3 h-3 text-muted-foreground/60" />
            <span className="text-foreground text-sm font-medium truncate">{selectedArticle.title}</span>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-8 flex gap-8">
          {/* Sidebar TOC */}
          <aside className="hidden lg:block w-56 shrink-0">
            <div className="sticky top-20">
              <h4 className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider mb-3">On this page</h4>
              <nav className="space-y-1">
                {toc.map((item) => (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    className={`block text-sm py-1 transition-colors hover:text-emerald-400 ${
                      item.level === 3 ? "pl-4 text-muted-foreground/70" : "text-muted-foreground font-medium"
                    }`}
                  >
                    {item.title}
                  </a>
                ))}
              </nav>

              {relatedArticles.length > 0 && (
                <div className="mt-8 pt-6 border-t border-white/5">
                  <h4 className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider mb-3">Related</h4>
                  <div className="space-y-2">
                    {relatedArticles.map((ra) => (
                      <button
                        key={ra.id}
                        onClick={() => openArticle(ra)}
                        className="block w-full text-left text-sm text-muted-foreground hover:text-emerald-400 transition-colors py-1 truncate"
                      >
                        {ra.title}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </aside>

          {/* Main content */}
          <article className="flex-1 min-w-0">
            <div className="flex items-start gap-4 mb-8">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: `${catInfo?.color}20` }}
              >
                <ArticleIcon className="w-6 h-6" style={{ color: catInfo?.color }} />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{selectedArticle.title}</h1>
                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground/70">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    {selectedArticle.readTimeMinutes} min read
                  </span>
                  <span>Updated {selectedArticle.lastUpdated}</span>
                </div>
              </div>
            </div>

            <div className="bg-white/[0.02] border border-white/5 rounded-xl px-6 py-4 mb-8">
              <p className="text-foreground/90 leading-relaxed">{selectedArticle.summary}</p>
            </div>

            <div className="prose-wiki">{renderMarkdown(selectedArticle.content)}</div>

            {/* Embedded Architecture Diagram */}
            {ARTICLE_DIAGRAM_MAP[selectedArticle.id] && (
              <div className="mt-8 mb-8">
                <div className="flex items-center gap-2 mb-3">
                  <Boxes className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-semibold text-foreground/90">
                    {ARTICLE_DIAGRAM_MAP[selectedArticle.id].title} — Interactive Diagram
                  </h3>
                </div>
                <ArchitectureDiagram type={ARTICLE_DIAGRAM_MAP[selectedArticle.id].type} />
              </div>
            )}

            {/* Article Feedback */}
            <ArticleFeedback articleId={selectedArticle.id} articleTitle={selectedArticle.title} />

            {/* Tags */}
            <div className="mt-10 pt-6 border-t border-white/5">
              <div className="flex items-center gap-2 flex-wrap">
                <Tag className="w-3.5 h-3.5 text-muted-foreground/70" />
                {selectedArticle.tags.map((tag) => (
                  <span key={tag} className="px-2.5 py-1 bg-muted/50 text-muted-foreground text-xs rounded-full">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Related articles (mobile) */}
            {relatedArticles.length > 0 && (
              <div className="mt-8 lg:hidden">
                <h3 className="text-sm font-semibold text-muted-foreground mb-3">Related Articles</h3>
                <div className="grid gap-3">
                  {relatedArticles.map((ra) => {
                    const RaIcon = getIcon(ra.icon);
                    return (
                      <button
                        key={ra.id}
                        onClick={() => openArticle(ra)}
                        className="flex items-center gap-3 p-3 bg-white/[0.02] border border-white/5 rounded-xl hover:border-emerald-500/30 transition-all text-left"
                      >
                        <RaIcon className="w-4 h-4 text-emerald-400 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm text-foreground font-medium truncate">{ra.title}</p>
                          <p className="text-xs text-muted-foreground/70 truncate">{ra.summary}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </article>
        </div>

        {/* Chat FAB */}
        <button
          onClick={() => setShowChat(true)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full shadow-lg shadow-emerald-500/20 flex items-center justify-center hover:scale-105 transition-transform z-40"
        >
          <MessageSquare className="w-6 h-6 text-foreground" />
        </button>
        {showChat && <WikiChat onClose={() => setShowChat(false)} />}
      </div>
    );
  }

  // ── CATEGORY VIEW ─────────────────────────────────────────────────────────

  if (selectedCategory) {
    const catInfo = getCategoryInfo(selectedCategory);
    return (
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 z-30 bg-background/90 backdrop-blur-xl border-b border-white/5">
          <div className="max-w-7xl mx-auto px-6 py-3 flex items-center gap-4">
            <button onClick={goHome} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm">
              <ArrowLeft className="w-4 h-4" />
              CirculWiki
            </button>
            <ChevronRight className="w-3 h-3 text-muted-foreground/60" />
            <span className="text-foreground text-sm font-medium">{catInfo?.title}</span>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-6 py-10">
          <div className="mb-10">
            <h1 className="text-3xl font-bold text-foreground mb-2">{catInfo?.title}</h1>
            <p className="text-muted-foreground">{catInfo?.description}</p>
          </div>

          <div className="space-y-3">
            {categoryArticles.map((article) => {
              const AIcon = getIcon(article.icon);
              return (
                <button
                  key={article.id}
                  onClick={() => openArticle(article)}
                  className="w-full flex items-start gap-4 p-5 bg-white/[0.02] border border-white/5 rounded-xl hover:border-emerald-500/30 hover:bg-white/[0.04] transition-all text-left group"
                >
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${catInfo?.color}15` }}
                  >
                    <AIcon className="w-5 h-5" style={{ color: catInfo?.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-foreground font-medium group-hover:text-emerald-400 transition-colors">
                      {article.title}
                    </h3>
                    <p className="text-sm text-muted-foreground/70 mt-1 line-clamp-2">{article.summary}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground/60">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {article.readTimeMinutes} min
                      </span>
                      <span>{article.tags.slice(0, 3).join(", ")}</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/60 group-hover:text-emerald-400 transition-colors shrink-0 mt-1" />
                </button>
              );
            })}
          </div>
        </div>

        {/* Chat FAB */}
        <button
          onClick={() => setShowChat(true)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full shadow-lg shadow-emerald-500/20 flex items-center justify-center hover:scale-105 transition-transform z-40"
        >
          <MessageSquare className="w-6 h-6 text-foreground" />
        </button>
        {showChat && <WikiChat onClose={() => setShowChat(false)} />}
      </div>
    );
  }

  // ── HOME VIEW ─────────────────────────────────────────────────────────────

  const displayArticles = searchQuery ? searchResults : WIKI_ARTICLES.slice(0, 8);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/20 via-zinc-950 to-teal-900/10" />
        <div className="absolute inset-0">
          <div className="absolute top-20 left-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-teal-500/5 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-5xl mx-auto px-6 pt-16 pb-12 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-sm mb-6">
            <Sparkles className="w-4 h-4" />
            AI-Powered Knowledge Base
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-foreground mb-4">
            Circul<span className="text-emerald-400">Wiki</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10">
            Everything you need to know about the Circul-AI-r platform, battery lifecycle management, compliance, and integration — powered by AI.
          </p>

          {/* Search */}
          <div className="max-w-xl mx-auto relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/70" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search articles, concepts, APIs..."
              className="w-full bg-muted/50 border border-border rounded-2xl pl-12 pr-4 py-4 text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/10 text-lg"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded-lg"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>

          {searchQuery && (
            <p className="text-sm text-muted-foreground/70 mt-3">
              {searchResults.length} result{searchResults.length !== 1 ? "s" : ""} for "{searchQuery}"
            </p>
          )}
        </div>
      </div>

      {/* Categories */}
      {!searchQuery && (
        <div className="max-w-5xl mx-auto px-6 mb-12">
          <h2 className="text-lg font-semibold text-foreground mb-5">Browse by Category</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {WIKI_CATEGORIES.map((cat) => {
              const CatIcon = getIcon(cat.icon);
              const count = WIKI_ARTICLES.filter((a) => a.category === cat.id).length;
              return (
                <button
                  key={cat.id}
                  onClick={() => openCategory(cat.id)}
                  className="flex flex-col items-center gap-2.5 p-4 bg-white/[0.02] border border-white/5 rounded-xl hover:border-emerald-500/30 hover:bg-white/[0.04] transition-all group"
                >
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${cat.color}15` }}
                  >
                    <CatIcon className="w-5 h-5" style={{ color: cat.color }} />
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-foreground font-medium group-hover:text-emerald-400 transition-colors">
                      {cat.title}
                    </p>
                    <p className="text-xs text-muted-foreground/60 mt-0.5">{count} articles</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Articles */}
      <div className="max-w-5xl mx-auto px-6 pb-20">
        <h2 className="text-lg font-semibold text-foreground mb-5">
          {searchQuery ? "Search Results" : "Featured Articles"}
        </h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {displayArticles.map((article) => {
            const AIcon = getIcon(article.icon);
            const catInfo = getCategoryInfo(article.category);
            return (
              <button
                key={article.id}
                onClick={() => openArticle(article)}
                className="flex items-start gap-4 p-5 bg-white/[0.02] border border-white/5 rounded-xl hover:border-emerald-500/30 hover:bg-white/[0.04] transition-all text-left group"
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${catInfo?.color}15` }}
                >
                  <AIcon className="w-5 h-5" style={{ color: catInfo?.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ color: catInfo?.color, backgroundColor: `${catInfo?.color}15` }}>
                      {catInfo?.title}
                    </span>
                  </div>
                  <h3 className="text-foreground font-medium group-hover:text-emerald-400 transition-colors">
                    {article.title}
                  </h3>
                  <p className="text-sm text-muted-foreground/70 mt-1 line-clamp-2">{article.summary}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground/60">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {article.readTimeMinutes} min
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {!searchQuery && (
          <div className="mt-8 text-center">
            <p className="text-sm text-muted-foreground/70">
              {WIKI_ARTICLES.length} articles across {WIKI_CATEGORIES.length} categories
            </p>
          </div>
        )}
      </div>

      {/* Chat FAB */}
      <button
        onClick={() => setShowChat(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full shadow-lg shadow-emerald-500/20 flex items-center justify-center hover:scale-105 transition-transform z-40"
      >
        <MessageSquare className="w-6 h-6 text-foreground" />
      </button>
      {showChat && <WikiChat onClose={() => setShowChat(false)} />}
    </div>
  );
}
