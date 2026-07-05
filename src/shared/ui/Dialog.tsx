import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../lib/cn";

type DialogProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

type DialogContentProps = HTMLAttributes<HTMLElement> & {
  children: ReactNode;
};

export function Dialog({ className, children, ...props }: DialogProps) {
  return (
    <div
      className={cn("fixed inset-0 z-50 grid place-items-center bg-black/45 p-6", className)}
      role="presentation"
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
