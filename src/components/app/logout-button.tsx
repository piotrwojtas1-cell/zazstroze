"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";

export function LogoutButton({ className, variant = "outline" }: { className?: string; variant?: "outline" | "ghost" }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  return (
    <Button
      variant={variant}
      block
      className={className}
      loading={loading}
      onClick={async () => {
        setLoading(true);
        await api("/api/v1/auth/logout", { method: "POST" }).catch(() => undefined);
        router.replace("/logowanie");
        router.refresh();
      }}
    >
      <LogOut className="size-4" aria-hidden /> Wyloguj się
    </Button>
  );
}
