/**
 * CirculairLogo — Shared brand logo component using the official Circul-AI-r SVG mark.
 * Served from /circulair.svg in the public folder (no CDN dependency).
 */
interface CirculairLogoProps {
  className?: string;
  size?: number;
}

export default function CirculairLogo({ className = "", size = 32 }: CirculairLogoProps) {
  return (
    <img
      src="/circulair.svg"
      alt="Circul-AI-r"
      width={size}
      height={size}
      className={className}
      style={{ objectFit: "contain" }}
    />
  );
}
