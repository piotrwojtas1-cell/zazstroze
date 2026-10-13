import { posRoute } from "@/server/pos/http";
import { sale } from "@/server/pos/service";

/** Zakończona sprzedaż — naliczenie punktów (dokładnie raz dla danego externalId). */
export const POST = posRoute("transactions.create", ({ integration, adapter, body }) => sale(integration.id, adapter.parseSale(body)));
