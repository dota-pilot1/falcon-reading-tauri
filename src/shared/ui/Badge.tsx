import type { HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/cn";

const badgeVariants = cva(
  "inline-flex min-h-6 items-center rounded-full border px-2.5 text-xs font-black leading-none",
  {
    variants: {
      variant: {
        default: "border-transparent bg-zinc-900 text-white",
        secondary: "border-slate-200 bg-slate-100 text-slate-700",
        success: "border-emerald-200 bg-emerald-100 text-emerald-800",
        warning: "border-amber-200 bg-amber-100 text-amber-800",
        outline: "border-zinc-300 bg-white text-zinc-700",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

type BadgeProps = HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>;

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
