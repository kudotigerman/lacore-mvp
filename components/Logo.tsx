import Link from "next/link";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  variant?: "dark" | "light";
  /** Home link by default. Pass `false` for a non-clickable mark (e.g. mockups). */
  href?: string | false;
  className?: string;
}

export function Logo({ size = "md", variant = "dark", href, className = "" }: LogoProps) {
  const linkHref = href === false ? false : href ?? "/";
  const sizes = {
    sm: { icon: 20, text: 13, gap: 8, letterSpacing: "0.08em" },
    md: { icon: 26, text: 15, gap: 10, letterSpacing: "0.08em" },
    lg: { icon: 32, text: 18, gap: 12, letterSpacing: "0.08em" }
  };
  const s = sizes[size];
  const textColor = variant === "dark" ? "#FFFFFF" : "#07080F";

  const icon = (
    <svg
      width={s.icon}
      height={s.icon}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect x="2" y="2" width="7" height="17" rx="1.5" fill="#6366F1" />
      <rect x="2" y="17" width="15" height="5" rx="1.5" fill="#6366F1" />
      <rect x="11" y="2" width="7" height="7" rx="1.5" fill="#818CF8" opacity="0.65" />
    </svg>
  );

  const wordmark = (
    <span
      style={{
        fontSize: s.text,
        fontWeight: 600,
        color: textColor,
        letterSpacing: s.letterSpacing,
        fontFamily: "var(--font-geist-sans, system-ui, sans-serif)",
        lineHeight: 1,
        userSelect: "none"
      }}
    >
      LACORE
    </span>
  );

  const mark = (
    <>
      {icon}
      {wordmark}
    </>
  );

  const flexClass = `flex items-center ${className}`.trim();

  if (linkHref === false) {
    return (
      <div className={flexClass} style={{ gap: s.gap }}>
        {mark}
      </div>
    );
  }

  return (
    <Link href={linkHref} className={`${flexClass} no-underline`} style={{ gap: s.gap }}>
      {mark}
    </Link>
  );
}
