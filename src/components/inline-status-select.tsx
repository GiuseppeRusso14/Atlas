"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { ActionResult } from "@/lib/action-result";

/** Select compatta per cambiare stato direttamente dalle liste. */
export function InlineStatusSelect({
  value,
  options,
  action,
  className,
}: {
  value: string;
  options: { value: string; label: string }[];
  action: (value: string) => Promise<ActionResult>;
  className?: string;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <Select
      value={value}
      disabled={isPending}
      onValueChange={(v) =>
        startTransition(async () => {
          const result = await action(v);
          if (result?.ok === false) {
            toast.error(result.error ?? "Operazione non riuscita.");
          }
        })
      }
    >
      <SelectTrigger size="sm" className={cn("w-fit min-w-36", className)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
