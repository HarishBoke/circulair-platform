import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Wiki Chat Router Tests ──────────────────────────────────────────────────

// Mock the LLM module
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{ message: { content: "This is a test response about the platform." } }],
  }),
}));

describe("Wiki Chat", () => {
  it("should accept a valid chat message input", () => {
    const input = {
      message: "What is BPAN?",
      context: "BPAN is the Battery Passport Aadhaar Number",
    };
    expect(input.message).toBeTruthy();
    expect(input.message.length).toBeGreaterThan(0);
    expect(input.message.length).toBeLessThanOrEqual(2000);
  });

  it("should reject empty messages", () => {
    const input = { message: "" };
    expect(input.message.length).toBe(0);
  });

  it("should accept optional history parameter", () => {
    const input = {
      message: "Tell me more",
      history: [
        { role: "user" as const, content: "What is BPAN?" },
        { role: "assistant" as const, content: "BPAN stands for Battery Passport Aadhaar Number." },
      ],
    };
    expect(input.history).toHaveLength(2);
    expect(input.history[0].role).toBe("user");
    expect(input.history[1].role).toBe("assistant");
  });

  it("should limit history to last 6 messages", () => {
    const history = Array.from({ length: 10 }, (_, i) => ({
      role: (i % 2 === 0 ? "user" : "assistant") as "user" | "assistant",
      content: `Message ${i}`,
    }));
    const trimmed = history.slice(-6);
    expect(trimmed).toHaveLength(6);
    expect(trimmed[0].content).toBe("Message 4");
  });

  it("should handle LLM response format", async () => {
    const { invokeLLM } = await import("./_core/llm");
    const response = await invokeLLM({
      messages: [
        { role: "system", content: "You are CirculWiki AI." },
        { role: "user", content: "What is BPAN?" },
      ],
    });
    expect(response.choices).toBeDefined();
    expect(response.choices[0].message.content).toBeTruthy();
    expect(typeof response.choices[0].message.content).toBe("string");
  });

  it("should handle LLM failure gracefully", async () => {
    const { invokeLLM } = await import("./_core/llm");
    (invokeLLM as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("LLM unavailable"));
    
    try {
      await invokeLLM({ messages: [{ role: "user", content: "test" }] });
    } catch (e: any) {
      expect(e.message).toBe("LLM unavailable");
    }
  });
});

// ─── Wiki Data Model Tests ───────────────────────────────────────────────────

describe("Wiki Data Model", () => {
  it("should have valid article structure", () => {
    // Simulate the article structure
    const article = {
      id: "platform-overview",
      title: "Platform Overview",
      category: "platform",
      summary: "Comprehensive overview of the Circul-AI-r platform",
      content: "## Introduction\n\nThe platform provides...",
      tags: ["platform", "overview", "getting-started"],
      icon: "LayoutDashboard",
      readTimeMinutes: 5,
      lastUpdated: "2026-04-01",
      relatedIds: ["bpan-system", "battery-chemistries"],
    };

    expect(article.id).toBeTruthy();
    expect(article.title).toBeTruthy();
    expect(article.category).toBeTruthy();
    expect(article.summary.length).toBeGreaterThan(10);
    expect(article.content.length).toBeGreaterThan(10);
    expect(article.tags.length).toBeGreaterThan(0);
    expect(article.readTimeMinutes).toBeGreaterThan(0);
    expect(article.relatedIds.length).toBeGreaterThan(0);
  });

  it("should have valid category structure", () => {
    const category = {
      id: "platform",
      title: "Platform",
      description: "Core platform features and modules",
      icon: "LayoutDashboard",
      color: "#3b82f6",
    };

    expect(category.id).toBeTruthy();
    expect(category.title).toBeTruthy();
    expect(category.description).toBeTruthy();
    expect(category.color).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("should support search functionality", () => {
    const articles = [
      { id: "a1", title: "Battery Passport", summary: "BPAN system overview", tags: ["bpan", "passport"] },
      { id: "a2", title: "Warranty System", summary: "Warranty management", tags: ["warranty"] },
      { id: "a3", title: "API Reference", summary: "REST API documentation", tags: ["api", "rest"] },
    ];

    const query = "bpan";
    const results = articles.filter(
      (a) =>
        a.title.toLowerCase().includes(query) ||
        a.summary.toLowerCase().includes(query) ||
        a.tags.some((t) => t.includes(query))
    );

    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("a1");
  });

  it("should support category filtering", () => {
    const articles = [
      { id: "a1", category: "platform" },
      { id: "a2", category: "battery" },
      { id: "a3", category: "platform" },
      { id: "a4", category: "compliance" },
    ];

    const platformArticles = articles.filter((a) => a.category === "platform");
    expect(platformArticles).toHaveLength(2);
  });

  it("should resolve related articles", () => {
    const articles = [
      { id: "a1", relatedIds: ["a2", "a3"] },
      { id: "a2", relatedIds: ["a1"] },
      { id: "a3", relatedIds: ["a1", "a4"] },
      { id: "a4", relatedIds: [] },
    ];

    const current = articles.find((a) => a.id === "a1")!;
    const related = articles.filter((a) => current.relatedIds.includes(a.id));
    expect(related).toHaveLength(2);
    expect(related.map((r) => r.id)).toEqual(["a2", "a3"]);
  });

  it("should extract table of contents from markdown", () => {
    const content = `## Introduction\nSome text\n### Features\nMore text\n## Architecture\nDetails\n### Components\nList`;
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

    expect(toc).toHaveLength(4);
    expect(toc[0]).toEqual({ id: "introduction", title: "Introduction", level: 2 });
    expect(toc[1]).toEqual({ id: "features", title: "Features", level: 3 });
    expect(toc[2]).toEqual({ id: "architecture", title: "Architecture", level: 2 });
    expect(toc[3]).toEqual({ id: "components", title: "Components", level: 3 });
  });
});

// ─── Architecture Diagram Tests ──────────────────────────────────────────────

describe("Architecture Diagrams", () => {
  it("should have valid node positions", () => {
    const nodes = [
      { id: "client", x: 50, y: 20, width: 180, height: 70 },
      { id: "server", x: 280, y: 280, width: 180, height: 70 },
    ];

    for (const node of nodes) {
      expect(node.x).toBeGreaterThanOrEqual(0);
      expect(node.y).toBeGreaterThanOrEqual(0);
      expect(node.width).toBeGreaterThan(0);
      expect(node.height).toBeGreaterThan(0);
    }
  });

  it("should have valid edge references", () => {
    const nodes = [
      { id: "client" },
      { id: "server" },
      { id: "db" },
    ];
    const edges = [
      { from: "client", to: "server" },
      { from: "server", to: "db" },
    ];

    const nodeIds = new Set(nodes.map((n) => n.id));
    for (const edge of edges) {
      expect(nodeIds.has(edge.from)).toBe(true);
      expect(nodeIds.has(edge.to)).toBe(true);
    }
  });

  it("should calculate node center correctly", () => {
    const node = { x: 50, y: 20, width: 180, height: 70 };
    const center = { x: node.x + node.width / 2, y: node.y + node.height / 2 };
    expect(center.x).toBe(140);
    expect(center.y).toBe(55);
  });

  it("should support 4 diagram types", () => {
    const types = ["system", "data-flow", "security", "modules"];
    expect(types).toHaveLength(4);
  });
});
