"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/lib/action-result";

/** Bottoncino di eliminazione inline (senza dialog) per elementi minori. */
export function DeleteIconButton({
  action,
  ariaLabel,
}: {
  action: () => Promise<ActionResult>;
  ariaLabel: string;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={ariaLabel}
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          const result = await action();
          if (result?.ok === false) {
            toast.error(result.error ?? "Operazione non riuscita.");
          }
        })
      }
    >
      <Trash2 className="text-muted-foreground" />
    </Button>
  );
}
