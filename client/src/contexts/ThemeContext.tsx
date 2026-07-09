import React, { createContext, useContext, useEffect, useState, useRef } from "react";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme?: (event?: React.MouseEvent) => void;
  switchable: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  switchable?: boolean;
}

/** Apply the .dark class to <html> and update localStorage */
function applyTheme(theme: Theme, switchable: boolean) {
  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
  if (switchable) {
    localStorage.setItem("theme", theme);
  }
}

export function ThemeProvider({
  children,
  defaultTheme = "light",
  switchable = false,
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (switchable) {
      const stored = localStorage.getItem("theme");
      return (stored as Theme) || defaultTheme;
    }
    return defaultTheme;
  });

  // Sync on mount and whenever theme changes
  useEffect(() => {
    applyTheme(theme, switchable);
  }, [theme, switchable]);

  const toggleTheme = switchable
    ? (event?: React.MouseEvent) => {
        const nextTheme: Theme = theme === "light" ? "dark" : "light";

        // Use the View Transition API for a smooth circular ripple if available
        const supportsVT = typeof (document as any).startViewTransition === "function";
        if (supportsVT && event) {
          // Capture click position for the radial clip-path origin
          const x = event.clientX;
          const y = event.clientY;
          const endRadius = Math.hypot(
            Math.max(x, window.innerWidth - x),
            Math.max(y, window.innerHeight - y)
          );

          // Bind to document to avoid "Illegal invocation" error
          const transition = (document as any).startViewTransition.call(document, () => {
            applyTheme(nextTheme, switchable);
            setTheme(nextTheme);
          });

          transition.ready.then(() => {
            const clipPath = [
              `circle(0px at ${x}px ${y}px)`,
              `circle(${endRadius}px at ${x}px ${y}px)`,
            ];
            document.documentElement.animate(
              { clipPath },
              {
                duration: 400,
                easing: "ease-in-out",
                pseudoElement: "::view-transition-new(root)",
              }
            );
          }).catch(() => {
            // Transition animation failed — theme already applied, no action needed
          });
        } else {
          // Fallback: CSS transition handles the visual change (0.3s ease on all props)
          setTheme(nextTheme);
        }
      }
    : undefined;

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, switchable }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
