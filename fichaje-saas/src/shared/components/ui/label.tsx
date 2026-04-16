import { forwardRef, type LabelHTMLAttributes } from "react";
import { cn } from "@/shared/lib/utils";

export const Label = forwardRef<HTMLLabelElement, LabelHTMLAttributes<HTMLLabelElement>>(
  ({ className, ...props }, ref) => (
    <label
      ref={ref}
      className={cn("text-xs font-semibold text-slate-700", className)}
      {...props}
    />
  )
);
Label.displayName = "Label";
