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
    "inline-flex shrink-0 items-center justify-center gap-2 rounded-sm",
    "text-sm font-noto-bold tracking-wide whitespace-nowrap",
    "transition-colors duration-200 ease-in-out",
    "outline-none cursor-pointer select-none",
    /* GOI Focus State: prominent ring */
    "focus-visible:ring-2 focus-visible:ring-[#0056b3] focus-visible:ring-offset-2 focus-visible:ring-offset-background dark:focus-visible:ring-cyan-500",
    /* GOI Disabled State: reduced opacity, no interaction */
    "disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed",
    "aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  ].join(" "),
  {
    variants: {
      variant: {
        /* Primary GOI Button */
        default: [
          "bg-[#0056b3] text-white border border-[#004494]",
          "dark:bg-cyan-700 dark:border-cyan-600",
          "shadow-sm",
          "hover:bg-[#004494] dark:hover:bg-cyan-600 hover:shadow-md",
        ].join(" "),

        /* Destructive — danger actions */
        destructive: [
          "bg-red-600 text-white border border-red-700",
          "shadow-sm",
          "hover:bg-red-700 hover:shadow-md",
          "dark:bg-red-700 dark:border-red-600 dark:hover:bg-red-600",
        ].join(" "),

        /* Outline — GOI Formality */
        outline: [
          "border-2 border-border bg-background text-foreground",
          "shadow-sm",
          "hover:bg-muted/30 hover:text-foreground hover:border-[#0056b3] dark:hover:border-cyan-500",
        ].join(" "),

        /* Secondary */
        secondary: [
          "bg-secondary text-secondary-foreground border border-border",
          "shadow-sm",
          "hover:bg-secondary/70 hover:shadow-md",
        ].join(" "),

        /* Ghost — subtle, minimal background */
        ghost: [
          "text-foreground",
          "hover:bg-muted/50 hover:text-foreground",
        ].join(" "),

        /* Link */
        link: "text-[#0056b3] dark:text-cyan-500 underline-offset-4 hover:underline",

        /* GOI Call to Action */
        cta: [
          "bg-[#0056b3] text-white border border-[#004494]",
          "dark:bg-cyan-700 dark:border-cyan-600",
          "shadow-sm uppercase tracking-widest",
          "hover:bg-[#004494] dark:hover:bg-cyan-600 hover:shadow-md",
        ].join(" "),
      },
      size: {
        default: "h-10 px-6 py-2 has-[>svg]:px-4",
        xs: "h-7 gap-1 px-3 text-xs has-[>svg]:px-2 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-9 gap-1.5 px-4 text-xs tracking-wider has-[>svg]:px-3",
        lg: "h-12 px-8 text-base has-[>svg]:px-5",
        xl: "h-14 px-10 text-base has-[>svg]:px-6",
        icon: "size-10",
        "icon-xs": "size-7 [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-9",
        "icon-lg": "size-12",
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
