import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { FilterBar } from "@/components/filter-bar";
import { CLIENT_STATUS } from "@/lib/labels";
import type { ClientStatus, Prisma } from "@/generated/prisma/client";

export const metadata = { title: "Clienti" };

type SearchParams = Promise<{ stato?: string; q?: string }>;

export default async function ClientiPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  // Next 16: searchParams è una Promise, va atteso.
  const { stato, q } = await searchParams;

  const where: Prisma.ClientWhereInput = {};
  if (stato && stato in CLIENT_STATUS) where.status = stato as ClientStatus;
  if (q) where.name = { contains: q, mode: "insensitive" };

  const clients = await prisma.client.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    include: {
      contacts: { where: { isPrimary: true }, take: 1 },
      _count: { select: { projects: true, quotes: true } },
    },
  });

  return (
    <>
      <PageHeader title="Clienti" subtitle={`${clients.length} clienti`}>
        <Button asChild>
          <Link href="/clienti/nuovo">
            <Plus data-icon="inline-start" /> Nuovo cliente
          </Link>
        </Button>
      </PageHeader>

      <FilterBar
        searchPlaceholder="Cerca per ragione sociale…"
        filters={[
          {
            param: "stato",
            label: "Stato",
            options: Object.entries(CLIENT_STATUS).map(([value, s]) => ({
              value,
              label: s.label,
            })),
          },
        ]}
      />

      <Card className="mt-4">
        <CardContent>
          {clients.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nessun cliente trovato.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead>Referente</TableHead>
                  <TableHead>Tag</TableHead>
                  <TableHead className="text-right">Progetti</TableHead>
                  <TableHead className="text-right">Preventivi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell>
                      <Link
                        href={`/clienti/${client.id}`}
                        className="font-semibold hover:underline"
                      >
                        {client.name}
                      </Link>
                      {client.email ? (
                        <p className="text-xs text-muted-foreground">{client.email}</p>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <StatusBadge {...CLIENT_STATUS[client.status]} />
                    </TableCell>
                    <TableCell className="text-sm">
                      {client.contacts[0]?.name ?? "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {client.tags.slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="outline">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{client._count.projects}</TableCell>
                    <TableCell className="text-right">{client._count.quotes}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}
