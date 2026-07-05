import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "../lib/cn";

type ButtonVariant = "default" | "outline" | "ghost";
type ButtonSize = "default" | "icon";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
};

const variantClass: Record<ButtonVariant, string> = {
  default: "border-zinc-900 bg-zinc-900 text-white hover:bg-zinc-800 disabled:border-zinc-200 disabled:bg-zinc-100 disabled:text-zinc-400",
  outline: "border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-100 disabled:border-zinc-200 disabled:bg-zinc-100 disabled:text-zinc-400",
  ghost: "border-transparent bg-transparent text-zinc-700 hover:bg-zinc-100 disabled:text-zinc-400",
};

const sizeClass: Record<ButtonSize, string> = {
  default: "min-h-[38px] px-3",
  icon: "h-10 w-10 p-0",
};

export function Button({ className, variant = "default", size = "default", type = "button", children, ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg border text-[13px] font-extrabold transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2",
        variantClass[variant],
        sizeClass[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
