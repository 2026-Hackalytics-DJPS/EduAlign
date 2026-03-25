interface EduAlignLogoProps {
  /** Approximate height in pixels. */
  height?: number;
  className?: string;
  /** Use for dark backgrounds (e.g. sidebar) so logo is light. */
  dark?: boolean;
}

/**
 * EduAlign logo — uses the brand SVG from /logo.svg.
 */
export function EduAlignLogo({ height = 48, className = "", dark = false }: EduAlignLogoProps) {
  return (
    <img
      src="/logo.svg"
      alt="EduAlign"
      className={className}
      style={{
        height,
        width: "auto",
        maxWidth: "100%",
        display: "block",
        objectFit: "contain",
        objectPosition: "left center",
        ...(dark ? { filter: "brightness(0) invert(1)" } : {}),
      }}
    />
  );
}
