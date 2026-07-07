import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "../lib/cn";

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg border text-[13px] font-extrabold transition-colors",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2",
    "disabled:pointer-events-none disabled:opacity-50",
  ],
  {
    variants: {
      variant: {
        default: "border-zinc-900 bg-zinc-900 text-white hover:bg-zinc-800",
        outline: "border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-100",
        ghost: "border-transparent bg-transparent text-zinc-700 hover:bg-zinc-100",
        secondary: "border-slate-200 bg-slate-100 text-slate-900 hover:bg-slate-200",
        destructive: "border-red-600 bg-red-600 text-white hover:bg-red-700",
      },
      size: {
        default: "min-h-[38px] px-3",
        sm: "min-h-8 px-2.5 text-xs",
        icon: "h-10 w-10 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
  children: ReactNode;
  asChild?: boolean;
};

export function Button({ className, variant, size, type = "button", children, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    >
      {children}
    </Comp>
  );
}
