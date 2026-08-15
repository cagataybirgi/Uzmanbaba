import type { ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "../ui/utils";

/* ═══════════════════════════════════════════════════════════════════════════
 * Modal — a square panel at the top elevation over an ink scrim.
 *
 * Radix supplies the accessible behaviour the system expects: focus is
 * trapped inside the panel and restored to the trigger on close, Escape and
 * a scrim click dismiss it, the rest of the page is inert and hidden from
 * screen readers, and the title/description are wired to the dialog.
 * ═════════════════════════════════════════════════════════════════════════ */

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  /** Read out on open; keep it a plain sentence describing the panel. */
  description?: string;
  children: ReactNode;
  size?: "md" | "lg";
  className?: string;
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  size = "md",
  className,
}: ModalProps) {
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay
          className={
            "fixed inset-0 z-50 bg-ink/55 " +
            "data-[state=open]:animate-in data-[state=open]:fade-in-0 " +
            "data-[state=closed]:animate-out data-[state=closed]:fade-out-0"
          }
        />
        <Dialog.Content
          className={cn(
            "fixed top-1/2 left-1/2 z-50 flex w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col",
            "max-h-[90vh] overflow-y-auto bg-surface shadow-lg focus:outline-none",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0",
            "data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
            size === "lg" ? "max-w-2xl" : "max-w-lg",
            className,
          )}
        >
          <div className="flex items-start justify-between gap-4 border-b-2 border-rule px-5 py-4 sm:px-6">
            <Dialog.Title className="font-display text-xl leading-tight font-extrabold text-ink sm:text-2xl">
              {title}
            </Dialog.Title>
            <Dialog.Close
              aria-label="Kapat"
              className={
                "-mt-2 -mr-2 flex size-11 shrink-0 cursor-pointer items-center justify-center text-ink/60 " +
                "transition-colors hover:bg-ink/7 hover:text-ink " +
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              }
            >
              <X size={20} aria-hidden="true" />
            </Dialog.Close>
          </div>

          {description && (
            <Dialog.Description className="sr-only">
              {description}
            </Dialog.Description>
          )}

          <div className="px-5 py-5 sm:px-6">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** The action row at the foot of a modal — flush left, primary first. */
export function ModalActions({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mt-6 flex flex-col-reverse gap-3 border-t-2 border-rule pt-5 sm:flex-row sm:items-center",
        className,
      )}
    >
      {children}
    </div>
  );
}
