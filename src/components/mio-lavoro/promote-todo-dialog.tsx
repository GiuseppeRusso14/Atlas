"use client";

import { useActionState, useState } from "react";
import { FolderInput } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormField } from "@/components/form-field";
import { promoteTodoAction } from "@/app/(dashboard)/mio-lavoro/actions";
import { PRIORITY } from "@/lib/labels";
import type { ActionResult } from "@/lib/action-result";
import type { Priority } from "@/generated/prisma/client";

type Option = { id: string; name: string };

/** Promuove una to-do personale a task di progetto (assegnato a me). */
export function PromoteTodoDialog({
  todoId,
  todoTitle,
  projects,
}: {
  todoId: string;
  todoTitle: string;
  projects: Option[];
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(
    async (prev: ActionResult, formData: FormData) => {
      const result = await promoteTodoAction(todoId, prev, formData);
      if (result.ok) {
        setOpen(false);
        toast.success("Promossa a task di progetto (assegnato a te).");
      }
      return result;
    },
    { ok: false }
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Promuovi "${todoTitle}" a task di progetto`}
          title="Promuovi a task di progetto"
        >
          <FolderInput className="text-muted-foreground" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Promuovi a task di progetto</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          “{todoTitle}” diventerà un task assegnato a te (la to-do personale
          verrà rimossa).
        </p>
        <form action={formAction} className="space-y-4">
          <FormField label="Progetto *" name="projectId" errors={state.fieldErrors}>
            <Select name="projectId" defaultValue={projects[0]?.id}>
              <SelectTrigger id="projectId" className="w-full">
                <SelectValue placeholder="Seleziona progetto" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Priorità" name="priority" errors={state.fieldErrors}>
            <Select name="priority" defaultValue="MEDIA">
              <SelectTrigger id="priority" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(PRIORITY) as Priority[]).map((p) => (
                  <SelectItem key={p} value={p}>
                    {PRIORITY[p].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <Button type="submit" disabled={isPending} className="w-full">
            {isPending ? "Promozione…" : "Crea task"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
