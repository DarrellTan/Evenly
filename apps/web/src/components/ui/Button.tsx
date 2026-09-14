import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "tinted" | "destructive" | "ghost";
  size?: "sm" | "md" | "lg";
  icon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", icon, children, disabled, ...props }, ref) => {
    const baseStyles =
      "inline-flex items-center justify-center font-semibold transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none focus:outline-none";

    const variantStyles = {
      primary:
        "bg-accent hover:bg-accent-hover text-white shadow-apple-sm border border-accent/20",
      secondary:
        "bg-surface text-primary border border-subtle hover:bg-surface-subtle shadow-apple-sm",
      tinted:
        "bg-accent-subtle text-accent border border-accent-border/40 hover:bg-accent-subtle/80",
      destructive:
        "bg-rose-600 hover:bg-rose-500 text-white shadow-apple-sm",
      ghost:
        "text-secondary hover:text-primary hover:bg-surface-subtle",
    };

    const sizeStyles = {
      sm: "text-xs px-3 py-1.5 rounded-xl gap-1.5",
      md: "text-xs sm:text-sm px-4 py-2 rounded-xl gap-2",
      lg: "text-sm sm:text-base px-5 py-2.5 rounded-2xl gap-2.5",
    };

    return (
      <button
        ref={ref}
        disabled={disabled}
        className={twMerge(clsx(baseStyles, variantStyles[variant], sizeStyles[size], className))}
        {...props}
      >
        {icon && <span className="shrink-0">{icon}</span>}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
