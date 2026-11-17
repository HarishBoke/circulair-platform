import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { access } from "node:fs/promises";
import {
  assertDocumentPublishingAvailable, canReadDocumentMetadata, canonicalDocumentReportType,
  documentHtml, documentMetadataOnly, DOCUMENT_RENDER_LIMITS, escapeDocumentText,
  joinDocumentHtml, rejectUnverifiedPrivateDocumentDownload, renderDocumentPdf, withDocumentTimeout,
} from "./documentSecurity";

vi.mock("./storage", () => ({ storageGet: vi.fn(), storagePut: vi.fn() }));
import { storageGet, storagePut } from "./storage";

function rendererFixture() {
  const page = {
    setDefaultTimeout: vi.fn(), setDefaultNavigationTimeout: vi.fn(),
    setJavaScriptEnabled: vi.fn().mockResolvedValue(undefined),
    setBypassServiceWorker: vi.fn().mockResolvedValue(undefined),
    setRequestInterception: vi.fn().mockResolvedValue(undefined), on: vi.fn(),
    setContent: vi.fn().mockResolvedValue(undefined),
    pdf: vi.fn().mockResolvedValue(Buffer.from("%PDF-1.7 offline")),
    close: vi.fn().mockResolvedValue(undefined),
  };
  const kill = vi.fn().mockReturnValue(true);
  const browser = { newPage: vi.fn().mockResolvedValue(page), close: vi.fn().mockResolvedValue(undefined), process: vi.fn().mockReturnValue({ kill }) };
  const launch = vi.fn().mockResolvedValue(browser);
  return { page, browser, launch, kill };
}

beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.useRealTimers());

describe("document HTML encoding", () => {
  it("encodes text and both attribute quote types", () => {
    expect(escapeDocumentText(`<a title="x" data-v='y'>&`)).toBe("&lt;a title=&quot;x&quot; data-v=&#39;y&#39;&gt;&amp;");
    expect(escapeDocumentText(null)).toBe("");
    expect(escapeDocumentText(0)).toBe("0");
  });
  it("preserves only branded literal/nested fragments and escapes joined string data", () => {
    const cell = documentHtml`<td>${"<script>x</script>"}</td>`;
    expect(documentHtml`<table>${joinDocumentHtml([cell])}</table>`.value).toBe("<table><td>&lt;script&gt;x&lt;/script&gt;</td></table>");
    expect(documentHtml`<div>${{ value: "<script>x</script>" }}</div>`.value).toBe("<div>[object Object]</div>");
    expect(documentHtml`<div>${"&lt;img&gt;"}</div>`.value).toBe("<div>&amp;lt;img&amp;gt;</div>");
  });
});

describe("local renderer guard and cleanup", () => {
  const html = documentHtml`<!DOCTYPE html><html><head></head><body>Offline</body></html>`;
  it("renders only an in-memory PDF and removes its own temporary profile", async () => {
    const fixture = rendererFixture();
    expect(await renderDocumentPdf(html, fixture as never, "/offline/mock-chromium")).toEqual(Buffer.from("%PDF-1.7 offline"));
    const options = fixture.launch.mock.calls[0][0] as { userDataDir: string };
    await expect(access(options.userDataDir)).rejects.toThrow();
    expect(fixture.page.close).toHaveBeenCalledOnce();
    expect(fixture.browser.close).toHaveBeenCalledOnce();
    expect(fixture.page.pdf.mock.calls[0][0]).not.toHaveProperty("path");
  });
  it("rejects oversized HTML before creating or launching a renderer", async () => {
    const fixture = rendererFixture();
    await expect(renderDocumentPdf(documentHtml`${"x".repeat(DOCUMENT_RENDER_LIMITS.maxHtmlBytes + 1)}`, fixture as never, "/offline/mock")).rejects.toThrow("HTML exceeds");
    expect(fixture.launch).not.toHaveBeenCalled();
  });
  it("rejects invalid PDF output and closes renderer", async () => {
    const fixture = rendererFixture(); fixture.page.pdf.mockResolvedValue(Buffer.from("NOT-PDF"));
    await expect(renderDocumentPdf(html, fixture as never, "/offline/mock")).rejects.toThrow("invalid or oversized");
    expect(fixture.page.close).toHaveBeenCalledOnce(); expect(fixture.browser.close).toHaveBeenCalledOnce();
  });
  it("rejects oversized PDF output", async () => {
    const fixture = rendererFixture(); fixture.page.pdf.mockResolvedValue(Buffer.concat([Buffer.from("%PDF-"), Buffer.alloc(DOCUMENT_RENDER_LIMITS.maxPdfBytes)]));
    await expect(renderDocumentPdf(html, fixture as never, "/offline/mock")).rejects.toThrow("invalid or oversized");
  });
  it("does not render if JavaScript disable fails and cleans up", async () => {
    const fixture = rendererFixture(); fixture.page.setJavaScriptEnabled.mockRejectedValue(new Error("policy failed"));
    await expect(renderDocumentPdf(html, fixture as never, "/offline/mock")).rejects.toThrow("policy failed");
    expect(fixture.page.setContent).not.toHaveBeenCalled(); expect(fixture.browser.close).toHaveBeenCalledOnce();
  });
  it("does not render if request interception fails", async () => {
    const fixture = rendererFixture(); fixture.page.setRequestInterception.mockRejectedValue(new Error("deny failed"));
    await expect(renderDocumentPdf(html, fixture as never, "/offline/mock")).rejects.toThrow("deny failed");
    expect(fixture.page.setContent).not.toHaveBeenCalled(); expect(fixture.browser.close).toHaveBeenCalledOnce();
  });
  it("cleans temporary profile on launch failure without retrying insecure launch flags", async () => {
    const fixture = rendererFixture(); fixture.launch.mockRejectedValue(new Error("sandbox unavailable"));
    await expect(renderDocumentPdf(html, fixture as never, "/offline/mock")).rejects.toThrow("sandbox unavailable");
    expect(fixture.launch).toHaveBeenCalledOnce();
    await expect(access((fixture.launch.mock.calls[0][0] as { userDataDir: string }).userDataDir)).rejects.toThrow();
  });
  it("cleans browser on page-creation or content failure", async () => {
    const fixture = rendererFixture(); fixture.browser.newPage.mockRejectedValue(new Error("page failed"));
    await expect(renderDocumentPdf(html, fixture as never, "/offline/mock")).rejects.toThrow("page failed");
    expect(fixture.browser.close).toHaveBeenCalledOnce();
    const contentFixture = rendererFixture(); contentFixture.page.setContent.mockRejectedValue(new Error("content failed"));
    await expect(renderDocumentPdf(html, contentFixture as never, "/offline/mock")).rejects.toThrow("content failed");
    expect(contentFixture.page.close).toHaveBeenCalledOnce(); expect(contentFixture.browser.close).toHaveBeenCalledOnce();
  });
  it("kills only the owned mock browser process if graceful cleanup fails", async () => {
    const fixture = rendererFixture(); fixture.browser.close.mockRejectedValue(new Error("close failed"));
    await renderDocumentPdf(html, fixture as never, "/offline/mock");
    expect(fixture.kill).toHaveBeenCalledWith("SIGKILL");
  });
  it("reports failed process cleanup and still removes the profile", async () => {
    const fixture = rendererFixture(); fixture.browser.close.mockRejectedValue(new Error("close failed")); fixture.kill.mockReturnValue(false);
    await expect(renderDocumentPdf(html, fixture as never, "/offline/mock")).rejects.toThrow("cleanup failed");
    await expect(access((fixture.launch.mock.calls[0][0] as { userDataDir: string }).userDataDir)).rejects.toThrow();
  });
  it("denies HTTP/file/data requests without reading URLs or contacting any destination", async () => {
    const fixture = rendererFixture(); await renderDocumentPdf(html, fixture as never, "/offline/mock");
    const handler = fixture.page.on.mock.calls.find(([event]) => event === "request")![1];
    for (const label of ["http", "file", "data"]) {
      const abort = vi.fn().mockResolvedValue(undefined); const url = vi.fn(() => { throw new Error(`must not inspect ${label} URL`); });
      handler({ abort, url }); expect(abort).toHaveBeenCalledWith("blockedbyclient"); expect(url).not.toHaveBeenCalled();
    }
  });
  it("bounds a never-settling operation and clears the deadline on resolution", async () => {
    vi.useFakeTimers();
    const pending = withDocumentTimeout(new Promise(() => undefined), 10, "offline operation");
    const rejection = expect(pending).rejects.toThrow("timed out");
    await vi.advanceTimersByTimeAsync(10); await rejection;
    expect(await withDocumentTimeout(Promise.resolve("done"), 10, "offline operation")).toBe("done");
    expect(vi.getTimerCount()).toBe(0);
  });

  it("times out stalled content rendering and cleans browser plus temporary profile", async () => {
    vi.useFakeTimers();
    const fixture = rendererFixture();
    let contentStarted!: () => void;
    const started = new Promise<void>((resolve) => { contentStarted = resolve; });
    fixture.page.setContent.mockImplementation(() => { contentStarted(); return new Promise(() => undefined); });
    const result = renderDocumentPdf(html, fixture as never, "/offline/mock");
    const rejection = expect(result).rejects.toThrow("HTML rendering timed out");
    await started;
    await vi.advanceTimersByTimeAsync(DOCUMENT_RENDER_LIMITS.operationMs);
    await rejection;
    expect(fixture.page.pdf).not.toHaveBeenCalled();
    expect(fixture.page.close).toHaveBeenCalledOnce(); expect(fixture.browser.close).toHaveBeenCalledOnce();
    await expect(access((fixture.launch.mock.calls[0][0] as { userDataDir: string }).userDataDir)).rejects.toThrow();
  });

  it("rejects excess concurrent renders without launching another browser and releases both slots", async () => {
    const first = rendererFixture(); const second = rendererFixture(); const third = rendererFixture();
    let releaseFirst!: (value: Buffer) => void; let releaseSecond!: (value: Buffer) => void;
    first.page.pdf.mockReturnValue(new Promise<Buffer>((resolve) => { releaseFirst = resolve; }));
    second.page.pdf.mockReturnValue(new Promise<Buffer>((resolve) => { releaseSecond = resolve; }));
    const one = renderDocumentPdf(html, first as never, "/offline/mock");
    const two = renderDocumentPdf(html, second as never, "/offline/mock");
    try {
      await expect(renderDocumentPdf(html, third as never, "/offline/mock")).rejects.toThrow("busy");
      expect(third.launch).not.toHaveBeenCalled();
      for (let attempt = 0; attempt < 100 && (!first.page.pdf.mock.calls.length || !second.page.pdf.mock.calls.length); attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 2));
      }
      expect(first.page.pdf).toHaveBeenCalledOnce(); expect(second.page.pdf).toHaveBeenCalledOnce();
    } finally {
      releaseFirst(Buffer.from("%PDF-1.7 first")); releaseSecond(Buffer.from("%PDF-1.7 second"));
      await Promise.all([one, two]);
    }
    await renderDocumentPdf(html, third as never, "/offline/mock");
    expect(third.launch).toHaveBeenCalledOnce();
  });
});

describe("metadata ownership and fail-closed downloads", () => {
  const now = new Date("2026-11-18T00:00:00Z");
  it("permits only the uploader's nonexpired known-access-level metadata", () => {
    for (const accessLevel of ["public", "organization", "private", "government"]) {
      expect(canReadDocumentMetadata({ id: 7 }, { uploadedById: 7, accessLevel }, now)).toBe(true);
      expect(canReadDocumentMetadata({ id: 8 }, { uploadedById: 7, accessLevel }, now)).toBe(false);
    }
    expect(canReadDocumentMetadata({ id: 0 }, { uploadedById: 0, accessLevel: "private" }, now)).toBe(false);
    expect(canReadDocumentMetadata({ id: 7 }, { uploadedById: 7, accessLevel: "unknown" }, now)).toBe(false);
  });
  it("rejects expired, invalid-expiry and ownerless metadata", () => {
    for (const expiresAt of [now, "invalid", "2026-11-17T00:00:00Z"]) expect(canReadDocumentMetadata({ id: 7 }, { uploadedById: 7, accessLevel: "private", expiresAt }, now)).toBe(false);
    expect(canReadDocumentMetadata({ id: 7 }, { uploadedById: null, accessLevel: "public" }, now)).toBe(false);
  });
  it("strips storage URLs and keys even from permitted metadata", () => {
    expect(documentMetadataOnly({ id: 7 }, [{ uploadedById: 7, accessLevel: "private", fileUrl: "unsigned-private-link", fileKey: "private/object" }, { uploadedById: 8, accessLevel: "public" }], now)).toEqual([{ uploadedById: 7, accessLevel: "private", fileUrl: null, fileKey: null }]);
  });
  it("rejects private signing/publishing before invoking actual storage primitives", async () => {
    await expect(rejectUnverifiedPrivateDocumentDownload()).rejects.toThrow("unavailable");
    expect(() => assertDocumentPublishingAvailable()).toThrow("disabled");
    expect(storageGet).not.toHaveBeenCalled(); expect(storagePut).not.toHaveBeenCalled();
  });
  it("maps legacy report aliases to stored canonical types", () => {
    expect(canonicalDocumentReportType("epr_compliance")).toBe("compliance_report");
    expect(canonicalDocumentReportType("battery_cert")).toBe("battery_certificate");
    expect(canonicalDocumentReportType("health_passport")).toBe("health_passport");
  });
});
