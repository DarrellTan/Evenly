import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  glass?: boolean;
  hoverable?: boolean;
}

export function Card({ className, glass = false, hoverable = false, children, ...props }: CardProps) {
  return (
    <div
      className={twMerge(
        clsx(
          "rounded-3xl border border-subtle transition-all duration-200",
          glass ? "apple-glass" : "bg-surface shadow-apple-sm",
          hoverable && "hover:border-strong hover:shadow-apple-md hover:-translate-y-0.5",
          className
        )
      )}
      {...props}
    >
      {children}
    </div>
  );
}
