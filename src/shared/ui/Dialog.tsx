import type { HTMLAttributes, MouseEvent, ReactNode } from "react";
import { useEffect } from "react";
import { cn } from "../lib/cn";

type DialogProps = Omit<HTMLAttributes<HTMLDivElement>, "onClose"> & {
  children: ReactNode;
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  onClose?: () => void;
};

type DialogContentProps = HTMLAttributes<HTMLElement> & {
  children: ReactNode;
};

export function Dialog({
  className,
  children,
  closeOnBackdrop = true,
  closeOnEscape = true,
  onClick,
  onClose,
  ...props
}: DialogProps) {
  useEffect(() => {
    if (!onClose || !closeOnEscape) return undefined;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closeOnEscape, onClose]);

  const handleClick = (event: MouseEvent<HTMLDivElement>) => {
    onClick?.(event);
    if (!event.defaultPrevented && closeOnBackdrop && event.currentTarget === event.target) {
      onClose?.();
    }
  };

  return (
    <div
      className={cn("fixed inset-0 z-50 grid place-items-center bg-black/45 p-6", className)}
      role="presentation"
      onClick={handleClick}
      {...props}
    >
      {children}
    </div>
  );
}

export function DialogContent({ className, children, ...props }: DialogContentProps) {
  return (
    <section
      className={cn("w-full max-w-xl rounded-lg border border-zinc-200 bg-white shadow-2xl", className)}
      role="dialog"
      aria-modal="true"
      {...props}
    >
      {children}
    </section>
  );
}
