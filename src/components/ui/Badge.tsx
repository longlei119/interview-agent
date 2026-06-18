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
  gray: "bg-slate-100 text-slate-600",
  success: "bg-emerald-50 text-emerald-700",
  warn: "bg-amber-50 text-amber-700",
  danger: "bg-red-50 text-red-700",
  info: "bg-sky-50 text-sky-700",
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
