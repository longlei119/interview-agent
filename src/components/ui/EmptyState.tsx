import { ReactNode } from "react";
import { Icon, IconName } from "./Icon";

interface EmptyStateProps {
  icon?: IconName;
  title: string;
  desc?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon = "info",
  title,
  desc,
  action,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-xl border border-dashed border-line bg-surface/60 px-6 py-12 text-center ${className}`}
    >
      <div className="flex size-12 items-center justify-center rounded-full bg-canvas text-muted">
        <Icon name={icon} size={22} />
      </div>
      <h3 className="mt-4 text-sm font-semibold text-ink">{title}</h3>
      {desc && <p className="mt-1 max-w-sm text-sm text-muted">{desc}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
