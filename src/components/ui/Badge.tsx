import { HTMLAttributes, ReactNode } from "react";

type Variant =
  | "brand"
  | "gray"
  | "success"
  | "warn"
  | "danger"
  | "info"
  | "violet";

type Difficulty = "简单" | "中等" | "困难";

const variantClass: Record<Variant, string> = {
  brand: "bg-brand-50 text-brand-700",
  gray: "bg-canvas text-muted",
  success: "bg-[rgba(95,122,77,0.15)] text-green",
  warn: "bg-amber-50 text-amber-700",
  danger: "bg-brand-50 text-brand-700",
  info: "bg-[rgba(58,94,122,0.12)] text-blue",
  violet: "bg-violet-50 text-violet-700",
};

const difficultyVariant: Record<Difficulty, Variant> = {
  简单: "success",
  中等: "warn",
  困难: "danger",
};

const difficultyLabel: Record<Difficulty, string> = {
  简单: "简单",
  中等: "中等",
  困难: "困难",
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: Variant;
  difficulty?: Difficulty;
  children?: ReactNode;
}

export function Badge({
  variant = "gray",
  difficulty,
  className = "",
  children,
  ...rest
}: BadgeProps) {
  const v = difficulty ? difficultyVariant[difficulty] : variant;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${variantClass[v]} ${className}`}
      {...rest}
    >
      {difficulty ? difficultyLabel[difficulty] : children}
    </span>
  );
}
