import type { HTMLAttributes } from "react";
import { cn } from "@/shared/lib/utils";

type Variant = "slate" | "green" | "red" | "amber" | "blue";

export function Badge({
  variant = "slate",
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { variant?: Variant }) {
  return (
    <span
      className={cn(
        "chip",
        variant === "green" && "chip-green",
        variant === "red" && "chip-red",
        variant === "amber" && "chip-amber",
        variant === "blue" && "chip-blue",
        variant === "slate" && "chip-slate",
        className
      )}
      {...props}
    />
  );
}
