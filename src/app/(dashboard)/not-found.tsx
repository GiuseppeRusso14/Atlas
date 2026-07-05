import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function NotFound() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Card className="max-w-md">
        <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
          <p className="text-4xl font-bold text-primary">404</p>
          <p className="text-sm text-muted-foreground">
            La pagina che cerchi non esiste o è stata eliminata.
          </p>
          <Button asChild>
            <Link href="/">Torna alla dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
