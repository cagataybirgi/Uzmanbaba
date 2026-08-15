import type { ReactNode, TdHTMLAttributes, ThHTMLAttributes } from "react";
import { cn } from "../ui/utils";

/* ═══════════════════════════════════════════════════════════════════════════
 * Table — the system's data surface.
 *
 * A themed uppercase header over a 2px rule, then 1px row rules. Below
 * 768px the same markup restacks into labelled records (see
 * styles/components.css) so no table ever scrolls sideways on a phone —
 * which is why every <Td> takes a `label`: that label becomes the record's
 * field name in the stacked view.
 * ═════════════════════════════════════════════════════════════════════════ */

export function Table({
  caption,
  children,
  className,
  stack = true,
}: {
  /** Visually hidden by default — describes the table to screen readers. */
  caption?: ReactNode;
  children: ReactNode;
  className?: string;
  /**
   * Two-column key/value tables stay a table at every width; wide record
   * tables restack into labelled records below 768px.
   */
  stack?: boolean;
}) {
  return (
    <table className={cn("data-table", !stack && "no-stack", className)}>
      {caption && <caption className="sr-only">{caption}</caption>}
      {children}
    </table>
  );
}

export function Th({
  children,
  className,
  ...rest
}: ThHTMLAttributes<HTMLTableCellElement> & { children?: ReactNode }) {
  return (
    <th scope="col" className={className} {...rest}>
      {children}
    </th>
  );
}

export interface TdProps extends TdHTMLAttributes<HTMLTableCellElement> {
  /** Column name, repeated as the field label in the stacked mobile view. */
  label?: string;
  /**
   * Cells that lay out differently once stacked. Named `cell` rather than
   * `role` so the real ARIA attribute stays available on a table cell.
   */
  cell?: "actions" | "media";
  children?: ReactNode;
}

export function Td({ label, cell, className, children, ...rest }: TdProps) {
  return (
    <td
      data-label={label}
      data-role={cell}
      className={cn(cell === "actions" && "text-right whitespace-nowrap", className)}
      {...rest}
    >
      {children}
    </td>
  );
}

/** A name cell — the record's identity, set in the display face. */
export function TdName({
  label,
  className,
  children,
  ...rest
}: TdProps) {
  return (
    <Td
      label={label}
      className={cn("font-display text-[15px] font-extrabold", className)}
      {...rest}
    >
      {children}
    </Td>
  );
}
