import { prisma } from "@/lib/prisma";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { PageHeader } from "@/components/page-header";
import { ProjectForm } from "@/components/progetti/project-form";
import { createProjectAction } from "../actions";

export const metadata = { title: "Nuovo progetto" };

export default async function NuovoProgettoPage({
  searchParams,
}: {
  searchParams: Promise<{ cliente?: string }>;
}) {
  const { cliente } = await searchParams;
  const [clients, users] = await Promise.all([
    prisma.client.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.user.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, reparto: true },
    }),
  ]);

  return (
    <div className="mx-auto max-w-3xl">
      <Breadcrumbs
        items={[{ label: "Progetti", href: "/progetti" }, { label: "Nuovo" }]}
      />
      <PageHeader
        title="Nuovo progetto"
        subtitle="Commessa collegata a un cliente e a un'area"
      />
      <ProjectForm
        action={createProjectAction}
        clients={clients}
        users={users}
        defaultClientId={cliente}
      />
    </div>
  );
}
