import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

/** Card KPI: numero grande in bold come da direzione visiva. */
export function KpiCard({
  label,
  value,
  icon: Icon,
  highlight = false,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  highlight?: boolean;
}) {
  return (
    <Card className={cn(highlight && "bg-primary text-primary-foreground")}>
      <CardContent className="flex items-center gap-4">
        <span
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-xl",
            highlight ? "bg-primary-foreground/20" : "bg-accent text-primary"
          )}
        >
          <Icon className="size-5" />
        </span>
        <div>
          <p className="text-3xl font-bold leading-tight">{value}</p>
          <p
            className={cn(
              "text-sm",
              highlight ? "text-primary-foreground/80" : "text-muted-foreground"
            )}
          >
            {label}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
