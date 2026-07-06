"use client";

import { useTransition } from "react";
import { Undo2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmActionButton } from "@/components/confirm-action-button";
import {
  hardDeleteTaskAction,
  restoreTaskAction,
} from "@/app/(dashboard)/task/actions";

/** Azioni sulle righe del cestino: ripristina o elimina per sempre. */
export function TaskTrashActions({
  taskId,
  title,
}: {
  taskId: string;
  title: string;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center justify-end gap-2">
      <Button
        variant="outline"
        size="sm"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            const result = await restoreTaskAction(taskId);
            if (result?.ok === false) {
              toast.error(result.error ?? "Ripristino non riuscito.");
            } else {
              toast.success(`"${title}" ripristinato nel Kanban.`);
            }
          })
        }
      >
        <Undo2 data-icon="inline-start" /> Ripristina
      </Button>
      <ConfirmActionButton
        action={hardDeleteTaskAction.bind(null, taskId)}
        label="Elimina"
        variant="destructive"
        title="Eliminare definitivamente il task?"
        description={`"${title}" verrà eliminato per sempre: non sarà più ripristinabile.`}
        confirmLabel="Elimina per sempre"
        successMessage="Task eliminato definitivamente."
      />
    </div>
  );
}
