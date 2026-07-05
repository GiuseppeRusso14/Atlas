import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
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
import { PaginationBar } from "@/components/pagination-bar";
import { PAGE_SIZE, parsePage } from "@/lib/pagination";
import {
  AREA_LABEL,
  PAYMENT_STATUS,
  PROJECT_STATUS,
  REPARTO_LABEL,
} from "@/lib/labels";
import { formatCurrency, formatDate } from "@/lib/format";
import type {
  Area,
  PaymentStatus,
  Prisma,
  ProjectStatus,
  Reparto,
} from "@/generated/prisma/client";

export const metadata = { title: "Progetti" };

type SearchParams = Promise<{
  q?: string;
  area?: string;
  stato?: string;
  cliente?: string;
  reparto?: string;
  pagamento?: string;
  pagina?: string;
}>;

export default async function ProgettiPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { q, area, stato, cliente, reparto, pagamento, pagina } =
    await searchParams;
  const page = parsePage(pagina);

  const where: Prisma.ProjectWhereInput = {};
  if (q) where.name = { contains: q, mode: "insensitive" };
  if (area && area in AREA_LABEL) where.area = area as Area;
  if (stato && stato in PROJECT_STATUS) where.status = stato as ProjectStatus;
  if (pagamento && pagamento in PAYMENT_STATUS)
    where.paymentStatus = pagamento as PaymentStatus;
  if (cliente) where.clientId = cliente;
  if (reparto && reparto in REPARTO_LABEL)
    where.members = { some: { reparto: reparto as Reparto } };

  const [projects, totalCount, clients] = await Promise.all([
    prisma.project.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { client: true, members: true },
    }),
    prisma.project.count({ where }),
    prisma.client.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <>
      <PageHeader title="Progetti" subtitle={`${totalCount} progetti`}>
        <Button asChild>
          <Link href="/progetti/nuovo">
            <Plus data-icon="inline-start" /> Nuovo progetto
          </Link>
        </Button>
      </PageHeader>

      <FilterBar
        searchPlaceholder="Cerca progetto…"
        filters={[
          {
            param: "area",
            label: "Area",
            options: Object.entries(AREA_LABEL).map(([value, label]) => ({ value, label })),
          },
          {
            param: "stato",
            label: "Stato",
            options: Object.entries(PROJECT_STATUS).map(([value, s]) => ({
              value,
              label: s.label,
            })),
          },
          {
            param: "cliente",
            label: "Cliente",
            options: clients.map((c) => ({ value: c.id, label: c.name })),
          },
          {
            param: "reparto",
            label: "Reparto",
            options: Object.entries(REPARTO_LABEL).map(([value, label]) => ({ value, label })),
          },
          {
            param: "pagamento",
            label: "Pagamento",
            options: Object.entries(PAYMENT_STATUS).map(([value, s]) => ({
              value,
              label: s.label,
            })),
          },
        ]}
      />

      <Card className="mt-4">
        <CardContent>
          {projects.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nessun progetto trovato.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Progetto</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Area</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead>Pagamento</TableHead>
                  <TableHead>Deadline</TableHead>
                  <TableHead className="text-right">Budget</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.map((project) => (
                  <TableRow key={project.id}>
                    <TableCell>
                      <Link
                        href={`/progetti/${project.id}`}
                        className="font-semibold hover:underline"
                      >
                        {project.name}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {project.members.map((m) => m.name.split(" ")[0]).join(", ") ||
                          "Nessun assegnatario"}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Link href={`/clienti/${project.clientId}`} className="hover:underline">
                        {project.client.name}
                      </Link>
                    </TableCell>
                    <TableCell>{AREA_LABEL[project.area]}</TableCell>
                    <TableCell>
                      <StatusBadge {...PROJECT_STATUS[project.status]} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge {...PAYMENT_STATUS[project.paymentStatus]} />
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
          <PaginationBar page={page} totalCount={totalCount} />
        </CardContent>
      </Card>
    </>
  );
}
