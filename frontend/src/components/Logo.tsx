interface LogoProps {
  className?: string;
  size?: number;
}

export function Logo({ className = "", size = 40 }: LogoProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M16 4L6 10v2h2v8c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-8h2v-2L16 4zm0 3.2l6 3.75v1.05h-2v8H12v-8h-2V10.95L16 7.2zM14 20h4v2h-4v-2z"
        fill="currentColor"
      />
    </svg>
  );
}

export function LogoEduAlign({ className = "" }: { className?: string }) {
  return (
    <span className={`auth-brand-name ${className}`}>
      <span className="edu">EduA</span>
      <span className="align">lign</span>
    </span>
  );
}
