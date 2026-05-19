"use client";

import { cn } from "@/lib/utils";

export function ReviewedStateDot({
  reviewed,
  onToggle,
}: {
  reviewed: boolean;
  onToggle: (e: React.MouseEvent) => void;
}) {
  return (
    <span
      role="button"
      tabIndex={-1}
      aria-label={reviewed ? "Reviewed — click to unmark" : "Not yet reviewed"}
      title={reviewed ? "Reviewed — click to unmark" : "Not yet reviewed"}
      onClick={onToggle}
      className={cn("reviewed-dot", reviewed && "reviewed-dot-on")}
    />
  );
}
