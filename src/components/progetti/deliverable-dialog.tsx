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
import { APPROVAL_STATUS, GRAPHIC_TYPE_LABEL } from "@/lib/labels";
import type { ActionResult } from "@/lib/action-result";
import type {
  ApprovalStatus,
  GraphicDeliverable,
  GraphicType,
} from "@/generated/prisma/client";

/** Dialog di creazione/modifica di un deliverable grafico. */
export function DeliverableDialog({
  action,
  deliverable,
}: {
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
  deliverable?: GraphicDeliverable;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(
    async (prev: ActionResult, formData: FormData) => {
      const result = await action(prev, formData);
      if (result.ok) {
        setOpen(false);
        toast.success(deliverable ? "Deliverable aggiornato." : "Deliverable aggiunto.");
      }
      return result;
    },
    { ok: false }
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {deliverable ? (
          <Button variant="ghost" size="icon-sm" aria-label={`Modifica ${deliverable.title}`}>
            <Pencil />
          </Button>
        ) : (
          <Button variant="outline" size="sm">
            <Plus data-icon="inline-start" /> Nuovo deliverable
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {deliverable ? "Modifica deliverable" : "Nuovo deliverable"}
          </DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <FormField label="Titolo *" name="title" errors={state.fieldErrors}>
            <Input id="title" name="title" defaultValue={deliverable?.title} required />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Tipo" name="type" errors={state.fieldErrors}>
              <Select name="type" defaultValue={deliverable?.type ?? "LOGO"}>
                <SelectTrigger id="type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(GRAPHIC_TYPE_LABEL) as GraphicType[]).map((t) => (
                    <SelectItem key={t} value={t}>
                      {GRAPHIC_TYPE_LABEL[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Versione" name="version" errors={state.fieldErrors}>
              <Input
                id="version"
                name="version"
                type="number"
                min={1}
                defaultValue={deliverable?.version ?? 1}
              />
            </FormField>
          </div>
          <FormField label="Stato approvazione" name="approvalStatus" errors={state.fieldErrors}>
            <Select
              name="approvalStatus"
              defaultValue={deliverable?.approvalStatus ?? "BOZZA"}
            >
              <SelectTrigger id="approvalStatus" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(APPROVAL_STATUS) as ApprovalStatus[]).map((s) => (
                  <SelectItem key={s} value={s}>
                    {APPROVAL_STATUS[s].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Link reference/anteprima" name="referenceUrl" errors={state.fieldErrors}>
            <Input
              id="referenceUrl"
              name="referenceUrl"
              placeholder="https://… (Figma, Drive…)"
              defaultValue={deliverable?.referenceUrl ?? ""}
            />
          </FormField>
          <FormField label="Note" name="notes" errors={state.fieldErrors}>
            <Textarea id="notes" name="notes" rows={2} defaultValue={deliverable?.notes ?? ""} />
          </FormField>
          <Button type="submit" disabled={isPending} className="w-full">
            {isPending ? "Salvataggio…" : "Salva"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
