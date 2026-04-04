import { trpc } from "@/lib/trpc";
import { UNAUTHED_ERR_MSG } from '@shared/const';
import { TelemetrySocketProvider } from "./contexts/TelemetrySocketContext";
import { PlatformSettingsProvider } from "./contexts/PlatformSettingsContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import { toast } from "sonner";
import App from "./App";
import "./index.css";

const queryClient = new QueryClient();

/**
 * Tracks whether the user has ever been confirmed authenticated in this browser
 * session. Populated the first time auth.me returns a user object.
 * Used to distinguish:
 *   - Initial page load on /login (unauthenticated from the start → silent)
 *   - Mid-session expiry (was authenticated, now 401 → show toast + redirect)
 */
let hadActiveSession = false;

// Watch auth.me query results to detect when a session becomes active
queryClient.getQueryCache().subscribe(event => {
  if (
    event.type === "updated" &&
    event.action.type === "success" &&
    (event.query.queryKey as string[])[0]?.includes?.("auth")
  ) {
    const data = event.query.state.data as { id?: number } | undefined;
    if (data?.id) {
      hadActiveSession = true;
    }
  }
});

const handleUnauthorized = (error: unknown, source: "query" | "mutation") => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;

  const isUnauthorized = error.message === UNAUTHED_ERR_MSG;
  if (!isUnauthorized) return;

  // Don't redirect if already on a public auth page
  const path = window.location.pathname;
  const publicPaths = ["/login", "/register", "/forgot-password", "/reset-password"];
  if (publicPaths.includes(path)) return;

  if (hadActiveSession) {
    // Mid-session expiry — show a graceful toast before redirecting
    toast.error("Session expired", {
      description: "Your session has expired. Please sign in again.",
      duration: 4000,
      onAutoClose: () => {
        window.location.href = "/login";
      },
      onDismiss: () => {
        window.location.href = "/login";
      },
    });
    // Fallback redirect in case toast callbacks don't fire
    setTimeout(() => {
      window.location.href = "/login";
    }, 4500);
  } else {
    // Initial page load unauthenticated — silent redirect
    window.location.href = "/login";
  }
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    handleUnauthorized(error, "query");

    // Suppress expected 401 "Please login" errors — these fire on /login before
    // auth is established and are not actionable by the user or developer.
    const isExpectedAuthError =
      error instanceof TRPCClientError && error.message === UNAUTHED_ERR_MSG;
    if (!isExpectedAuthError) {
      console.error("[API Query Error]", error);
    }
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    handleUnauthorized(error, "mutation");

    const isExpectedAuthError =
      error instanceof TRPCClientError && error.message === UNAUTHED_ERR_MSG;
    if (!isExpectedAuthError) {
      console.error("[API Mutation Error]", error);
    }
  }
});

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      fetch(input, init) {
        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
        });
      },
    }),
  ],
});

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <TelemetrySocketProvider>
        <PlatformSettingsProvider>
          <App />
        </PlatformSettingsProvider>
      </TelemetrySocketProvider>
    </QueryClientProvider>
  </trpc.Provider>
);
