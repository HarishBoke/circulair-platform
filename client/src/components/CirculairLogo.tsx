/**
 * CirculairLogo — Shared brand logo component using the official Circul-AI-r SVG mark.
 * Renders the green semicircle + white semicircle mark at any size.
 */
interface CirculairLogoProps {
  className?: string;
  size?: number;
}

const CDN_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663256112242/Su7XGBwDj2SqiggDTNrQPe/circulair-dark_e291b236.svg";

export default function CirculairLogo({ className = "", size = 32 }: CirculairLogoProps) {
  return (
    <img
      src={CDN_URL}
      alt="Circul-AI-r"
      width={size}
      height={size}
      className={className}
      style={{ objectFit: "contain" }}
    />
  );
}

export { CDN_URL as LOGO_URL };
