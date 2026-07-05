import Link from "next/link";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  parse,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { it } from "date-fns/locale";
import { CalendarDays, ChevronLeft, ChevronRight, ExternalLink, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/status-badge";
import { InlineStatusSelect } from "@/components/inline-status-select";
import { DeleteIconButton } from "@/components/delete-icon-button";
import { SocialPostDialog } from "@/components/progetti/social-post-dialog";
import {
  deletePostAction,
  savePostAction,
  updatePostStatusAction,
} from "@/app/(dashboard)/progetti/actions";
import { POST_STATUS, SOCIAL_PLATFORM_LABEL } from "@/lib/labels";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { SocialPost } from "@/generated/prisma/client";

const POST_STATUS_OPTIONS = Object.entries(POST_STATUS).map(([value, s]) => ({
  value,
  label: s.label,
}));

type SocialSectionProps = {
  projectId: string;
  posts: SocialPost[];
  /** Vista corrente: "lista" (default) o "calendario". */
  vista?: string;
  /** Mese del calendario in formato yyyy-MM. */
  mese?: string;
};

/** Sezione SOCIAL del dettaglio progetto: piano editoriale lista + calendario. */
export function SocialSection({ projectId, posts, vista, mese }: SocialSectionProps) {
  const isCalendar = vista === "calendario";
  const base = `/progetti/${projectId}`;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Piano editoriale</CardTitle>
        <div className="flex items-center gap-2">
          <Button
            variant={isCalendar ? "outline" : "secondary"}
            size="sm"
            asChild
          >
            <Link href={base}>
              <List data-icon="inline-start" /> Lista
            </Link>
          </Button>
          <Button
            variant={isCalendar ? "secondary" : "outline"}
            size="sm"
            asChild
          >
            <Link href={`${base}?vista=calendario`}>
              <CalendarDays data-icon="inline-start" /> Calendario
            </Link>
          </Button>
          <SocialPostDialog action={savePostAction.bind(null, projectId, null)} />
        </div>
      </CardHeader>
      <CardContent>
        {isCalendar ? (
          <PostCalendar projectId={projectId} posts={posts} mese={mese} />
        ) : (
          <PostTable projectId={projectId} posts={posts} />
        )}
      </CardContent>
    </Card>
  );
}

function PostTable({ projectId, posts }: { projectId: string; posts: SocialPost[] }) {
  if (posts.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        Nessun post in piano. Aggiungi idee, bozze e post programmati.
      </p>
    );
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Piattaforma</TableHead>
          <TableHead>Data programmata</TableHead>
          <TableHead>Caption</TableHead>
          <TableHead>Stato</TableHead>
          <TableHead className="w-20" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {posts.map((post) => (
          <TableRow key={post.id}>
            <TableCell className="font-medium">
              {SOCIAL_PLATFORM_LABEL[post.platform]}
            </TableCell>
            <TableCell>{formatDateTime(post.scheduledDate)}</TableCell>
            <TableCell className="max-w-64">
              <div className="flex items-center gap-2">
                <span className="truncate">{post.caption ?? "—"}</span>
                {post.contentUrl ? (
                  <a
                    href={post.contentUrl}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Apri creatività"
                  >
                    <ExternalLink className="size-3.5 shrink-0 text-primary" />
                  </a>
                ) : null}
              </div>
            </TableCell>
            <TableCell>
              <InlineStatusSelect
                value={post.status}
                options={POST_STATUS_OPTIONS}
                action={updatePostStatusAction.bind(null, post.id)}
              />
            </TableCell>
            <TableCell>
              <div className="flex items-center justify-end">
                <SocialPostDialog
                  action={savePostAction.bind(null, projectId, post.id)}
                  post={post}
                />
                <DeleteIconButton
                  action={deletePostAction.bind(null, post.id)}
                  ariaLabel="Elimina post"
                />
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function PostCalendar({
  projectId,
  posts,
  mese,
}: {
  projectId: string;
  posts: SocialPost[];
  mese?: string;
}) {
  // Mese richiesto (yyyy-MM) o corrente.
  const month = mese
    ? parse(mese, "yyyy-MM", new Date())
    : startOfMonth(new Date());
  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }),
  });
  const monthParam = (d: Date) => format(d, "yyyy-MM");
  const base = `/progetti/${projectId}?vista=calendario`;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <Button variant="ghost" size="icon-sm" asChild>
          <Link
            href={`${base}&mese=${monthParam(addMonths(month, -1))}`}
            aria-label="Mese precedente"
          >
            <ChevronLeft />
          </Link>
        </Button>
        <p className="font-semibold capitalize">
          {format(month, "MMMM yyyy", { locale: it })}
        </p>
        <Button variant="ghost" size="icon-sm" asChild>
          <Link
            href={`${base}&mese=${monthParam(addMonths(month, 1))}`}
            aria-label="Mese successivo"
          >
            <ChevronRight />
          </Link>
        </Button>
      </div>
      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-border bg-border">
        {["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"].map((d) => (
          <div
            key={d}
            className="bg-muted px-2 py-1.5 text-center text-xs font-semibold text-muted-foreground"
          >
            {d}
          </div>
        ))}
        {days.map((day) => {
          const dayPosts = posts.filter(
            (p) => p.scheduledDate && isSameDay(p.scheduledDate, day)
          );
          return (
            <div
              key={day.toISOString()}
              className={cn(
                "min-h-24 bg-card p-1.5",
                !isSameMonth(day, month) && "bg-muted/40 text-muted-foreground"
              )}
            >
              <p className="text-right text-xs">{format(day, "d")}</p>
              <div className="mt-1 space-y-1">
                {dayPosts.map((post) => (
                  <div
                    key={post.id}
                    className="rounded-md bg-accent px-1.5 py-1 text-xs"
                    title={post.caption ?? undefined}
                  >
                    <p className="truncate font-medium">
                      {SOCIAL_PLATFORM_LABEL[post.platform]}
                    </p>
                    <StatusBadge {...POST_STATUS[post.status]} />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
