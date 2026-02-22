/** Dark blue-purple to match brand (#545279) */
const CAP_COLOR = "#4a5080";

interface EduAlignLogoProps {
  /** Approximate height of the text in pixels. */
  height?: number;
  className?: string;
  /** Use for dark backgrounds (e.g. sidebar) so text is light. */
  dark?: boolean;
}

/**
 * EduAlign wordmark — graduation cap above "Edu" (brand color) + "Align" (black/white).
 */
export function EduAlignLogo({ height = 48, className = "", dark = false }: EduAlignLogoProps) {
  const fontSize = height * 0.55;
  const capSize = height * 0.5;
  const textColor = dark ? "#e8e8f0" : CAP_COLOR;
  const alignColor = dark ? "#fff" : "#333";
  const strokeColor = dark ? "#e8e8f0" : CAP_COLOR;

  return (
    <span
      className={className}
      style={{
        display: "inline-flex",
        flexDirection: "column",
        alignItems: "center",
        lineHeight: 1,
      }}
    >
      <span
        style={{
          display: "inline-block",
          marginBottom: 2,
          marginLeft: -capSize * 0.08,
          transform: "rotate(190deg)",
        }}
      >
        <svg
          width={capSize}
          height={capSize * 0.9}
          viewBox="0 0 32 28"
          fill="none"
          stroke={strokeColor}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ display: "block" }}
          aria-hidden
        >
          <path d="M4 14L16 6L28 14L16 22L4 14Z" />
          <path d="M2 14H30" />
          <path d="M16 6V4M16 4L15 2M16 4L17 2" />
        </svg>
      </span>
      <span
        className="auth-brand-name"
        style={{
          fontSize,
          fontFamily: "'Playfair Display', Georgia, serif",
          fontWeight: 700,
          letterSpacing: "-0.02em",
        }}
      >
        <span className="edu" style={{ color: textColor }}>Edu</span>
        <span className="align" style={{ color: alignColor }}>Align</span>
      </span>
    </span>
  );
}
