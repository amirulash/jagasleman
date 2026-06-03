import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-bold ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-400/30 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default: "bg-[#334155] text-white shadow-md shadow-slate-700/18 hover:bg-[#1F2937] hover:text-white",
        destructive: "bg-[#D95F5F] text-white shadow-lg shadow-[#D95F5F]/20 hover:bg-[#B84F4F] hover:text-white",
        outline: "border border-[#D8E4ED] bg-white text-[#0F1F2E] shadow-sm backdrop-blur hover:border-[#27527A] hover:bg-[#EFF4F8] hover:text-[#0F1F2E]",
        secondary: "bg-slate-100 text-slate-900 hover:bg-slate-200 hover:text-slate-950",
        ghost: "text-slate-800 hover:bg-slate-100 hover:text-slate-950",
        link: "text-slate-700 underline-offset-4 hover:text-slate-950 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-xl px-3 text-xs",
        lg: "h-12 rounded-2xl px-7 text-sm",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
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
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
