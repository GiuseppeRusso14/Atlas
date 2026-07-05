import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { ProjectForm } from "@/components/progetti/project-form";
import { updateProjectAction } from "../../actions";

export const metadata = { title: "Modifica progetto" };

export default async function ModificaProgettoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [project, clients, users] = await Promise.all([
    prisma.project.findUnique({
      where: { id },
      include: { members: { select: { id: true } } },
    }),
    prisma.client.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.user.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, reparto: true },
    }),
  ]);
  if (!project) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Modifica progetto" subtitle={project.name} />
      <ProjectForm
        action={updateProjectAction.bind(null, project.id)}
        clients={clients}
        users={users}
        project={{
          id: project.id,
          name: project.name,
          clientId: project.clientId,
          area: project.area,
          status: project.status,
          paymentStatus: project.paymentStatus,
          description: project.description,
          startDate: project.startDate,
          deadline: project.deadline,
          budget: project.budget ? project.budget.toString() : null,
          members: project.members,
        }}
      />
    </div>
  );
}
