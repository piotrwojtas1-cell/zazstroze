"use client";

import { useState } from "react";
import { api, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";

export function NotifyCampaignButton({ id }: { id: string }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>Wyślij</Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Wysłać powiadomienie?"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>Anuluj</Button>
            <Button
              loading={loading}
              onClick={async () => {
                setLoading(true);
                try {
                  const r = await api<{ recipients: number }>(`/api/v1/admin/campaigns/${id}/notify`, { method: "POST" });
                  toast(`Wysłano do ${r.recipients} klientów (tylko ze zgodą marketingową).`);
                  setOpen(false);
                } catch (e) {
                  toast(e instanceof ApiError ? e.message : "Błąd", "error");
                } finally {
                  setLoading(false);
                }
              }}
            >
              Wyślij
            </Button>
          </>
        }
      >
        Powiadomienie marketingowe trafi wyłącznie do klientów, którzy wyrazili zgodę na oferty w aplikacji. Operacja zostanie zapisana w dzienniku audytu.
      </Dialog>
    </>
  );
}
