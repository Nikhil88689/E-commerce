"use client";

import { X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useId, useRef, type ReactNode } from "react";

type ModalVariant = "dialog" | "drawer" | "full";

type ModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
  variant?: ModalVariant;
  className?: string;
};

export function Modal({
  open,
  onOpenChange,
  title,
  children,
  variant = "dialog",
  className = "",
}: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      dialog.classList.remove("is-closing");
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      dialog.classList.add("is-closing");
    }
  }, [open]);

  function finishExit() {
    const dialog = dialogRef.current;
    if (!open && dialog?.open) dialog.close();
  }

  const initial = variant === "drawer"
    ? { opacity: 0, x: 26 }
    : variant === "full"
      ? { opacity: 0, scale: 0.99 }
      : { opacity: 0, y: 10 };
  const exit = variant === "drawer"
    ? { opacity: 0, x: 26 }
    : variant === "full"
      ? { opacity: 0, scale: 0.99 }
      : { opacity: 0, y: 10 };

  return (
    <dialog
      ref={dialogRef}
      className={`ui-dialog ui-dialog--${variant} ${className}`.trim()}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onOpenChange(false);
      }}
      onClose={() => {
        if (open) onOpenChange(false);
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current) onOpenChange(false);
      }}
    >
      <AnimatePresence onExitComplete={finishExit}>
        {open ? <motion.div
        key="dialog-surface"
        className="ui-dialog__surface"
        initial={prefersReducedMotion ? false : initial}
        animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
        exit={prefersReducedMotion ? undefined : exit}
        transition={{ duration: prefersReducedMotion ? 0 : 0.22, ease: [0.2, 0.8, 0.2, 1] }}
      >
        <div className="ui-dialog__topline">
          <h2 className="ui-dialog__title" id={titleId}>
            {title}
          </h2>
          <button
            className="icon-button ui-dialog__close"
            type="button"
            aria-label={`Close ${title}`}
            onClick={() => onOpenChange(false)}
          >
            <X aria-hidden="true" size={18} strokeWidth={1.4} />
          </button>
        </div>
        {children}
      </motion.div> : null}
      </AnimatePresence>
    </dialog>
  );
}
