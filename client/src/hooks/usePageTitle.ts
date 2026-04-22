import { useEffect } from "react";

const SITE_NAME = "Circul-AI-r";

/**
 * Sets document.title for the current page and restores the default on unmount.
 * Format: "<pageTitle> - Circul-AI-r"
 */
export function usePageTitle(pageTitle: string) {
  useEffect(() => {
    const previous = document.title;
    document.title = `${pageTitle} - ${SITE_NAME}`;
    return () => {
      document.title = previous;
    };
  }, [pageTitle]);
}
