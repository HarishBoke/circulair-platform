/**
 * LanguageSelector — Compact language switcher for the sidebar footer.
 * Uses the lightweight static i18n system (no i18next dependency).
 */
import { useState } from "react";
import { SUPPORTED_LANGUAGES, getCurrentLanguage, setLanguage } from "@/lib/i18n";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Globe } from "lucide-react";

export function LanguageSelector() {
  const [lang, setLang] = useState(getCurrentLanguage);

  const handleChange = (code: string) => {
    setLanguage(code);
    setLang(code);
  };

  const current = SUPPORTED_LANGUAGES.find((l) => l.code === lang) ?? SUPPORTED_LANGUAGES[0];

  return (
    <div className="flex items-center gap-2">
      <Globe className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
      <Select value={current.code} onValueChange={handleChange}>
        <SelectTrigger className="h-7 text-xs bg-transparent border-border/50 hover:border-border px-2 w-full">
          <SelectValue>{current.name}</SelectValue>
        </SelectTrigger>
        <SelectContent className="bg-card border-border">
          {SUPPORTED_LANGUAGES.map((lang) => (
            <SelectItem key={lang.code} value={lang.code} className="text-xs">
              <span className="mr-1.5">{lang.flag}</span> {lang.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
