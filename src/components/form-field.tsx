import { Label } from "@/components/ui/label";

/** Campo di form standard: label sopra, errore sotto. */
export function FormField({
  label,
  name,
  errors,
  children,
}: {
  label: string;
  name: string;
  errors?: Record<string, string[]>;
  children: React.ReactNode;
}) {
  const fieldErrors = errors?.[name];
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      {children}
      {fieldErrors?.length ? (
        <p className="text-sm text-destructive">{fieldErrors[0]}</p>
      ) : null}
    </div>
  );
}
