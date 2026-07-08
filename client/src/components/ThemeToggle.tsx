import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

/**
 * Floating theme toggle button — drop anywhere outside PlatformLayout.
 * Positioned absolute top-right by default; override with className.
 */
export default function ThemeToggle({ className = "absolute top-4 right-4 z-20" }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      onClick={(e) => toggleTheme?.(e)}
      className={`${className} p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors`}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
    >
      {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  );
}
