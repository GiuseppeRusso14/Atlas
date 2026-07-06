import { redirect } from "next/navigation";
import { CalendarX2, Trash2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { FilterBar } from "@/components/filter-bar";
import { PaginationBar } from "@/components/pagination-bar";
import { parsePage } from "@/lib/pagination";
import { ConfirmActionButton } from "@/components/confirm-action-button";
import { LogTable } from "@/components/log/log-table";
import { deleteLogsOlderThanAction } from "./actions";
import type { Prisma } from "@/generated/prisma/client";

export const metadata = { title: "Log" };

const LOG_PAGE_SIZE = 50;

type SearchParams = Promise<{ utente?: string; pagina?: string }>;

export default async function LogPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  // Pagina riservata all'ADMIN (link in sidebar già nascosto ai MEMBER,
  // enforcement vero qui e nelle action).
  const currentUser = await getCurrentUser();
  if (currentUser?.role !== "ADMIN") {
    redirect("/");
  }

  const { utente, pagina } = await searchParams;
  const page = parsePage(pagina);

  const where: Prisma.ActivityLogWhereInput = {};
  if (utente) where.userId = utente;

  const [logs, totalCount, users] = await Promise.all([
    prisma.activityLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * LOG_PAGE_SIZE,
      take: LOG_PAGE_SIZE,
      include: { user: { select: { name: true } } },
    }),
    prisma.activityLog.count({ where }),
    prisma.user.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <>
      <PageHeader
        title="Log attività"
        subtitle={`${totalCount} voci nel registro — eliminarle sfoltisce il database`}
      >
        <div className="flex flex-wrap items-center gap-2">
          <ConfirmActionButton
            action={deleteLogsOlderThanAction.bind(null, 180)}
            label={
              <>
                <CalendarX2 data-icon="inline-start" /> Elimina più vecchi di 6 mesi
              </>
            }
            title="Eliminare le voci più vecchie di 6 mesi?"
            description="Verranno eliminate definitivamente tutte le voci del registro attività più vecchie di 180 giorni."
            confirmLabel="Elimina"
            successMessage="Pulizia completata."
          />
          <ConfirmActionButton
            action={deleteLogsOlderThanAction.bind(null, 0)}
            label={
              <>
                <Trash2 data-icon="inline-start" /> Svuota tutto
              </>
            }
            variant="destructive"
            title="Svuotare l'intero registro attività?"
            description="Tutte le voci di log verranno eliminate definitivamente. I dati di lavoro (clienti, progetti, task…) non vengono toccati."
            confirmLabel="Svuota registro"
            successMessage="Registro svuotato."
          />
        </div>
      </PageHeader>

      <div className="mb-4">
        <FilterBar
          filters={[
            {
              param: "utente",
              label: "Utente",
              options: users.map((u) => ({ value: u.id, label: u.name })),
            },
          ]}
        />
      </div>

      <Card>
        <CardContent>
          <LogTable
            logs={logs.map((log) => ({
              id: log.id,
              action: log.action,
              entityType: log.entityType,
              entityId: log.entityId,
              createdAt: log.createdAt,
              userName: log.user.name,
            }))}
          />
          <PaginationBar
            page={page}
            totalCount={totalCount}
            pageSize={LOG_PAGE_SIZE}
          />
        </CardContent>
      </Card>
    </>
  );
}
