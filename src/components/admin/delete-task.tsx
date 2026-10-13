"use client";

import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { api } from "@/lib/api-client";
import { useToast } from "@/components/ui/toast";

export function DeleteTaskButton({ id }: { id: string }) {
  const router = useRouter();
  const toast = useToast();
  return (
    <button
      type="button"
      aria-label="Usuń zadanie"
      className="rounded p-1 text-muted hover:text-danger-700"
      onClick={async () => {
        if (!confirm("Usunąć zadanie z kalendarza?")) return;
        await api(`/api/v1/admin/garden-tasks/${id}`, { method: "DELETE" }).then(() => toast("Usunięto."), () => toast("Błąd", "error"));
        router.refresh();
      }}
    >
      <Trash2 className="size-3.5" aria-hidden />
    </button>
  );
}
