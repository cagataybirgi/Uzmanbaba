import { useState, type ImgHTMLAttributes } from "react";
import { cn } from "../ui/utils";

/* ═══════════════════════════════════════════════════════════════════════════
 * Photo — every content photograph in the app goes through here.
 *
 * Images print in pure black and white, square-cornered, cropped to the top
 * so faces stay in frame. A failed load falls back to a ruled surface block
 * carrying the subject's initials rather than a broken-image glyph.
 * ═════════════════════════════════════════════════════════════════════════ */

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toLocaleUpperCase("tr-TR"))
    .join("");
}

export interface PhotoProps
  extends Omit<ImgHTMLAttributes<HTMLImageElement>, "alt" | "src"> {
  src?: string | null;
  /** The person or subject — used for the alt text and the fallback mark. */
  name: string;
  /** Decorative uses (next to the name in a row) pass an empty alt. */
  alt?: string;
  size?: number;
  /** Portrait crop (4:5) as used by the profile and hero figures. */
  portrait?: boolean;
  className?: string;
}

export function Photo({
  src,
  name,
  alt,
  size = 40,
  portrait = false,
  className,
  ...rest
}: PhotoProps) {
  const [failed, setFailed] = useState(false);
  const height = portrait ? Math.round(size * 1.25) : size;

  if (!src || failed) {
    return (
      <div
        role="img"
        aria-label={alt === "" ? undefined : (alt ?? name)}
        aria-hidden={alt === "" ? true : undefined}
        style={{ width: size, height }}
        className={cn(
          "flex shrink-0 items-center justify-center bg-surface font-display text-xs font-extrabold text-ink/55 ring-1 ring-rule-soft ring-inset",
          className,
        )}
      >
        {initials(name)}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt ?? name}
      width={size}
      height={height}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      style={{ width: size, height }}
      className={cn(
        "grayscale-photo shrink-0 bg-surface object-cover object-top",
        className,
      )}
      {...rest}
    />
  );
}
