import { ExternalLink, StickyNote } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResourceAddDialog } from "@/components/resources/resource-add-dialog";
import { DeleteIconButton } from "@/components/delete-icon-button";
import { addResourceAction, deleteResourceAction } from "@/actions/resources";
import { formatDate } from "@/lib/format";
import type { Resource } from "@/generated/prisma/client";

type ResourceSectionProps = {
  resources: Resource[];
  parent: { clientId: string } | { projectId: string };
};

/** Card "Note & Link" riusata nel dettaglio cliente e progetto. */
export function ResourceSection({ resources, parent }: ResourceSectionProps) {
  const addAction = addResourceAction.bind(null, parent);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Note &amp; Link</CardTitle>
        <ResourceAddDialog action={addAction} />
      </CardHeader>
      <CardContent>
        {resources.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nessuna nota o link. Aggiungi qui brief, moodboard, cartelle Drive o
            riferimenti al password manager.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {resources.map((r) => (
              <li key={r.id} className="flex items-start gap-3 py-3">
                {r.type === "LINK" ? (
                  <ExternalLink className="mt-0.5 size-4 shrink-0 text-primary" />
                ) : (
                  <StickyNote className="mt-0.5 size-4 shrink-0 text-accent-2" />
                )}
                <div className="min-w-0 flex-1">
                  {r.type === "LINK" && r.url ? (
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-foreground underline-offset-4 hover:underline"
                    >
                      {r.title}
                    </a>
                  ) : (
                    <p className="font-medium">{r.title}</p>
                  )}
                  {r.type === "NOTA" && r.content ? (
                    <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                      {r.content}
                    </p>
                  ) : null}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatDate(r.createdAt)}
                  </p>
                </div>
                <DeleteIconButton
                  action={deleteResourceAction.bind(null, r.id)}
                  ariaLabel={`Elimina ${r.title}`}
                />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
