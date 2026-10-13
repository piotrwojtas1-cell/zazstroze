"use client";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/misc";

export default function AppError({ reset }: { error: Error; reset: () => void }) {
  return (
    <EmptyState
      icon="🥀"
      title="Coś poszło nie tak"
      description="Nie udało się wczytać tej strony. Sprawdź połączenie i spróbuj ponownie."
      action={<Button onClick={reset}>Spróbuj ponownie</Button>}
    />
  );
}
