import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Link, type LinkProps } from "react-router";
import { cn } from "../ui/utils";
import { Spinner } from "./Feedback";

/* ═══════════════════════════════════════════════════════════════════════════
 * Button — the system's action.
 *
 * The primary is a solid accent fill, the secondary a ruled outline, the
 * ghost a bare accent label. Labels in a full-width button sit flush left
 * (the system never centres a label in a button wider than its text).
 *
 * Every variant is at least 44px tall so it clears the minimum touch target
 * on phones, and every one carries hover / pressed / disabled / focus states
 * from the tokens — call sites never restyle them.
 * ═════════════════════════════════════════════════════════════════════════ */

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "md" | "lg";

interface ButtonStyleProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Full width, with the label flush to the left padding edge. */
  block?: boolean;
  /** Full width with the label centred — for stacked mobile actions. */
  fullWidth?: boolean;
}

const BASE =
  "inline-flex items-center gap-2 font-display font-extrabold leading-tight " +
  "cursor-pointer select-none border transition-colors duration-150 " +
  "disabled:opacity-45 disabled:cursor-not-allowed disabled:pointer-events-none " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-brand text-paper border-brand hover:bg-brand-800 hover:border-brand-800 active:bg-brand-900 active:border-brand-900",
  secondary:
    "bg-transparent text-ink border-rule hover:bg-ink/7 active:bg-ink/14",
  ghost:
    "bg-transparent text-brand-800 border-transparent hover:bg-brand/10 active:bg-brand/18",
  danger:
    "bg-transparent text-danger border-danger/60 hover:bg-danger/8 active:bg-danger/14",
};

const SIZES: Record<ButtonSize, string> = {
  md: "min-h-11 px-4 text-sm",
  lg: "min-h-12 px-6 text-[15px]",
};

export function buttonClasses({
  variant = "secondary",
  size = "md",
  block = false,
  fullWidth = false,
}: ButtonStyleProps = {}): string {
  return cn(
    BASE,
    VARIANTS[variant],
    SIZES[size],
    block && "w-full justify-start text-left",
    fullWidth && "w-full justify-center text-center",
    !block && !fullWidth && "justify-center",
  );
}

/* ── <button> ──────────────────────────────────────────────────────────── */

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    ButtonStyleProps {
  /** Shows a spinner and blocks further clicks while an action is in flight. */
  loading?: boolean;
  /** Replaces the label while `loading` is true. */
  loadingLabel?: string;
  children?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant,
      size,
      block,
      fullWidth,
      loading = false,
      loadingLabel,
      disabled,
      className,
      children,
      type = "button",
      ...rest
    },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        className={cn(
          buttonClasses({ variant, size, block, fullWidth }),
          className,
        )}
        {...rest}
      >
        {loading && <Spinner size={15} />}
        {loading && loadingLabel ? loadingLabel : children}
      </button>
    );
  },
);

/* ── <Link> styled as a button ─────────────────────────────────────────── */

export interface ButtonLinkProps extends LinkProps, ButtonStyleProps {}

export function ButtonLink({
  variant,
  size,
  block,
  fullWidth,
  className,
  children,
  ...rest
}: ButtonLinkProps) {
  return (
    <Link
      className={cn(
        buttonClasses({ variant, size, block, fullWidth }),
        "no-underline",
        className,
      )}
      {...rest}
    >
      {children}
    </Link>
  );
}

/* ── Icon-only button ──────────────────────────────────────────────────── */

export interface IconButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Required — an icon alone tells a screen reader nothing. */
  label: string;
  variant?: ButtonVariant;
  children: ReactNode;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton(
    { label, variant = "ghost", className, children, type = "button", ...rest },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        aria-label={label}
        title={label}
        className={cn(
          BASE,
          VARIANTS[variant],
          "size-11 justify-center p-0",
          className,
        )}
        {...rest}
      >
        {children}
      </button>
    );
  },
);
