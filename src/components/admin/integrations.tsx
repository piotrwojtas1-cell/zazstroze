"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { Dialog } from "@/components/ui/dialog";
import { Alert } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";

export function IntegrationActions({ id, active }: { id: string; active: boolean }) {
  const router = useRouter();
  const toast = useToast();
  return (
    <Button
      size="sm"
      variant="outline"
      onClick={async () => {
        try {
          await api(`/api/v1/admin/integrations/${id}`, { method: "PATCH", body: { active: !active } });
          toast(active ? "Integracja wyłączona." : "Integracja włączona.");
          router.refresh();
        } catch (e) {
          toast(e instanceof ApiError ? e.message : "Błąd", "error");
        }
      }}
    >
      {active ? "Wyłącz" : "Włącz"}
    </Button>
  );
}

export function CreateIntegration() {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<{ keyId: string; secret: string } | null>(null);
  return (
    <>
      <Button onClick={() => { setCreated(null); setName(""); setOpen(true); }}>Nowa integracja</Button>
      <Dialog
        open={open}
        onClose={() => { setOpen(false); router.refresh(); }}
        title={created ? "Zapisz dane dostępowe" : "Nowa integracja POS"}
        footer={created ? <Button onClick={() => { setOpen(false); router.refresh(); }}>Zapisałem sekret</Button> : <Button loading={busy} disabled={name.trim().length < 3} onClick={async () => {
          setBusy(true);
          try {
            setCreated(await api<{ keyId: string; secret: string }>("/api/v1/admin/integrations", { body: { name } }));
          } catch (e) {
            toast(e instanceof ApiError ? e.message : "Błąd", "error");
          } finally {
            setBusy(false);
          }
        }}>Utwórz</Button>}
      >
        {created ? (
          <div className="space-y-3">
            <Alert tone="warning">Sekret jest wyświetlany tylko raz. Przekaż go dostawcy kasy bezpiecznym kanałem — w bazie przechowywany jest wyłącznie w postaci zaszyfrowanej.</Alert>
            <p className="text-xs text-muted">Key ID</p>
            <p className="break-all rounded-lg bg-forest-50 p-2 font-mono text-sm">{created.keyId}</p>
            <p className="text-xs text-muted">Sekret HMAC</p>
            <p className="break-all rounded-lg bg-forest-50 p-2 font-mono text-sm">{created.secret}</p>
          </div>
        ) : (
          <TextField label="Nazwa (np. Kasa 2 — sklep Ogrodowo)" value={name} onChange={(e) => setName(e.target.value)} />
        )}
      </Dialog>
    </>
  );
}
