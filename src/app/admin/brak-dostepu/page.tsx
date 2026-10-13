import { EmptyState } from "@/components/ui/misc";
import { ButtonLink } from "@/components/ui/button";

export default function NoAccess() {
  return (
    <EmptyState icon="🔒" title="Brak dostępu" description="Twoja rola nie ma uprawnień do tej sekcji. Skontaktuj się z administratorem." action={<ButtonLink href="/admin">Wróć do pulpitu</ButtonLink>} />
  );
}
