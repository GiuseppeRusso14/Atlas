import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { InlineStatusSelect } from "@/components/inline-status-select";
import { REPARTO_LABEL } from "@/lib/labels";
import { formatDate } from "@/lib/format";
import { updateUserRepartoAction, updateUserRoleAction } from "./actions";

export const metadata = { title: "Team" };

const ROLE_OPTIONS = [
  { value: "ADMIN", label: "Admin" },
  { value: "MEMBER", label: "Membro" },
];

const REPARTO_OPTIONS = [
  { value: "__none__", label: "Nessuno" },
  ...Object.entries(REPARTO_LABEL).map(([value, label]) => ({ value, label })),
];

function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default async function TeamPage() {
  const currentUser = await getCurrentUser();
  // Pagina riservata all'ADMIN (il link in sidebar è già nascosto ai MEMBER,
  // ma l'enforcement vero è qui e nelle action).
  if (currentUser?.role !== "ADMIN") {
    redirect("/");
  }

  const users = await prisma.user.findMany({
    orderBy: [{ role: "asc" }, { name: "asc" }],
    include: { _count: { select: { tasks: true, timeEntries: true } } },
  });

  return (
    <>
      <PageHeader
        title="Team"
        subtitle="Ruoli e reparti degli utenti — i nuovi account nascono Membro senza reparto"
      />
      <Card>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Utente</TableHead>
                <TableHead>Ruolo</TableHead>
                <TableHead>Reparto</TableHead>
                <TableHead>Nel team dal</TableHead>
                <TableHead className="text-right">Task assegnati</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="size-9">
                        {user.avatarUrl ? (
                          <AvatarImage src={user.avatarUrl} alt="" />
                        ) : null}
                        <AvatarFallback className="bg-accent text-xs font-semibold">
                          {initials(user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">
                          {user.name}
                          {user.id === currentUser.id ? (
                            <span className="ml-2 text-xs text-muted-foreground">(tu)</span>
                          ) : null}
                        </p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <InlineStatusSelect
                      value={user.role}
                      options={ROLE_OPTIONS}
                      action={updateUserRoleAction.bind(null, user.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <InlineStatusSelect
                      value={user.reparto ?? "__none__"}
                      options={REPARTO_OPTIONS}
                      action={updateUserRepartoAction.bind(null, user.id)}
                    />
                  </TableCell>
                  <TableCell>{formatDate(user.createdAt)}</TableCell>
                  <TableCell className="text-right">{user._count.tasks}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p className="mt-4 text-xs text-muted-foreground">
            Gli account si creano con la registrazione (login Clerk): qui assegni
            solo ruolo e reparto. Deve restare sempre almeno un Admin.
          </p>
        </CardContent>
      </Card>
    </>
  );
}
