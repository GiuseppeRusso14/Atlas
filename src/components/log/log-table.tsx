"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ExternalLink, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ConfirmActionButton } from "@/components/confirm-action-button";
import {
  deleteLogAction,
  deleteLogsAction,
} from "@/app/(dashboard)/log/actions";
import { formatDateTime } from "@/lib/format";

/** Voce di log serializzabile per la tabella. */
export type LogRow = {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  createdAt: Date;
  userName: string;
};

const ENTITY_LABEL: Record<string, string> = {
  Client: "Cliente",
  Project: "Progetto",
  Task: "Task",
  Quote: "Preventivo",
  TimeEntry: "Ore",
  Resource: "Risorsa",
  User: "Utente",
};

/** Link alla pagina dell'entità, dove esiste una pagina di dettaglio. */
function entityHref(type: string, id: string): string | null {
  switch (type) {
    case "Client":
      return `/clienti/${id}`;
    case "Project":
      return `/progetti/${id}`;
    case "Quote":
      return `/preventivi/${id}`;
    default:
      return null;
  }
}

export function LogTable({ logs }: { logs: LogRow[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  const allSelected = logs.length > 0 && logs.every((l) => selected.has(l.id));

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(logs.map((l) => l.id)));
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function deleteOne(id: string) {
    startTransition(async () => {
      const result = await deleteLogAction(id);
      if (result?.ok === false) {
        toast.error(result.error ?? "Eliminazione non riuscita.");
      } else {
        setSelected((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    });
  }

  return (
    <>
      {selected.size > 0 ? (
        <div className="mb-3 flex items-center gap-3">
          <p className="text-sm text-muted-foreground">
            {selected.size} {selected.size === 1 ? "voce selezionata" : "voci selezionate"}
          </p>
          <ConfirmActionButton
            action={async () => {
              const result = await deleteLogsAction([...selected]);
              if (result.ok) setSelected(new Set());
              return result;
            }}
            label={
              <>
                <Trash2 data-icon="inline-start" /> Elimina selezionate
              </>
            }
            variant="destructive"
            title={`Eliminare ${selected.size} voci di log?`}
            description="Le voci selezionate verranno eliminate definitivamente dal registro attività."
            confirmLabel="Elimina"
            successMessage="Voci eliminate."
          />
        </div>
      ) : null}

      {logs.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Nessuna voce di log.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  aria-label="Seleziona tutte le voci in pagina"
                  className="size-4 accent-primary"
                />
              </TableHead>
              <TableHead>Attività</TableHead>
              <TableHead>Riferimento</TableHead>
              <TableHead>Data</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => {
              const href = entityHref(log.entityType, log.entityId);
              return (
                <TableRow key={log.id} data-state={selected.has(log.id) ? "selected" : undefined}>
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={selected.has(log.id)}
                      onChange={() => toggleOne(log.id)}
                      aria-label={`Seleziona voce di ${log.userName}`}
                      className="size-4 accent-primary"
                    />
                  </TableCell>
                  <TableCell className="text-sm">
                    <span className="font-semibold">{log.userName}</span> {log.action}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {ENTITY_LABEL[log.entityType] ?? log.entityType}
                      </Badge>
                      {href ? (
                        <Link
                          href={href}
                          className="text-primary hover:underline"
                          aria-label="Apri l'elemento collegato"
                        >
                          <ExternalLink className="size-3.5" />
                        </Link>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                    {formatDateTime(log.createdAt)}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Elimina voce"
                      disabled={isPending}
                      onClick={() => deleteOne(log.id)}
                    >
                      <Trash2 className="text-muted-foreground" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </>
  );
}
