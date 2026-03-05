import * as React from "react"
import { cva } from "class-variance-authority";
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

/**
 * GOI Button Styling Policy
 * ---------------------------
 * - Consistent sizing with uniform padding
 * - Max 3 words, action-oriented text
 * - 4 distinct states: Enabled, Hover, Focus, Disabled
 * - Font: Noto Sans SemiBold (600)
 * - Smooth transitions between all states
 */

const buttonVariants = cva(
  [
    "inline-flex shrink-0 items-center justify-center gap-2 rounded-md",
    "text-sm font-semibold whitespace-nowrap",
    "transition-all duration-200 ease-in-out",
    "outline-none cursor-pointer select-none",
    /* GOI Focus State: prominent ring */
    "focus-visible:ring-[3px] focus-visible:ring-ring/70 focus-visible:ring-offset-1 focus-visible:ring-offset-background",
    /* GOI Disabled State: reduced opacity, no interaction */
    "disabled:pointer-events-none disabled:opacity-40 disabled:cursor-not-allowed disabled:saturate-0",
    "aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  ].join(" "),
  {
    variants: {
      variant: {
        /* Primary CTA — GOI gradient with clear hover/focus shift */
        default: [
          "bg-primary text-primary-foreground border border-primary/20",
          "shadow-sm",
          "hover:bg-primary/85 hover:shadow-md hover:scale-[1.02]",
          "active:scale-[0.98] active:shadow-sm",
        ].join(" "),

        /* Destructive — danger actions */
        destructive: [
          "bg-destructive text-white border border-destructive/30",
          "shadow-sm",
          "hover:bg-destructive/85 hover:shadow-md hover:scale-[1.02]",
          "active:scale-[0.98]",
          "focus-visible:ring-destructive/30 dark:bg-destructive/70 dark:focus-visible:ring-destructive/50",
        ].join(" "),

        /* Outline — GOI Enabled State: bordered, light bg  */
        outline: [
          "border-2 border-border bg-background text-foreground",
          "shadow-xs",
          "hover:bg-accent hover:text-accent-foreground hover:border-accent-foreground/20 hover:shadow-sm",
          "active:scale-[0.98]",
          "dark:border-input dark:bg-input/30 dark:hover:bg-input/50 dark:hover:border-input",
        ].join(" "),

        /* Secondary */
        secondary: [
          "bg-secondary text-secondary-foreground border border-secondary/50",
          "shadow-xs",
          "hover:bg-secondary/75 hover:shadow-sm hover:scale-[1.01]",
          "active:scale-[0.98]",
        ].join(" "),

        /* Ghost — subtle, no background */
        ghost: [
          "text-foreground",
          "hover:bg-accent hover:text-accent-foreground",
          "active:bg-accent/80",
          "dark:hover:bg-accent/50",
        ].join(" "),

        /* Link */
        link: "text-primary underline-offset-4 hover:underline hover:text-primary/80",

        /* GOI CTA — the exact government style (adapted for dark theme) */
        cta: [
          "bg-gradient-to-r from-cyan-500 to-blue-600 text-white border border-cyan-400/30",
          "shadow-lg shadow-cyan-500/25",
          "hover:from-cyan-400 hover:to-blue-500 hover:shadow-cyan-500/40 hover:scale-[1.02]",
          "active:scale-[0.98] active:shadow-cyan-500/20",
          "focus-visible:ring-cyan-400/50",
        ].join(" "),
      },
      size: {
        default: "h-10 px-5 py-2.5 has-[>svg]:px-4",
        xs: "h-7 gap-1 rounded-md px-2.5 text-xs has-[>svg]:px-2 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1.5 rounded-md px-3.5 text-xs has-[>svg]:px-2.5",
        lg: "h-11 rounded-md px-8 text-base has-[>svg]:px-5",
        xl: "h-12 rounded-lg px-10 text-base has-[>svg]:px-6",
        icon: "size-10",
        "icon-xs": "size-7 rounded-md [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8",
        "icon-lg": "size-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props} />
  );
}

export { Button, buttonVariants }
