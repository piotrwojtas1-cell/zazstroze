/** Katalog uprawnień i domyślne role (zasada minimalnych uprawnień). Źródło prawdy dla seeda. */
export const PERMISSIONS = {
  "dashboard.view": "Podgląd pulpitu i wskaźników",
  "customers.view": "Wyszukiwanie i podgląd klientów",
  "customers.manage": "Blokowanie kart, obsługa wniosków o dane",
  "points.adjust": "Ręczne korekty punktów (do limitu z konfiguracji)",
  "points.adjust.large": "Korekty punktów powyżej limitu",
  "coupons.manage": "Anulowanie kuponów klientów",
  "rewards.manage": "Zarządzanie katalogiem nagród",
  "campaigns.manage": "Zarządzanie kampaniami i ofertami",
  "content.manage": "Zarządzanie poradami i kalendarzem",
  "config.manage": "Konfiguracja reguł punktowych i poziomów",
  "transactions.view": "Podgląd transakcji i zwrotów",
  "complaints.manage": "Obsługa reklamacji",
  "reports.view": "Raporty programu",
  "pos.operate": "Obsługa kasy demonstracyjnej (sprzedaż, zwrot, anulowanie)",
  "integrations.manage": "Zarządzanie integracjami POS",
  "roles.manage": "Zarządzanie pracownikami, rolami i uprawnieniami",
  "audit.view": "Podgląd dziennika audytowego",
} as const;

export type PermissionKey = keyof typeof PERMISSIONS;

export const DEFAULT_ROLES: Record<string, { name: string; description: string; permissions: PermissionKey[] }> = {
  ADMIN: {
    name: "Administrator",
    description: "Pełny dostęp, w tym konfiguracja programu, integracje i uprawnienia.",
    permissions: Object.keys(PERMISSIONS) as PermissionKey[],
  },
  MANAGER: {
    name: "Kierownik",
    description: "Zarządzanie ofertą, treściami, korektami i raportami. Bez konfiguracji systemu.",
    permissions: [
      "dashboard.view", "customers.view", "customers.manage", "points.adjust", "coupons.manage",
      "rewards.manage", "campaigns.manage", "content.manage", "transactions.view",
      "complaints.manage", "reports.view", "pos.operate", "audit.view",
    ],
  },
  STAFF: {
    name: "Pracownik obsługi",
    description: "Obsługa klienta przy kasie i reklamacje. Bez korekt punktów i zmian oferty.",
    permissions: ["dashboard.view", "customers.view", "transactions.view", "complaints.manage", "pos.operate"],
  },
};
