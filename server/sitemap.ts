import { Router } from "express";

const CANONICAL_DOMAIN = "https://www.circulair.energy";

interface SitemapEntry {
  path: string;
  priority: string;
  changefreq: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  lastmod?: string;
}

const PUBLIC_ROUTES: SitemapEntry[] = [
  // Core public pages — highest priority
  { path: "/",                priority: "1.0", changefreq: "weekly" },
  { path: "/marketplace",     priority: "0.9", changefreq: "daily" },
  { path: "/getting-started", priority: "0.8", changefreq: "monthly" },
  { path: "/wiki",            priority: "0.8", changefreq: "weekly" },
  { path: "/warranty/check",  priority: "0.7", changefreq: "monthly" },
  // Auth pages
  { path: "/login",           priority: "0.5", changefreq: "yearly" },
  { path: "/register",        priority: "0.5", changefreq: "yearly" },
];

function buildSitemap(entries: SitemapEntry[]): string {
  const today = new Date().toISOString().split("T")[0];

  const urls = entries
    .map(
      ({ path, priority, changefreq, lastmod }) => `
  <url>
    <loc>${CANONICAL_DOMAIN}${path}</loc>
    <lastmod>${lastmod ?? today}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`
    )
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}
</urlset>`;
}

export function createSitemapRouter(): Router {
  const router = Router();

  router.get("/sitemap.xml", (_req, res) => {
    const xml = buildSitemap(PUBLIC_ROUTES);
    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=86400"); // 24h cache
    res.send(xml);
  });

  return router;
}
