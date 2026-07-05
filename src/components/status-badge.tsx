import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/** Badge di stato coerente con le mappe di lib/labels.ts. */
export function StatusBadge({
  label,
  className,
}: {
  label: string;
  className: string;
}) {
  return (
    <Badge variant="secondary" className={cn("border-transparent", className)}>
      {label}
    </Badge>
  );
}
