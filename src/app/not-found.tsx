import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/misc";

export default function NotFound() {
  return (
    <main id="tresc" className="flex min-h-dvh items-center justify-center p-6">
      <EmptyState icon="🌾" title="Nie znaleziono strony" description="Ta strona nie istnieje lub została przeniesiona." action={<ButtonLink href="/">Wróć na start</ButtonLink>} />
    </main>
  );
}
