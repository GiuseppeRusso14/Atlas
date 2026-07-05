"use client";

import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/** Selettore (solo ADMIN) per aprire la board "Il mio lavoro" di un'altra persona. */
export function WorkUserPicker({
  users,
  value,
}: {
  users: { id: string; name: string }[];
  value: string;
}) {
  const router = useRouter();
  return (
    <Select value={value} onValueChange={(v) => router.push(`/mio-lavoro?utente=${v}`)}>
      <SelectTrigger className="w-56">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {users.map((u) => (
          <SelectItem key={u.id} value={u.id}>
            {u.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
