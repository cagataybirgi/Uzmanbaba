import { cn } from "../ui/utils";

/* ═══════════════════════════════════════════════════════════════════════════
 * UzmanBaba brand marks.
 *
 * The emblem is a figure raising a hammer, built entirely from rectangles:
 * no rounded corners, no varying stroke weight, no shadow. The hammer head
 * is the single orange accent, the body is ink.
 * ═════════════════════════════════════════════════════════════════════════ */

/** The bare emblem. Never rendered below 24px. */
export function LogoMark({
  size = 30,
  className,
  headColor = "var(--color-brand)",
  bodyColor = "currentColor",
  title,
}: {
  size?: number;
  className?: string;
  headColor?: string;
  bodyColor?: string;
  title?: string;
}) {
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={cn("block shrink-0", className)}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {/* hammer head */}
      <g fill={headColor}>
        <rect x="57" y="0" width="22" height="12" />
        <polygon points="57,0.5 54,2.5 57,4.5" />
        <polygon points="57,4 54,6 57,8" />
        <polygon points="57,7.5 54,9.5 57,11.5" />
        <polygon points="79,0.5 82,2.5 79,4.5" />
        <polygon points="79,4 82,6 79,8" />
        <polygon points="79,7.5 82,9.5 79,11.5" />
      </g>
      {/* handle, arm and figure */}
      <g fill={bodyColor}>
        <rect x="65" y="12" width="6" height="10" />
        <rect x="63" y="16" width="9" height="9" />
        <rect x="50" y="34" width="20" height="8" transform="rotate(-45 50 38)" />
        <rect x="30" y="14" width="18" height="18" />
        <rect x="36" y="32" width="6" height="4" />
        <rect x="28" y="36" width="22" height="32" />
        <rect x="22" y="38" width="6" height="24" />
        <rect x="28" y="68" width="9" height="26" />
        <rect x="41" y="68" width="9" height="26" />
      </g>
    </svg>
  );
}

/**
 * Emblem plus wordmark — the header lock-up. The figure stands 1.6× the
 * cap height of the type, and the "Baba" syllable carries the accent.
 */
export function Logo({
  size = 30,
  textClassName,
  className,
  inverse = false,
}: {
  size?: number;
  textClassName?: string;
  className?: string;
  /** For the accent-field panels: the whole lock-up prints in paper. */
  inverse?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark
        size={size}
        headColor={inverse ? "currentColor" : "var(--color-brand)"}
        bodyColor="currentColor"
      />
      <span
        className={cn(
          "font-display text-[18px] leading-none font-extrabold tracking-[-0.03em]",
          textClassName,
        )}
      >
        Uzman
        <span className={inverse ? undefined : "text-brand"}>Baba</span>
      </span>
    </span>
  );
}

/**
 * The icon square: the emblem knocked out of an accent field. Used where
 * the brand needs to hold its own block — the auth panel, app icons.
 */
export function LogoTile({
  size = 88,
  className,
  invert = false,
}: {
  size?: number;
  className?: string;
  /** Paper field with an accent figure, for use on an accent background. */
  invert?: boolean;
}) {
  return (
    <div
      className={cn(
        "grid place-items-center",
        invert ? "bg-paper" : "bg-brand",
        className,
      )}
      style={{ width: size, height: size }}
    >
      <LogoMark
        size={size * 0.74}
        title="UzmanBaba"
        headColor={invert ? "var(--color-brand-700)" : "var(--color-paper)"}
        bodyColor={invert ? "var(--color-brand-700)" : "var(--color-paper)"}
      />
    </div>
  );
}
