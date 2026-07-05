import { auth } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

/** Gruppo di suggerimenti per l'anteprima della ricerca globale. */
export type SearchGroup = {
  label: string;
  items: { href: string; label: string; sublabel?: string }[];
};

const TAKE = 4; // suggerimenti per categoria (l'elenco completo è su /cerca)

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ groups: [] }, { status: 401 });
  }

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return NextResponse.json({ groups: [] });
  }

  const contains = { contains: q, mode: "insensitive" as const };
  const [clients, projects, tasks, quotes] = await Promise.all([
    prisma.client.findMany({
      where: { name: contains },
      take: TAKE,
      select: { id: true, name: true },
    }),
    prisma.project.findMany({
      where: { name: contains },
      take: TAKE,
      select: { id: true, name: true, client: { select: { name: true } } },
    }),
    prisma.task.findMany({
      where: { title: contains },
      take: TAKE,
      select: {
        id: true,
        title: true,
        projectId: true,
        project: { select: { name: true } },
      },
    }),
    prisma.quote.findMany({
      where: {
        OR: [{ number: contains }, { client: { name: contains } }],
      },
      take: TAKE,
      select: { id: true, number: true, client: { select: { name: true } } },
    }),
  ]);

  const groups: SearchGroup[] = [
    {
      label: "Clienti",
      items: clients.map((c) => ({ href: `/clienti/${c.id}`, label: c.name })),
    },
    {
      label: "Progetti",
      items: projects.map((p) => ({
        href: `/progetti/${p.id}`,
        label: p.name,
        sublabel: p.client.name,
      })),
    },
    {
      label: "Task",
      items: tasks.map((t) => ({
        href: `/task?progetto=${t.projectId}`,
        label: t.title,
        sublabel: t.project.name,
      })),
    },
    {
      label: "Preventivi",
      items: quotes.map((quote) => ({
        href: `/preventivi/${quote.id}`,
        label: quote.number,
        sublabel: quote.client.name,
      })),
    },
  ].filter((g) => g.items.length > 0);

  return NextResponse.json({ groups });
}
