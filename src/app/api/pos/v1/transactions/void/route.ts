import { posRoute } from "@/server/pos/http";
import { saleVoid } from "@/server/pos/service";

export const POST = posRoute("transactions.void", ({ integration, adapter, body }) => saleVoid(integration.id, adapter.parseVoid(body)));
