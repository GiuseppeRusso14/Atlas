import Link from "next/link";
import { notFound } from "next/navigation";
import { Archive, Pencil, Trash2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/status-badge";
import { ActivityFeed } from "@/components/activity-feed";
import { ResourceSection } from "@/components/resources/resource-section";
import { ContactAddDialog } from "@/components/clienti/contact-add-dialog";
import { DeleteIconButton } from "@/components/delete-icon-button";
import { ConfirmActionButton } from "@/components/confirm-action-button";
import {
  AREA_LABEL,
  CLIENT_STATUS,
  PROJECT_STATUS,
  QUOTE_STATUS,
} from "@/lib/labels";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  addContactAction,
  archiveClientAction,
  deleteClientAction,
  deleteContactAction,
} from "../actions";

export const metadata = { title: "Dettaglio cliente" };

export default async function ClientePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [user, client] = await Promise.all([
    getCurrentUser(),
    prisma.client.findUnique({
      where: { id },
      include: {
        contacts: { orderBy: [{ isPrimary: "desc" }, { name: "asc" }] },
        projects: { orderBy: { updatedAt: "desc" } },
        quotes: { include: { items: true }, orderBy: { createdAt: "desc" } },
        resources: { orderBy: { createdAt: "desc" } },
      },
    }),
  ]);
  if (!client) notFound();

  const isAdmin = user?.role === "ADMIN";
  const activities = await prisma.activityLog.findMany({
    where: { entityType: "Client", entityId: client.id },
    include: { user: true },
    orderBy: { createdAt: "desc" },
    take: 15,
  });

  return (
    <>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{client.name}</h1>
            <StatusBadge {...CLIENT_STATUS[client.status]} />
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {client.tags.map((tag) => (
              <Badge key={tag} variant="outline">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" asChild>
            <Link href={`/clienti/${client.id}/modifica`}>
              <Pencil data-icon="inline-start" /> Modifica
            </Link>
          </Button>
          {client.status !== "CLOSED" ? (
            <ConfirmActionButton
              action={archiveClientAction.bind(null, client.id)}
              label={
                <>
                  <Archive data-icon="inline-start" /> Archivia
                </>
              }
              title="Archiviare il cliente?"
              description="Il cliente passa in stato Chiuso. Potrai riattivarlo in qualsiasi momento dalla modifica."
              confirmLabel="Archivia"
              successMessage="Cliente archiviato."
            />
          ) : null}
          {/* Eliminazione: visibile solo all'ADMIN (enforcement anche server-side) */}
          {isAdmin ? (
            <ConfirmActionButton
              action={deleteClientAction.bind(null, client.id)}
              label={
                <>
                  <Trash2 data-icon="inline-start" /> Elimina
                </>
              }
              variant="destructive"
              title="Eliminare definitivamente il cliente?"
              description="Verranno eliminati anche progetti, task, preventivi e note collegati. L'operazione non è reversibile."
              confirmLabel="Elimina definitivamente"
            />
          ) : null}
        </div>
      </div>

      <Tabs defaultValue="panoramica">
        <TabsList>
          <TabsTrigger value="panoramica">Panoramica</TabsTrigger>
          <TabsTrigger value="progetti">
            Progetti ({client.projects.length})
          </TabsTrigger>
          <TabsTrigger value="preventivi">
            Preventivi ({client.quotes.length})
          </TabsTrigger>
          <TabsTrigger value="note">
            Note &amp; Link ({client.resources.length})
          </TabsTrigger>
        </TabsList>

        {/* ---------- Panoramica ---------- */}
        <TabsContent value="panoramica" className="mt-4 grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Anagrafica</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
                <dt className="text-muted-foreground">P.IVA</dt>
                <dd>{client.vatNumber ?? "—"}</dd>
                <dt className="text-muted-foreground">Codice fiscale</dt>
                <dd>{client.fiscalCode ?? "—"}</dd>
                <dt className="text-muted-foreground">Email</dt>
                <dd>{client.email ?? "—"}</dd>
                <dt className="text-muted-foreground">Telefono</dt>
                <dd>{client.phone ?? "—"}</dd>
                <dt className="text-muted-foreground">Sito web</dt>
                <dd>
                  {client.website ? (
                    <a
                      href={client.website}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary underline-offset-4 hover:underline"
                    >
                      {client.website}
                    </a>
                  ) : (
                    "—"
                  )}
                </dd>
                <dt className="text-muted-foreground">Indirizzo</dt>
                <dd>{client.address ?? "—"}</dd>
                <dt className="text-muted-foreground">Cliente dal</dt>
                <dd>{formatDate(client.createdAt)}</dd>
              </dl>
              {client.notes ? (
                <p className="mt-4 whitespace-pre-wrap rounded-lg bg-muted p-3 text-sm">
                  {client.notes}
                </p>
              ) : null}
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Contatti</CardTitle>
                <ContactAddDialog action={addContactAction.bind(null, client.id)} />
              </CardHeader>
              <CardContent>
                {client.contacts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nessun referente.</p>
                ) : (
                  <ul className="divide-y divide-border">
                    {client.contacts.map((contact) => (
                      <li key={contact.id} className="flex items-center gap-3 py-3">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium">
                            {contact.name}{" "}
                            {contact.isPrimary ? (
                              <Badge variant="secondary" className="ml-1 bg-primary/10 text-primary">
                                Primario
                              </Badge>
                            ) : null}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {[contact.position, contact.email, contact.phone]
                              .filter(Boolean)
                              .join(" · ") || "—"}
                          </p>
                        </div>
                        <DeleteIconButton
                          action={deleteContactAction.bind(null, contact.id)}
                          ariaLabel={`Elimina ${contact.name}`}
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Attività recenti</CardTitle>
              </CardHeader>
              <CardContent>
                <ActivityFeed activities={activities} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ---------- Progetti ---------- */}
        <TabsContent value="progetti" className="mt-4">
          <Card>
            <CardContent>
              {client.projects.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Nessun progetto per questo cliente.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Progetto</TableHead>
                      <TableHead>Area</TableHead>
                      <TableHead>Stato</TableHead>
                      <TableHead>Scadenza</TableHead>
                      <TableHead className="text-right">Budget</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {client.projects.map((project) => (
                      <TableRow key={project.id}>
                        <TableCell>
                          <Link
                            href={`/progetti/${project.id}`}
                            className="font-semibold hover:underline"
                          >
                            {project.name}
                          </Link>
                        </TableCell>
                        <TableCell>{AREA_LABEL[project.area]}</TableCell>
                        <TableCell>
                          <StatusBadge {...PROJECT_STATUS[project.status]} />
                        </TableCell>
                        <TableCell>{formatDate(project.deadline)}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(project.budget)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---------- Preventivi ---------- */}
        <TabsContent value="preventivi" className="mt-4">
          <Card>
            <CardContent>
              {client.quotes.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Nessun preventivo per questo cliente.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Numero</TableHead>
                      <TableHead>Stato</TableHead>
                      <TableHead>Emesso il</TableHead>
                      <TableHead>Valido fino al</TableHead>
                      <TableHead className="text-right">Totale</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {client.quotes.map((quote) => {
                      const total = quote.items.reduce(
                        (sum, item) =>
                          sum + Number(item.quantity) * Number(item.unitPrice),
                        0
                      );
                      return (
                        <TableRow key={quote.id}>
                          <TableCell>
                            <Link
                              href={`/preventivi/${quote.id}`}
                              className="font-semibold hover:underline"
                            >
                              {quote.number}
                            </Link>
                          </TableCell>
                          <TableCell>
                            <StatusBadge {...QUOTE_STATUS[quote.status]} />
                          </TableCell>
                          <TableCell>{formatDate(quote.issuedDate)}</TableCell>
                          <TableCell>{formatDate(quote.validUntil)}</TableCell>
                          <TableCell className="text-right font-semibold">
                            {formatCurrency(total)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---------- Note & Link ---------- */}
        <TabsContent value="note" className="mt-4">
          <ResourceSection
            resources={client.resources}
            parent={{ clientId: client.id }}
          />
        </TabsContent>
      </Tabs>
    </>
  );
}
