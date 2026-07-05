"use client";

import { useActionState, useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormField } from "@/components/form-field";
import { PRIORITY, TASK_STATUS } from "@/lib/labels";
import { toDateInputValue } from "@/lib/format";
import type { ActionResult } from "@/lib/action-result";
import type { Priority, Task, TaskStatus } from "@/generated/prisma/client";

const NONE = "__none__";

type Option = { id: string; name: string };

export function TaskDialog({
  action,
  task,
  projects,
  users,
  defaultStatus,
}: {
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
  task?: Task;
  projects: Option[];
  users: Option[];
  defaultStatus?: TaskStatus;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(
    async (prev: ActionResult, formData: FormData) => {
      const result = await action(prev, formData);
      if (result.ok) {
        setOpen(false);
        toast.success(task ? "Task aggiornato." : "Task creato.");
      }
      return result;
    },
    { ok: false }
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {task ? (
          <Button variant="ghost" size="icon-xs" aria-label={`Modifica ${task.title}`}>
            <Pencil />
          </Button>
        ) : (
          <Button>
            <Plus data-icon="inline-start" /> Nuovo task
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{task ? "Modifica task" : "Nuovo task"}</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <FormField label="Titolo *" name="title" errors={state.fieldErrors}>
            <Input id="title" name="title" defaultValue={task?.title} required />
          </FormField>
          <FormField label="Progetto *" name="projectId" errors={state.fieldErrors}>
            <Select name="projectId" defaultValue={task?.projectId ?? projects[0]?.id}>
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
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Stato" name="status" errors={state.fieldErrors}>
              <Select name="status" defaultValue={task?.status ?? defaultStatus ?? "TODO"}>
                <SelectTrigger id="status" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(TASK_STATUS) as TaskStatus[]).map((s) => (
                    <SelectItem key={s} value={s}>
                      {TASK_STATUS[s].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Priorità" name="priority" errors={state.fieldErrors}>
              <Select name="priority" defaultValue={task?.priority ?? "MEDIA"}>
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
            <FormField label="Assegnatario" name="assigneeId" errors={state.fieldErrors}>
              <Select name="assigneeId" defaultValue={task?.assigneeId ?? NONE}>
                <SelectTrigger id="assigneeId" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Nessuno</SelectItem>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Scadenza" name="dueDate" errors={state.fieldErrors}>
              <Input
                id="dueDate"
                name="dueDate"
                type="date"
                defaultValue={toDateInputValue(task?.dueDate)}
              />
            </FormField>
          </div>
          <FormField label="Descrizione" name="description" errors={state.fieldErrors}>
            <Textarea
              id="description"
              name="description"
              rows={3}
              defaultValue={task?.description ?? ""}
            />
          </FormField>
          <Button type="submit" disabled={isPending} className="w-full">
            {isPending ? "Salvataggio…" : "Salva"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
