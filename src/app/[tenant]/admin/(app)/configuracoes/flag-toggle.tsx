"use client";

import { useTransition } from "react";
import { alternarFeatureFlag } from "./actions";

export function FlagToggle({
  tenantSlug,
  tenantId,
  flagKey,
  label,
  description,
  enabled,
}: {
  tenantSlug: string;
  tenantId: string;
  flagKey: string;
  label: string;
  description: string;
  enabled: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-start justify-between gap-6 card">
      <div>
        <p className="font-medium">{label}</p>
        <p className="text-sm text-muted mt-0.5">{description}</p>
      </div>
      <button
        role="switch"
        aria-checked={enabled}
        disabled={isPending}
        onClick={() =>
          startTransition(() => alternarFeatureFlag(tenantSlug, tenantId, flagKey, !enabled))
        }
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
          enabled ? "bg-accent" : "bg-border"
        } disabled:opacity-60`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-surface transition-transform ${
            enabled ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}
