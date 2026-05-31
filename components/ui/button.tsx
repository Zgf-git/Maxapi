import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-full text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-[linear-gradient(135deg,#5be7c4,#70a4ff)] px-4 py-2 text-slate-950 shadow-[0_18px_45px_rgba(91,231,196,0.18)] hover:opacity-95",
        secondary:
          "border border-white/10 bg-white/6 px-4 py-2 text-white hover:border-white/18 hover:bg-white/10",
        ghost: "px-3 py-2 text-slate-200 hover:bg-white/6 hover:text-white",
        outline:
          "border border-white/10 bg-[#0b1627]/78 px-4 py-2 text-slate-100 hover:border-cyan-300/25 hover:bg-[#101d31]",
        destructive: "bg-[var(--color-destructive)] px-4 py-2 text-[var(--color-destructive-foreground)] hover:opacity-90"
      },
      size: {
        default: "h-10",
        sm: "h-9 px-3 text-xs",
        lg: "h-11 px-5"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";

    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
