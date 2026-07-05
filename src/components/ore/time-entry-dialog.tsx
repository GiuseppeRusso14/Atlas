"use client";

import { useActionState, useState } from "react";
import { Plus } from "lucide-react";
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
import type { ActionResult } from "@/lib/action-result";

type Option = { id: string; name: string };

export function TimeEntryDialog({
  action,
  projects,
}: {
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
  projects: Option[];
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(
    async (prev: ActionResult, formData: FormData) => {
      const result = await action(prev, formData);
      if (result.ok) {
        setOpen(false);
        toast.success("Ore registrate.");
      }
      return result;
    },
    { ok: false }
  );

  const today = new Date().toISOString().slice(0, 10);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus data-icon="inline-start" /> Registra ore
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registra ore</DialogTitle>
        </DialogHeader>
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
          <div className="grid grid-cols-3 gap-4">
            <FormField label="Ore" name="hours" errors={state.fieldErrors}>
              <Input id="hours" name="hours" type="number" min={0} max={24} defaultValue={1} />
            </FormField>
            <FormField label="Minuti" name="minutes" errors={state.fieldErrors}>
              <Input id="minutes" name="minutes" type="number" min={0} max={59} step={5} defaultValue={0} />
            </FormField>
            <FormField label="Data *" name="date" errors={state.fieldErrors}>
              <Input id="date" name="date" type="date" defaultValue={today} required />
            </FormField>
          </div>
          <FormField label="Nota" name="note" errors={state.fieldErrors}>
            <Textarea id="note" name="note" rows={2} placeholder="Su cosa hai lavorato?" />
          </FormField>
          <Button type="submit" disabled={isPending} className="w-full">
            {isPending ? "Salvataggio…" : "Registra"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
