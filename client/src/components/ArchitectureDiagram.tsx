import { useState, useCallback } from "react";
import {
  Globe, Server, Database, Shield, Bot, Wifi, Key, Layers,
  ArrowRight, ArrowDown, Monitor, Cpu, Lock, Cloud, Zap,
  FileText, Activity, Users, Store, Recycle, Award,
  Fingerprint, Brain,
} from "lucide-react";

// ─── TYPES ───────────────────────────────────────────────────────────────────

interface DiagramNode {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  color: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface DiagramEdge {
  from: string;
  to: string;
  label?: string;
  style?: "solid" | "dashed";
}

interface DiagramProps {
  type: "system" | "data-flow" | "security" | "modules";
}

// ─── DIAGRAM DATA ────────────────────────────────────────────────────────────

const SYSTEM_NODES: DiagramNode[] = [
  { id: "client", label: "React SPA", description: "React 19 + Tailwind 4 + tRPC client. Handles all user interactions, real-time updates, and responsive UI.", icon: Monitor, color: "#3b82f6", x: 50, y: 20, width: 180, height: 70 },
  { id: "trpc", label: "tRPC Gateway", description: "Type-safe RPC layer with 23 routers. Handles auth context, input validation, and procedure routing.", icon: Zap, color: "#8b5cf6", x: 50, y: 140, width: 180, height: 70 },
  { id: "rest", label: "REST API v1", description: "OpenAPI 3.1 compliant REST gateway at /api/v1. API key auth, rate limiting, versioned endpoints.", icon: Globe, color: "#06b6d4", x: 280, y: 140, width: 180, height: 70 },
  { id: "mcp", label: "MCP Server", description: "Model Context Protocol server at /api/mcp. 20 tools, 5 resources, 4 prompts for AI agent integration.", icon: Bot, color: "#10b981", x: 510, y: 140, width: 180, height: 70 },
  { id: "server", label: "Express Server", description: "Express 4 application server. Mounts tRPC, REST, MCP, OAuth, and static file serving.", icon: Server, color: "#f59e0b", x: 280, y: 280, width: 180, height: 70 },
  { id: "db", label: "MySQL / TiDB", description: "Relational database with 20+ tables. Drizzle ORM for type-safe queries. Stores all platform data.", icon: Database, color: "#ef4444", x: 130, y: 400, width: 180, height: 70 },
  { id: "s3", label: "S3 Storage", description: "Object storage for documents, reports, PDFs. CDN-backed URLs for fast delivery.", icon: Cloud, color: "#ec4899", x: 430, y: 400, width: 180, height: 70 },
  { id: "mqtt", label: "MQTT Broker", description: "Real-time telemetry ingestion via EMQX. Subscribed to CAI_/+ topics for battery data.", icon: Wifi, color: "#14b8a6", x: 510, y: 20, width: 180, height: 70 },
];

const SYSTEM_EDGES: DiagramEdge[] = [
  { from: "client", to: "trpc", label: "tRPC calls" },
  { from: "trpc", to: "server", label: "procedures" },
  { from: "rest", to: "server", label: "HTTP" },
  { from: "mcp", to: "server", label: "JSON-RPC" },
  { from: "server", to: "db", label: "Drizzle ORM" },
  { from: "server", to: "s3", label: "storagePut/Get" },
  { from: "mqtt", to: "server", label: "telemetry", style: "dashed" },
];

const DATA_FLOW_NODES: DiagramNode[] = [
  { id: "register", label: "Battery Registration", description: "Register new battery with manufacturer details, chemistry, capacity. Auto-generates BPAN.", icon: FileText, color: "#3b82f6", x: 50, y: 20, width: 200, height: 65 },
  { id: "bpan", label: "BPAN Generation", description: "Battery Passport Aadhaar Number — unique 16-char identifier encoding chemistry, origin, and capacity.", icon: Key, color: "#8b5cf6", x: 300, y: 20, width: 200, height: 65 },
  { id: "telemetry", label: "Telemetry Ingestion", description: "Real-time voltage, current, temperature, SOC data via MQTT or API push.", icon: Activity, color: "#10b981", x: 50, y: 130, width: 200, height: 65 },
  { id: "soh", label: "SOH Prediction", description: "AI-powered State of Health analysis using telemetry history. Predicts remaining useful life.", icon: Cpu, color: "#f59e0b", x: 300, y: 130, width: 200, height: 65 },
  { id: "triage", label: "Triage Decision", description: "Automated lifecycle decision: Reuse, Repurpose, Remanufacture, or Recycle based on SOH + warranty.", icon: Layers, color: "#ef4444", x: 550, y: 130, width: 200, height: 65 },
  { id: "warranty", label: "Warranty Check", description: "Multi-channel warranty verification. In-warranty batteries get priority repair path.", icon: Shield, color: "#06b6d4", x: 550, y: 20, width: 200, height: 65 },
  { id: "marketplace", label: "Marketplace Listing", description: "Second-life battery trading. Only out-of-warranty batteries with SOH verification eligible.", icon: Store, color: "#ec4899", x: 175, y: 250, width: 200, height: 65 },
  { id: "epr", label: "EPR Compliance", description: "Extended Producer Responsibility tracking. Carbon credits, recycling certificates, CPCB reporting.", icon: Award, color: "#14b8a6", x: 425, y: 250, width: 200, height: 65 },
  { id: "recycle", label: "End-of-Life", description: "Recycling tracking with material recovery rates. Feeds back into EPR compliance.", icon: Recycle, color: "#84cc16", x: 300, y: 350, width: 200, height: 65 },
];

const DATA_FLOW_EDGES: DiagramEdge[] = [
  { from: "register", to: "bpan", label: "auto-generate" },
  { from: "bpan", to: "warranty", label: "link" },
  { from: "telemetry", to: "soh", label: "analyze" },
  { from: "soh", to: "triage", label: "decision" },
  { from: "warranty", to: "triage", label: "status", style: "dashed" },
  { from: "triage", to: "marketplace", label: "reuse/repurpose" },
  { from: "triage", to: "epr", label: "compliance" },
  { from: "triage", to: "recycle", label: "recycle" },
  { from: "marketplace", to: "recycle", label: "end-of-life", style: "dashed" },
  { from: "epr", to: "recycle", label: "track", style: "dashed" },
];

const SECURITY_NODES: DiagramNode[] = [
  { id: "oauth", label: "JWT Auth", description: "Email/password authentication with JWT session cookies and bcrypt hashing.", icon: Users, color: "#3b82f6", x: 50, y: 20, width: 200, height: 65 },
  { id: "rbac", label: "Role-Based Access", description: "Admin/User roles with procedure-level enforcement. adminProcedure gates sensitive operations.", icon: Lock, color: "#8b5cf6", x: 300, y: 20, width: 200, height: 65 },
  { id: "apikey", label: "API Key Auth", description: "Scoped API keys with rate limiting. Keys have read/write/admin permission levels.", icon: Key, color: "#f59e0b", x: 550, y: 20, width: 200, height: 65 },
  { id: "audit", label: "Audit Logging", description: "ISO 27001 compliant audit trail. Every data access, modification, and auth event logged.", icon: FileText, color: "#10b981", x: 50, y: 140, width: 200, height: 65 },
  { id: "encrypt", label: "Encryption", description: "TLS in transit, AES-256 at rest. JWT tokens with HMAC-SHA256 signing.", icon: Shield, color: "#ef4444", x: 300, y: 140, width: 200, height: 65 },
  { id: "rate", label: "Rate Limiting", description: "Per-key and per-IP rate limiting. Configurable tiers: free (100/hr), standard (1000/hr), enterprise (10000/hr).", icon: Activity, color: "#06b6d4", x: 550, y: 140, width: 200, height: 65 },
  { id: "compliance", label: "SOC 2 / ISO 27001", description: "Continuous compliance monitoring. Data classification, access reviews, incident response procedures.", icon: Award, color: "#ec4899", x: 175, y: 260, width: 200, height: 65 },
  { id: "siem", label: "SIEM-Ready Logs", description: "Structured JSON logging with correlation IDs. Security events classified by severity.", icon: Server, color: "#14b8a6", x: 425, y: 260, width: 200, height: 65 },
];

const SECURITY_EDGES: DiagramEdge[] = [
  { from: "oauth", to: "rbac", label: "session" },
  { from: "rbac", to: "audit", label: "log access" },
  { from: "apikey", to: "rate", label: "enforce" },
  { from: "audit", to: "compliance", label: "evidence" },
  { from: "encrypt", to: "compliance", label: "controls" },
  { from: "rate", to: "siem", label: "events" },
  { from: "compliance", to: "siem", label: "alerts", style: "dashed" },
];

const MODULE_NODES: DiagramNode[] = [
  { id: "bpan-mod", label: "BPAN Registry", description: "Battery Passport Aadhaar Number system. Unique identity for every battery in the ecosystem.", icon: Fingerprint, color: "#3b82f6", x: 50, y: 20, width: 160, height: 60 },
  { id: "telemetry-mod", label: "Telemetry", description: "Real-time battery monitoring. Voltage, current, temperature, SOC tracking.", icon: Activity, color: "#10b981", x: 240, y: 20, width: 160, height: 60 },
  { id: "soh-mod", label: "SOH Prediction", description: "AI-powered health assessment. Degradation modeling and remaining life prediction.", icon: Brain, color: "#8b5cf6", x: 430, y: 20, width: 160, height: 60 },
  { id: "warranty-mod", label: "Warranty", description: "Full warranty lifecycle. Multi-channel lookup, claim workflow, expiry tracking.", icon: Shield, color: "#06b6d4", x: 620, y: 20, width: 160, height: 60 },
  { id: "marketplace-mod", label: "Marketplace", description: "Second-life battery trading platform. SOH-verified listings with pricing.", icon: Store, color: "#ec4899", x: 50, y: 120, width: 160, height: 60 },
  { id: "epr-mod", label: "EPR / Compliance", description: "Extended Producer Responsibility. Carbon credits, recycling certificates.", icon: Award, color: "#14b8a6", x: 240, y: 120, width: 160, height: 60 },
  { id: "logistics-mod", label: "Logistics", description: "Shipment tracking with chain-of-custody. Multi-carrier support.", icon: Globe, color: "#f59e0b", x: 430, y: 120, width: 160, height: 60 },
  { id: "ai-mod", label: "AI Copilot", description: "Natural language interface for platform operations. Context-aware assistance.", icon: Bot, color: "#84cc16", x: 620, y: 120, width: 160, height: 60 },
  { id: "admin-mod", label: "Super Admin", description: "System oversight dashboard. Agent action tracking, health monitoring.", icon: Cpu, color: "#ef4444", x: 175, y: 220, width: 160, height: 60 },
  { id: "wiki-mod", label: "CirculWiki", description: "AI-powered knowledge base. 24+ articles, search, cross-references.", icon: FileText, color: "#a855f7", x: 430, y: 220, width: 160, height: 60 },
];

const MODULE_EDGES: DiagramEdge[] = [
  { from: "bpan-mod", to: "telemetry-mod" },
  { from: "telemetry-mod", to: "soh-mod" },
  { from: "soh-mod", to: "warranty-mod", style: "dashed" },
  { from: "bpan-mod", to: "marketplace-mod" },
  { from: "marketplace-mod", to: "epr-mod" },
  { from: "epr-mod", to: "logistics-mod" },
  { from: "soh-mod", to: "ai-mod", style: "dashed" },
  { from: "admin-mod", to: "wiki-mod", style: "dashed" },
];

// ─── DIAGRAM CONFIGS ─────────────────────────────────────────────────────────

const DIAGRAMS: Record<string, { title: string; subtitle: string; nodes: DiagramNode[]; edges: DiagramEdge[]; width: number; height: number }> = {
  system: { title: "System Architecture", subtitle: "How the platform components connect", nodes: SYSTEM_NODES, edges: SYSTEM_EDGES, width: 740, height: 500 },
  "data-flow": { title: "Battery Lifecycle Data Flow", subtitle: "From registration to end-of-life", nodes: DATA_FLOW_NODES, edges: DATA_FLOW_EDGES, width: 800, height: 450 },
  security: { title: "Security Architecture", subtitle: "Authentication, authorization, and compliance layers", nodes: SECURITY_NODES, edges: SECURITY_EDGES, width: 800, height: 360 },
  modules: { title: "Platform Modules", subtitle: "Feature modules and their relationships", nodes: MODULE_NODES, edges: MODULE_EDGES, width: 830, height: 320 },
};

// ─── COMPONENT ───────────────────────────────────────────────────────────────

export default function ArchitectureDiagram({ type }: DiagramProps) {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const diagram = DIAGRAMS[type];

  if (!diagram) return null;

  const { title, subtitle, nodes, edges, width, height } = diagram;

  const getNodeCenter = useCallback(
    (id: string) => {
      const node = nodes.find((n) => n.id === id);
      if (!node) return { x: 0, y: 0 };
      return { x: node.x + node.width / 2, y: node.y + node.height / 2 };
    },
    [nodes]
  );

  const selectedNodeData = nodes.find((n) => n.id === selectedNode);

  return (
    <div className="my-8 rounded-xl border border-white/10 bg-zinc-900/50 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          <p className="text-xs text-zinc-500">{subtitle}</p>
        </div>
        <span className="text-[10px] font-mono text-zinc-600 bg-white/5 px-2 py-1 rounded">
          Interactive
        </span>
      </div>

      {/* Diagram */}
      <div className="p-4 overflow-x-auto">
        <svg
          viewBox={`-10 -10 ${width + 20} ${height + 20}`}
          className="w-full"
          style={{ minWidth: 600, maxHeight: 500 }}
        >
          <defs>
            <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="#4b5563" />
            </marker>
            <marker id="arrowhead-active" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="#10b981" />
            </marker>
          </defs>

          {/* Edges */}
          {edges.map((edge, i) => {
            const from = getNodeCenter(edge.from);
            const to = getNodeCenter(edge.to);
            const isActive = hoveredNode === edge.from || hoveredNode === edge.to;
            const midX = (from.x + to.x) / 2;
            const midY = (from.y + to.y) / 2;

            return (
              <g key={i}>
                <line
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  stroke={isActive ? "#10b981" : "#374151"}
                  strokeWidth={isActive ? 2 : 1}
                  strokeDasharray={edge.style === "dashed" ? "6,4" : undefined}
                  markerEnd={isActive ? "url(#arrowhead-active)" : "url(#arrowhead)"}
                  className="transition-all duration-200"
                />
                {edge.label && (
                  <text
                    x={midX}
                    y={midY - 6}
                    textAnchor="middle"
                    className="text-[9px] fill-zinc-500"
                    style={{ fontFamily: "system-ui" }}
                  >
                    {edge.label}
                  </text>
                )}
              </g>
            );
          })}

          {/* Nodes */}
          {nodes.map((node) => {
            const Icon = node.icon;
            const isHovered = hoveredNode === node.id;
            const isSelected = selectedNode === node.id;

            return (
              <g
                key={node.id}
                onMouseEnter={() => setHoveredNode(node.id)}
                onMouseLeave={() => setHoveredNode(null)}
                onClick={() => setSelectedNode(selectedNode === node.id ? null : node.id)}
                className="cursor-pointer"
              >
                <rect
                  x={node.x}
                  y={node.y}
                  width={node.width}
                  height={node.height}
                  rx={12}
                  fill={isHovered || isSelected ? `${node.color}20` : "#18181b"}
                  stroke={isHovered || isSelected ? node.color : "#27272a"}
                  strokeWidth={isHovered || isSelected ? 2 : 1}
                  className="transition-all duration-200"
                />
                <foreignObject
                  x={node.x + 12}
                  y={node.y + (node.height - 20) / 2}
                  width={20}
                  height={20}
                >
                  <div style={{ color: node.color }} className="flex items-center justify-center w-5 h-5">
                    <Icon className="w-4 h-4" />
                  </div>
                </foreignObject>
                <text
                  x={node.x + 38}
                  y={node.y + node.height / 2 + 1}
                  dominantBaseline="middle"
                  className="text-[11px] font-medium fill-zinc-200"
                  style={{ fontFamily: "system-ui" }}
                >
                  {node.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Detail panel */}
      {selectedNodeData && (
        <div className="px-5 py-3 border-t border-white/5 bg-white/[0.02]">
          <div className="flex items-start gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ backgroundColor: `${selectedNodeData.color}20` }}
            >
              <selectedNodeData.icon className="w-4 h-4" style={{ color: selectedNodeData.color }} />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">{selectedNodeData.label}</h4>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{selectedNodeData.description}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── KNOWLEDGE GRAPH COMPONENT ───────────────────────────────────────────────

interface KnowledgeGraphProps {
  currentArticleId: string;
  articles: { id: string; title: string; category: string; relatedIds: string[] }[];
  onNavigate: (articleId: string) => void;
}

export function KnowledgeGraph({ currentArticleId, articles, onNavigate }: KnowledgeGraphProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Build a mini-graph around the current article
  const currentArticle = articles.find((a) => a.id === currentArticleId);
  if (!currentArticle) return null;

  const relatedIds = new Set(currentArticle.relatedIds);
  const graphArticles = articles.filter(
    (a) => a.id === currentArticleId || relatedIds.has(a.id)
  );

  if (graphArticles.length <= 1) return null;

  // Position nodes in a radial layout
  const centerX = 200;
  const centerY = 120;
  const radius = 90;
  const relatedList = graphArticles.filter((a) => a.id !== currentArticleId);

  const CATEGORY_COLORS: Record<string, string> = {
    platform: "#3b82f6",
    battery: "#10b981",
    compliance: "#f59e0b",
    integration: "#8b5cf6",
    architecture: "#ef4444",
    operations: "#06b6d4",
  };

  return (
    <div className="my-6 rounded-xl border border-white/10 bg-zinc-900/50 overflow-hidden">
      <div className="px-5 py-3 border-b border-white/5">
        <h3 className="text-sm font-semibold text-white">Knowledge Graph</h3>
        <p className="text-xs text-zinc-500">Related articles and concepts</p>
      </div>
      <div className="p-4">
        <svg viewBox="0 0 400 240" className="w-full" style={{ maxHeight: 240 }}>
          {/* Edges */}
          {relatedList.map((article, i) => {
            const angle = (2 * Math.PI * i) / relatedList.length - Math.PI / 2;
            const x = centerX + radius * Math.cos(angle);
            const y = centerY + radius * Math.sin(angle);
            const isHovered = hoveredId === article.id;
            return (
              <line
                key={`edge-${article.id}`}
                x1={centerX}
                y1={centerY}
                x2={x}
                y2={y}
                stroke={isHovered ? "#10b981" : "#27272a"}
                strokeWidth={isHovered ? 2 : 1}
                className="transition-all duration-200"
              />
            );
          })}

          {/* Related nodes */}
          {relatedList.map((article, i) => {
            const angle = (2 * Math.PI * i) / relatedList.length - Math.PI / 2;
            const x = centerX + radius * Math.cos(angle);
            const y = centerY + radius * Math.sin(angle);
            const isHovered = hoveredId === article.id;
            const color = CATEGORY_COLORS[article.category] || "#6b7280";

            return (
              <g
                key={article.id}
                onMouseEnter={() => setHoveredId(article.id)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={() => onNavigate(article.id)}
                className="cursor-pointer"
              >
                <circle
                  cx={x}
                  cy={y}
                  r={isHovered ? 22 : 18}
                  fill={isHovered ? `${color}30` : "#18181b"}
                  stroke={isHovered ? color : "#27272a"}
                  strokeWidth={isHovered ? 2 : 1}
                  className="transition-all duration-200"
                />
                <text
                  x={x}
                  y={y + 30}
                  textAnchor="middle"
                  className="text-[8px] fill-zinc-400"
                  style={{ fontFamily: "system-ui" }}
                >
                  {article.title.length > 18 ? article.title.slice(0, 18) + "..." : article.title}
                </text>
              </g>
            );
          })}

          {/* Center node */}
          <circle
            cx={centerX}
            cy={centerY}
            r={28}
            fill="#10b98120"
            stroke="#10b981"
            strokeWidth={2}
          />
          <text
            x={centerX}
            y={centerY + 2}
            textAnchor="middle"
            dominantBaseline="middle"
            className="text-[9px] font-semibold fill-emerald-400"
            style={{ fontFamily: "system-ui" }}
          >
            Current
          </text>
        </svg>
      </div>
    </div>
  );
}
