import { ReactNode } from "react";
import { Icon } from "./Icon";

interface ErrorBannerProps {
  children: ReactNode;
  className?: string;
}

export function ErrorBanner({ children, className = "" }: ErrorBannerProps) {
  return (
    <div
      className={`flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 ${className}`}
    >
      <Icon name="alert" size={16} className="mt-0.5 shrink-0" />
      <div className="flex-1">{children}</div>
    </div>
  );
}

interface HintBannerProps {
  variant?: "info" | "warn" | "success";
  children: ReactNode;
  className?: string;
}

const hintClass = {
  info: "border-sky-200 bg-sky-50 text-sky-700",
  warn: "border-amber-200 bg-amber-50 text-amber-700",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

const hintIcon = {
  info: "info" as const,
  warn: "alert" as const,
  success: "check" as const,
};

export function HintBanner({ variant = "info", children, className = "" }: HintBannerProps) {
  return (
    <div
      className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-sm ${hintClass[variant]} ${className}`}
    >
      <Icon name={hintIcon[variant]} size={16} className="mt-0.5 shrink-0" />
      <div className="flex-1">{children}</div>
    </div>
  );
}
