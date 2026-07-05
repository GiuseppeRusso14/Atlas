import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { InlineStatusSelect } from "@/components/inline-status-select";
import { DeleteIconButton } from "@/components/delete-icon-button";
import { DeliverableDialog } from "@/components/progetti/deliverable-dialog";
import {
  deleteDeliverableAction,
  saveDeliverableAction,
  updateDeliverableStatusAction,
} from "@/app/(dashboard)/progetti/actions";
import { APPROVAL_STATUS, GRAPHIC_TYPE_LABEL } from "@/lib/labels";
import type { GraphicDeliverable } from "@/generated/prisma/client";

const APPROVAL_OPTIONS = Object.entries(APPROVAL_STATUS).map(([value, s]) => ({
  value,
  label: s.label,
}));

/** Sezione GRAFICA del dettaglio progetto: deliverable con versioni e approvazioni. */
export function GraphicSection({
  projectId,
  deliverables,
}: {
  projectId: string;
  deliverables: GraphicDeliverable[];
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Deliverable</CardTitle>
        <DeliverableDialog action={saveDeliverableAction.bind(null, projectId, null)} />
      </CardHeader>
      <CardContent>
        {deliverables.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Nessun deliverable. Aggiungi loghi, brand identity, grafiche social o print.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Titolo</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Versione</TableHead>
                <TableHead>Approvazione</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {deliverables.map((d) => (
                <TableRow key={d.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{d.title}</span>
                      {d.referenceUrl ? (
                        <a
                          href={d.referenceUrl}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={`Apri reference di ${d.title}`}
                        >
                          <ExternalLink className="size-3.5 text-primary" />
                        </a>
                      ) : null}
                    </div>
                    {d.notes ? (
                      <p className="mt-0.5 text-xs text-muted-foreground">{d.notes}</p>
                    ) : null}
                  </TableCell>
                  <TableCell>{GRAPHIC_TYPE_LABEL[d.type]}</TableCell>
                  <TableCell>
                    <Badge variant="outline">v{d.version}</Badge>
                  </TableCell>
                  <TableCell>
                    <InlineStatusSelect
                      value={d.approvalStatus}
                      options={APPROVAL_OPTIONS}
                      action={updateDeliverableStatusAction.bind(null, d.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end">
                      <DeliverableDialog
                        action={saveDeliverableAction.bind(null, projectId, d.id)}
                        deliverable={d}
                      />
                      <DeleteIconButton
                        action={deleteDeliverableAction.bind(null, d.id)}
                        ariaLabel={`Elimina ${d.title}`}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
