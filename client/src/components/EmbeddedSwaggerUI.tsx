/**
 * EmbeddedSwaggerUI.tsx
 *
 * Renders an interactive Swagger UI panel directly inside the dashboard,
 * styled to match the platform's dark-green theme.
 *
 * Props:
 *  - specUrl: URL of the OpenAPI JSON spec to load
 *  - title:   Display label shown above the panel
 */
import { useEffect, useRef, useState } from "react";
import SwaggerUI from "swagger-ui-react";
import "swagger-ui-react/swagger-ui.css";

interface EmbeddedSwaggerUIProps {
  specUrl: string;
  title?: string;
  tryItOutEnabled?: boolean;
}

export function EmbeddedSwaggerUI({ specUrl, title, tryItOutEnabled }: EmbeddedSwaggerUIProps) {
  const [loaded, setLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Mark as loaded after first render so the spinner disappears
  useEffect(() => {
    const timer = setTimeout(() => setLoaded(true), 300);
    return () => clearTimeout(timer);
  }, [specUrl]);

  return (
    <div className="embedded-swagger-wrapper" ref={containerRef}>
      {/* Inline style block — scoped overrides for swagger-ui inside the dashboard */}
      <style>{`
        /* ── Container ─────────────────────────────────────────── */
        .embedded-swagger-wrapper .swagger-ui {
          font-family: inherit;
          color: #e2e8f0;
        }
        /* ── Hide the default top-bar (we have our own nav) ────── */
        .embedded-swagger-wrapper .swagger-ui .topbar,
        .embedded-swagger-wrapper .swagger-ui .information-container .info__extdocs {
          display: none !important;
        }
        /* ── Info block ─────────────────────────────────────────── */
        .embedded-swagger-wrapper .swagger-ui .info {
          margin: 12px 0 8px;
        }
        .embedded-swagger-wrapper .swagger-ui .info .title {
          color: #4ade80;
          font-size: 1.25rem;
          font-weight: 700;
        }
        .embedded-swagger-wrapper .swagger-ui .info .description p {
          color: #94a3b8;
          font-size: 0.85rem;
        }
        /* ── Background ─────────────────────────────────────────── */
        .embedded-swagger-wrapper .swagger-ui,
        .embedded-swagger-wrapper .swagger-ui .wrapper,
        .embedded-swagger-wrapper .swagger-ui .scheme-container {
          background: transparent !important;
        }
        /* ── Operation blocks ───────────────────────────────────── */
        .embedded-swagger-wrapper .swagger-ui .opblock {
          background: rgba(15, 30, 20, 0.6) !important;
          border: 1px solid rgba(74, 222, 128, 0.15) !important;
          border-radius: 8px !important;
          margin-bottom: 6px !important;
          box-shadow: none !important;
        }
        .embedded-swagger-wrapper .swagger-ui .opblock:hover {
          border-color: rgba(74, 222, 128, 0.35) !important;
        }
        .embedded-swagger-wrapper .swagger-ui .opblock.is-open {
          border-color: rgba(74, 222, 128, 0.4) !important;
        }
        /* ── Operation summary bar ──────────────────────────────── */
        .embedded-swagger-wrapper .swagger-ui .opblock .opblock-summary {
          background: transparent !important;
          border-bottom: none !important;
          padding: 8px 12px !important;
        }
        .embedded-swagger-wrapper .swagger-ui .opblock .opblock-summary-description,
        .embedded-swagger-wrapper .swagger-ui .opblock .opblock-summary-path,
        .embedded-swagger-wrapper .swagger-ui .opblock .opblock-summary-path__deprecated {
          color: #cbd5e1 !important;
          font-size: 0.82rem !important;
        }
        /* ── Method badges ──────────────────────────────────────── */
        .embedded-swagger-wrapper .swagger-ui .opblock-summary-method {
          border-radius: 4px !important;
          font-size: 0.7rem !important;
          font-weight: 700 !important;
          min-width: 52px !important;
          text-align: center !important;
        }
        /* ── Operation body ─────────────────────────────────────── */
        .embedded-swagger-wrapper .swagger-ui .opblock-body {
          background: rgba(10, 20, 14, 0.8) !important;
          border-top: 1px solid rgba(74, 222, 128, 0.12) !important;
        }
        /* ── Section labels ─────────────────────────────────────── */
        .embedded-swagger-wrapper .swagger-ui .opblock-section-header {
          background: rgba(22, 101, 52, 0.15) !important;
          border-bottom: 1px solid rgba(74, 222, 128, 0.1) !important;
        }
        .embedded-swagger-wrapper .swagger-ui .opblock-section-header h4,
        .embedded-swagger-wrapper .swagger-ui .opblock-section-header label {
          color: #4ade80 !important;
          font-size: 0.8rem !important;
        }
        /* ── Tables ─────────────────────────────────────────────── */
        .embedded-swagger-wrapper .swagger-ui table thead tr th,
        .embedded-swagger-wrapper .swagger-ui table thead tr td {
          color: #94a3b8 !important;
          font-size: 0.78rem !important;
          border-bottom: 1px solid rgba(74, 222, 128, 0.1) !important;
          background: transparent !important;
        }
        .embedded-swagger-wrapper .swagger-ui table tbody tr td {
          color: #cbd5e1 !important;
          font-size: 0.8rem !important;
          border-bottom: 1px solid rgba(255,255,255,0.04) !important;
          background: transparent !important;
        }
        /* ── Parameter names ─────────────────────────────────────── */
        .embedded-swagger-wrapper .swagger-ui .parameter__name {
          color: #4ade80 !important;
          font-size: 0.82rem !important;
          font-weight: 600 !important;
        }
        .embedded-swagger-wrapper .swagger-ui .parameter__type {
          color: #94a3b8 !important;
          font-size: 0.75rem !important;
        }
        /* ── Input fields ────────────────────────────────────────── */
        .embedded-swagger-wrapper .swagger-ui input[type=text],
        .embedded-swagger-wrapper .swagger-ui input[type=email],
        .embedded-swagger-wrapper .swagger-ui input[type=file],
        .embedded-swagger-wrapper .swagger-ui input[type=password],
        .embedded-swagger-wrapper .swagger-ui textarea,
        .embedded-swagger-wrapper .swagger-ui select {
          background: rgba(10, 20, 14, 0.9) !important;
          border: 1px solid rgba(74, 222, 128, 0.25) !important;
          color: #e2e8f0 !important;
          border-radius: 5px !important;
          font-size: 0.82rem !important;
        }
        .embedded-swagger-wrapper .swagger-ui input[type=text]:focus,
        .embedded-swagger-wrapper .swagger-ui textarea:focus {
          border-color: rgba(74, 222, 128, 0.6) !important;
          outline: none !important;
          box-shadow: 0 0 0 2px rgba(74, 222, 128, 0.12) !important;
        }
        /* ── Execute / Try it out buttons ───────────────────────── */
        .embedded-swagger-wrapper .swagger-ui .btn.execute {
          background: #166534 !important;
          border-color: #4ade80 !important;
          color: #4ade80 !important;
          font-size: 0.82rem !important;
          border-radius: 6px !important;
        }
        .embedded-swagger-wrapper .swagger-ui .btn.execute:hover {
          background: #14532d !important;
        }
        .embedded-swagger-wrapper .swagger-ui .try-out__btn {
          background: transparent !important;
          border: 1px solid rgba(74, 222, 128, 0.35) !important;
          color: #4ade80 !important;
          font-size: 0.78rem !important;
          border-radius: 5px !important;
        }
        .embedded-swagger-wrapper .swagger-ui .try-out__btn:hover {
          background: rgba(74, 222, 128, 0.08) !important;
        }
        /* ── Response code blocks ────────────────────────────────── */
        .embedded-swagger-wrapper .swagger-ui .responses-inner,
        .embedded-swagger-wrapper .swagger-ui .response-col_status {
          color: #94a3b8 !important;
          font-size: 0.8rem !important;
        }
        .embedded-swagger-wrapper .swagger-ui .highlight-code,
        .embedded-swagger-wrapper .swagger-ui .microlight {
          background: rgba(5, 12, 8, 0.9) !important;
          border: 1px solid rgba(74, 222, 128, 0.1) !important;
          border-radius: 6px !important;
          font-size: 0.78rem !important;
          color: #a3e635 !important;
        }
        /* ── Tag / group headers ─────────────────────────────────── */
        .embedded-swagger-wrapper .swagger-ui .opblock-tag {
          border-bottom: 1px solid rgba(74, 222, 128, 0.15) !important;
          color: #4ade80 !important;
          font-size: 0.95rem !important;
          font-weight: 600 !important;
          padding: 10px 0 8px !important;
        }
        .embedded-swagger-wrapper .swagger-ui .opblock-tag:hover {
          background: rgba(74, 222, 128, 0.04) !important;
        }
        .embedded-swagger-wrapper .swagger-ui .opblock-tag small {
          color: #64748b !important;
          font-size: 0.75rem !important;
        }
        /* ── Schema / model section ──────────────────────────────── */
        .embedded-swagger-wrapper .swagger-ui section.models {
          border: 1px solid rgba(74, 222, 128, 0.12) !important;
          border-radius: 8px !important;
          background: rgba(10, 20, 14, 0.4) !important;
        }
        .embedded-swagger-wrapper .swagger-ui section.models h4 {
          color: #4ade80 !important;
          font-size: 0.9rem !important;
        }
        .embedded-swagger-wrapper .swagger-ui .model-title {
          color: #94a3b8 !important;
          font-size: 0.82rem !important;
        }
        /* ── Auth lock icon ──────────────────────────────────────── */
        .embedded-swagger-wrapper .swagger-ui .authorization__btn svg,
        .embedded-swagger-wrapper .swagger-ui .unlocked svg {
          fill: #4ade80 !important;
        }
        /* ── Authorize dialog ────────────────────────────────────── */
        .embedded-swagger-wrapper .swagger-ui .dialog-ux .modal-ux {
          background: #0d1f17 !important;
          border: 1px solid rgba(74, 222, 128, 0.3) !important;
          border-radius: 10px !important;
        }
        .embedded-swagger-wrapper .swagger-ui .dialog-ux .modal-ux-header h3 {
          color: #4ade80 !important;
        }
        .embedded-swagger-wrapper .swagger-ui .dialog-ux .modal-ux-content p,
        .embedded-swagger-wrapper .swagger-ui .dialog-ux .modal-ux-content label {
          color: #94a3b8 !important;
        }
        /* ── Scrollbar ───────────────────────────────────────────── */
        .embedded-swagger-wrapper ::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .embedded-swagger-wrapper ::-webkit-scrollbar-track {
          background: rgba(10, 20, 14, 0.4);
        }
        .embedded-swagger-wrapper ::-webkit-scrollbar-thumb {
          background: rgba(74, 222, 128, 0.25);
          border-radius: 3px;
        }
        .embedded-swagger-wrapper ::-webkit-scrollbar-thumb:hover {
          background: rgba(74, 222, 128, 0.45);
        }
      `}</style>

      {!loaded && (
        <div className="flex items-center justify-center py-16 text-muted-foreground gap-3">
          <svg className="animate-spin h-5 w-5 text-emerald-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-sm">Loading {title ?? "API"} specification…</span>
        </div>
      )}

      <div style={{ display: loaded ? "block" : "none" }}>
        <SwaggerUI
          url={specUrl}
          docExpansion="list"
          defaultModelsExpandDepth={1}
          defaultModelExpandDepth={1}
          tryItOutEnabled={tryItOutEnabled ?? false}
          withCredentials={true}
          requestInterceptor={(req) => {
            req.headers["X-Requested-With"] = "SwaggerUI-Embedded";
            return req;
          }}
          onComplete={() => setLoaded(true)}
        />
      </div>
    </div>
  );
}
