import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { AlertCircle } from "lucide-react";
import { cn } from "../ui/utils";

/* ═══════════════════════════════════════════════════════════════════════════
 * Form primitives.
 *
 * Native elements, themed from the tokens: surface fill, 1px rule, zero
 * radius, accent caret and an accent border on focus. Labels are always
 * visible (never placeholder-only), errors sit directly under their field
 * and announce themselves, and every control clears 44px on touch.
 * ═════════════════════════════════════════════════════════════════════════ */

// `text-base` below `md` is deliberate: iOS zooms the viewport on focus for
// any control under 16px, and that zoom is far more disruptive than the 1px
// size difference. Desktop drops to the system's 15px.
const CONTROL =
  "w-full min-h-11 border bg-surface px-3 py-2.5 text-base md:text-[15px] text-ink " +
  "caret-brand transition-colors duration-150 " +
  "placeholder:text-ink/45 " +
  "hover:border-ink/45 " +
  "focus-visible:border-brand focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-brand " +
  "disabled:cursor-not-allowed disabled:opacity-45";

const CONTROL_VALID = "border-rule";
const CONTROL_INVALID = "border-danger bg-danger-tint";

function controlClasses(invalid?: boolean, className?: string) {
  return cn(CONTROL, invalid ? CONTROL_INVALID : CONTROL_VALID, className);
}

/* ── Field wrapper ─────────────────────────────────────────────────────────
 * Owns the label / control / message trio and wires up the ids so the
 * caller only has to render the control itself.
 * ─────────────────────────────────────────────────────────────────────── */

export interface FieldProps {
  label: ReactNode;
  /** Rendered on the label row, right-aligned — e.g. a "forgot password" link. */
  labelAside?: ReactNode;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  className?: string;
  children: (props: {
    id: string;
    "aria-invalid": boolean | undefined;
    "aria-describedby": string | undefined;
    "aria-required": boolean | undefined;
  }) => ReactNode;
}

export function Field({
  label,
  labelAside,
  hint,
  error,
  required,
  className,
  children,
}: FieldProps) {
  const reactId = useId();
  const id = `${reactId}-control`;
  const errorId = `${reactId}-error`;
  const hintId = `${reactId}-hint`;
  const describedBy =
    [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(" ") ||
    undefined;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <label
          htmlFor={id}
          className="text-xs leading-tight font-semibold tracking-wide text-ink/70"
        >
          {label}
          {required && (
            <span className="ml-1 text-brand-800" aria-hidden="true">
              *
            </span>
          )}
        </label>
        {labelAside}
      </div>

      {children({
        id,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": describedBy,
        "aria-required": required || undefined,
      })}

      {hint && !error && (
        <p id={hintId} className="text-xs leading-relaxed text-ink/60">
          {hint}
        </p>
      )}
      {error && <FieldError id={errorId}>{error}</FieldError>}
    </div>
  );
}

export function FieldError({
  id,
  children,
}: {
  id?: string;
  children: ReactNode;
}) {
  return (
    <p
      id={id}
      role="alert"
      className="animate-slide-down flex items-center gap-1.5 text-xs font-semibold text-danger"
    >
      <AlertCircle size={13} className="shrink-0" aria-hidden="true" />
      {children}
    </p>
  );
}

/* ── Controls ──────────────────────────────────────────────────────────── */

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { invalid, className, ...rest },
  ref,
) {
  return (
    <input
      ref={ref}
      className={controlClasses(invalid ?? rest["aria-invalid"] === true, className)}
      {...rest}
    />
  );
});

export interface TextareaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ invalid, className, rows = 4, ...rest }, ref) {
    return (
      <textarea
        ref={ref}
        rows={rows}
        className={controlClasses(
          invalid ?? rest["aria-invalid"] === true,
          cn("min-h-24 resize-y", className),
        )}
        {...rest}
      />
    );
  },
);

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  function Select({ invalid, className, children, ...rest }, ref) {
    return (
      <select
        ref={ref}
        className={controlClasses(
          invalid ?? rest["aria-invalid"] === true,
          cn("appearance-none pr-8", SELECT_CHEVRON, className),
        )}
        {...rest}
      >
        {children}
      </select>
    );
  },
);

/* A flat chevron drawn in the ink tone — the system's one decorative glyph
   on a control, kept as a background so the select stays a native element. */
const SELECT_CHEVRON =
  "bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%228%22 viewBox=%220 0 12 8%22><path d=%22M1 1.5 6 6.5 11 1.5%22 fill=%22none%22 stroke=%22%23201e1d%22 stroke-width=%221.6%22/></svg>')] " +
  "bg-[length:12px_8px] bg-[position:right_12px_center] bg-no-repeat";

/* ── Checkbox ──────────────────────────────────────────────────────────────
 * The system's square mark: a ruled box that fills with the accent when
 * checked. The whole label is the hit area, so it always clears 44px.
 * ─────────────────────────────────────────────────────────────────────── */

export interface CheckboxProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  children?: ReactNode;
  /** Renders the box alone (inside a table cell, say) with an aria-label. */
  bare?: boolean;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  function Checkbox({ children, bare, className, ...rest }, ref) {
    return (
      <label
        className={cn(
          "group inline-flex cursor-pointer items-start gap-3 text-[15px] leading-6",
          !bare && "min-h-11 py-2.5",
          rest.disabled && "cursor-not-allowed opacity-45",
          className,
        )}
      >
        <input ref={ref} type="checkbox" className="peer sr-only" {...rest} />
        <span
          aria-hidden="true"
          className={
            "mt-px size-5 shrink-0 border border-rule bg-surface transition-colors duration-150 " +
            "bg-[length:14px_11px] bg-center bg-no-repeat " +
            "group-hover:border-brand " +
            "peer-checked:border-brand peer-checked:bg-brand " +
            "peer-checked:bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2214%22 height=%2211%22 viewBox=%220 0 14 11%22><path d=%22M1 5.5 5 9.5 13 1.5%22 fill=%22none%22 stroke=%22%23f3f2f2%22 stroke-width=%222.2%22/></svg>')] " +
            "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand"
          }
        />
        {children && <span>{children}</span>}
      </label>
    );
  },
);
