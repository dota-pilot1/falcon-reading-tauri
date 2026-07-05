import type { TextareaHTMLAttributes } from "react";
import { cn } from "../lib/cn";

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export function Textarea({ className, ...props }: TextareaProps) {
  return (
    <textarea
      className={cn(
        "min-h-28 w-full resize-y rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm leading-6 text-zinc-900 shadow-none",
        "placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10",
        "disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-400",
        className,
      )}
      {...props}
    />
  );
}
