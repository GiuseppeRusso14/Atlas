import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/page-header";
import { FilterBar } from "@/components/filter-bar";
import { DeleteIconButton } from "@/components/delete-icon-button";
import { TimeEntryDialog } from "@/components/ore/time-entry-dialog";
import { formatDate, formatMinutes } from "@/lib/format";
import { addTimeEntryAction, deleteTimeEntryAction } from "./actions";
import type { Prisma } from "@/generated/prisma/client";

export const metadata = { title: "Ore" };

type SearchParams = Promise<{ progetto?: string; utente?: string }>;

export default async function OrePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { progetto, utente } = await searchParams;

  const where: Prisma.TimeEntryWhereInput = {};
  if (progetto) where.projectId = progetto;
  if (utente) where.userId = utente;

  const [currentUser, entries, projects, users] = await Promise.all([
    getCurrentUser(),
    prisma.timeEntry.findMany({
      where,
      orderBy: { date: "desc" },
      take: 100,
      include: { user: true, project: { include: { client: true } } },
    }),
    prisma.project.findMany({
      where: { status: { not: "ARCHIVIATO" } },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.user.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  // Riepiloghi (rispettano i filtri correnti).
  const [byProject, byUser] = await Promise.all([
    prisma.timeEntry.groupBy({
      by: ["projectId"],
      where,
      _sum: { minutes: true },
      orderBy: { _sum: { minutes: "desc" } },
    }),
    prisma.timeEntry.groupBy({
      by: ["userId"],
      where,
      _sum: { minutes: true },
      orderBy: { _sum: { minutes: "desc" } },
    }),
  ]);
  const projectNames = new Map(
    (
      await prisma.project.findMany({
        where: { id: { in: byProject.map((r) => r.projectId) } },
        select: { id: true, name: true },
      })
    ).map((p) => [p.id, p.name])
  );
  const userNames = new Map(users.map((u) => [u.id, u.name]));
  const totalMinutes = byProject.reduce((s, r) => s + (r._sum.minutes ?? 0), 0);

  const isAdmin = currentUser?.role === "ADMIN";

  return (
    <>
      <PageHeader
        title="Time tracking"
        subtitle={`${formatMinutes(totalMinutes)} totali nel filtro corrente`}
      >
        <TimeEntryDialog action={addTimeEntryAction} projects={projects} />
      </PageHeader>

      <div className="mb-4">
        <FilterBar
          filters={[
            {
              param: "progetto",
              label: "Progetto",
              options: projects.map((p) => ({ value: p.id, label: p.name })),
            },
            {
              param: "utente",
              label: "Utente",
              options: users.map((u) => ({ value: u.id, label: u.name })),
            },
          ]}
        />
      </div>

      <div className="mb-4 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Ore per progetto</CardTitle>
          </CardHeader>
          <CardContent>
            {byProject.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nessuna registrazione.</p>
            ) : (
              <ul className="space-y-2">
                {byProject.map((row) => (
                  <li key={row.projectId} className="flex items-center justify-between text-sm">
                    <Link href={`/progetti/${row.projectId}`} className="hover:underline">
                      {projectNames.get(row.projectId) ?? "Progetto"}
                    </Link>
                    <span className="font-semibold">
                      {formatMinutes(row._sum.minutes ?? 0)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Ore per utente</CardTitle>
          </CardHeader>
          <CardContent>
            {byUser.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nessuna registrazione.</p>
            ) : (
              <ul className="space-y-2">
                {byUser.map((row) => (
                  <li key={row.userId} className="flex items-center justify-between text-sm">
                    <span>{userNames.get(row.userId) ?? "Utente"}</span>
                    <span className="font-semibold">
                      {formatMinutes(row._sum.minutes ?? 0)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registrazioni recenti</CardTitle>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Nessuna registrazione trovata.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Utente</TableHead>
                  <TableHead>Progetto</TableHead>
                  <TableHead>Nota</TableHead>
                  <TableHead className="text-right">Durata</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>{formatDate(entry.date)}</TableCell>
                    <TableCell>{entry.user.name}</TableCell>
                    <TableCell>
                      <Link href={`/progetti/${entry.projectId}`} className="hover:underline">
                        {entry.project.name}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {entry.project.client.name}
                      </p>
                    </TableCell>
                    <TableCell className="max-w-56 truncate text-sm text-muted-foreground">
                      {entry.note ?? "—"}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatMinutes(entry.minutes)}
                    </TableCell>
                    <TableCell>
                      {isAdmin || entry.userId === currentUser?.id ? (
                        <DeleteIconButton
                          action={deleteTimeEntryAction.bind(null, entry.id)}
                          ariaLabel="Elimina registrazione"
                        />
                      ) : null}
                    </TableCell>
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
