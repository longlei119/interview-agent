import { ButtonHTMLAttributes, forwardRef, ReactNode } from "react";
import { Spinner } from "./Spinner";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
}

const variantClass: Record<Variant, string> = {
  primary:
    "bg-brand-500 text-white shadow-soft hover:bg-brand-600 hover:shadow-hover active:scale-[0.98] disabled:bg-brand-300 disabled:shadow-none",
  secondary:
    "bg-surface text-ink border border-line hover:bg-canvas hover:border-brand-300 active:scale-[0.98] disabled:text-muted/60",
  ghost:
    "bg-transparent text-muted hover:bg-canvas hover:text-ink active:scale-[0.98] disabled:text-muted/40",
  danger:
    "bg-surface text-brand-600 border border-brand-200 hover:bg-brand-25 hover:border-brand-300 active:scale-[0.98] disabled:text-brand-300",
};

const sizeClass: Record<Size, string> = {
  sm: "h-8 px-3 text-xs gap-1.5 rounded-lg",
  md: "h-10 px-4 text-sm gap-2 rounded-lg",
  lg: "h-12 px-6 text-base gap-2 rounded-xl",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      className = "",
      children,
      disabled,
      ...rest
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`inline-flex items-center justify-center font-medium transition-all duration-150 ease-out-soft disabled:cursor-not-allowed ${
          variantClass[variant]
        } ${sizeClass[size]} ${fullWidth ? "w-full" : ""} ${className}`}
        {...rest}
      >
        {loading && <Spinner size={size === "lg" ? "md" : "sm"} />}
        {!loading && leftIcon}
        {children}
        {!loading && rightIcon}
      </button>
    );
  },
);
Button.displayName = "Button";
