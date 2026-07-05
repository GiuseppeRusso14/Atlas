import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatRelative } from "@/lib/format";
import type { ActivityLog, User } from "@/generated/prisma/client";

export type ActivityWithUser = ActivityLog & { user: User };

function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/** Lista attività in stile feed, riusata nel dettaglio entità e in dashboard. */
export function ActivityFeed({
  activities,
  emptyMessage = "Nessuna attività registrata.",
}: {
  activities: ActivityWithUser[];
  emptyMessage?: string;
}) {
  if (activities.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  }
  return (
    <ul className="space-y-4">
      {activities.map((a) => (
        <li key={a.id} className="flex items-center gap-3">
          <Avatar className="size-9">
            {a.user.avatarUrl ? <AvatarImage src={a.user.avatarUrl} alt="" /> : null}
            <AvatarFallback className="bg-accent text-xs font-semibold">
              {initials(a.user.name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-sm">
              <span className="font-semibold">{a.user.name}</span> {a.action}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatRelative(a.createdAt)}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
