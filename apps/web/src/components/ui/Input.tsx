import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, icon, ...props }, ref) => {
    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label className="block text-xs font-semibold text-secondary">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {icon && (
            <div className="absolute left-3.5 text-muted pointer-events-none">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={twMerge(
              clsx(
                "w-full rounded-xl bg-surface border border-subtle text-sm text-primary placeholder:text-muted",
                "px-3.5 py-2.5 transition-all duration-150",
                "focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20",
                icon && "pl-10",
                error && "border-rose-500 focus:border-rose-500 focus:ring-rose-500/20",
                className
              )
            )}
            {...props}
          />
        </div>
        {error && <p className="text-[11px] text-rose-500 font-medium">{error}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";
