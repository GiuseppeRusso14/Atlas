import Link from "next/link";
import { FileText, FolderKanban, SquareCheckBig, Users } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import {
  AREA_LABEL,
  CLIENT_STATUS,
  PROJECT_STATUS,
  QUOTE_STATUS,
  TASK_STATUS,
} from "@/lib/labels";

export const metadata = { title: "Cerca" };

const TAKE = 8; // risultati per categoria

export default async function CercaPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  if (!query) {
    return (
      <>
        <PageHeader title="Cerca" subtitle="Clienti, progetti, task e preventivi" />
        <p className="text-sm text-muted-foreground">
          Digita qualcosa nella casella di ricerca della sidebar.
        </p>
      </>
    );
  }

  const contains = { contains: query, mode: "insensitive" as const };
  const [clients, projects, tasks, quotes] = await Promise.all([
    prisma.client.findMany({ where: { name: contains }, take: TAKE }),
    prisma.project.findMany({
      where: { name: contains },
      take: TAKE,
      include: { client: true },
    }),
    prisma.task.findMany({
      where: { title: contains, deletedAt: null },
      take: TAKE,
      include: { project: true },
    }),
    prisma.quote.findMany({
      where: {
        OR: [{ number: contains }, { notes: contains }],
      },
      take: TAKE,
      include: { client: true },
    }),
  ]);

  const total = clients.length + projects.length + tasks.length + quotes.length;

  return (
    <>
      <PageHeader
        title={`Risultati per “${query}”`}
        subtitle={total === 0 ? "Nessun risultato" : `${total} risultati`}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        {clients.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="size-4 text-primary" /> Clienti
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="divide-y divide-border">
                {clients.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-3 py-2.5">
                    <Link href={`/clienti/${c.id}`} className="font-medium hover:underline">
                      {c.name}
                    </Link>
                    <StatusBadge {...CLIENT_STATUS[c.status]} />
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ) : null}

        {projects.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FolderKanban className="size-4 text-primary" /> Progetti
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="divide-y divide-border">
                {projects.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <Link href={`/progetti/${p.id}`} className="font-medium hover:underline">
                        {p.name}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {p.client.name} · {AREA_LABEL[p.area]}
                      </p>
                    </div>
                    <StatusBadge {...PROJECT_STATUS[p.status]} />
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ) : null}

        {tasks.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SquareCheckBig className="size-4 text-primary" /> Task
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="divide-y divide-border">
                {tasks.map((t) => (
                  <li key={t.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <Link
                        href={`/task?progetto=${t.projectId}`}
                        className="font-medium hover:underline"
                      >
                        {t.title}
                      </Link>
                      <p className="text-xs text-muted-foreground">{t.project.name}</p>
                    </div>
                    <StatusBadge {...TASK_STATUS[t.status]} />
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ) : null}

        {quotes.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="size-4 text-primary" /> Preventivi
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="divide-y divide-border">
                {quotes.map((quote) => (
                  <li key={quote.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <Link
                        href={`/preventivi/${quote.id}`}
                        className="font-medium hover:underline"
                      >
                        {quote.number}
                      </Link>
                      <p className="text-xs text-muted-foreground">{quote.client.name}</p>
                    </div>
                    <StatusBadge {...QUOTE_STATUS[quote.status]} />
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ) : null}
      </div>
      {total === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nessun risultato per “{query}”. Prova con un termine più corto.
        </p>
      ) : null}
    </>
  );
}
