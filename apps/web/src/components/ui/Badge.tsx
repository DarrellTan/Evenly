import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "accent" | "neutral" | "muted";
}

export function Badge({ className, variant = "accent", children, ...props }: BadgeProps) {
  const variants = {
    accent: "bg-accent-subtle text-accent border border-accent-border/60",
    neutral: "bg-surface-subtle text-primary border border-subtle",
    muted: "bg-surface-subtle text-muted border border-subtle",
  };

  return (
    <span
      className={twMerge(
        clsx(
          "inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide",
          variants[variant],
          className
        )
      )}
      {...props}
    >
      {children}
    </span>
  );
}
