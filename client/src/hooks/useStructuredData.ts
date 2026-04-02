import { useEffect } from "react";

/**
 * Injects a JSON-LD <script> tag into <head> and removes it on unmount.
 * Pass any valid Schema.org object (or array of objects).
 */
export function useStructuredData(schema: object | object[]) {
  useEffect(() => {
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = `ld-json-${Math.random().toString(36).slice(2)}`;
    script.textContent = JSON.stringify(schema);
    document.head.appendChild(script);
    return () => {
      script.remove();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}
