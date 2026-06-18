import { ReactNode } from "react";
import { Icon } from "./Icon";

interface ErrorBannerProps {
  children: ReactNode;
  className?: string;
}

export function ErrorBanner({ children, className = "" }: ErrorBannerProps) {
  return (
    <div
      className={`flex items-start gap-2 rounded-lg border border-brand-200 bg-brand-25 px-3 py-2 text-sm text-brand-700 ${className}`}
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
  info: "border-sky-200 bg-[rgba(58,94,122,0.12)] text-blue",
  warn: "border-amber-200 bg-amber-50 text-amber-700",
  success: "border-green bg-[rgba(95,122,77,0.15)] text-green",
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
