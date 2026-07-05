import { brand, brandMonogram } from "@/config/brand";

/** Cornice comune delle pagine di autenticazione. */
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-background p-6">
      <div className="flex items-center gap-3">
        <span className="flex size-11 items-center justify-center rounded-xl bg-primary text-xl font-bold text-primary-foreground">
          {brandMonogram}
        </span>
        <div>
          <p className="text-lg font-bold leading-tight">{brand.name}</p>
          <p className="text-sm text-muted-foreground">{brand.tagline}</p>
        </div>
      </div>
      {children}
    </main>
  );
}
