import { posRoute } from "@/server/pos/http";
import { saleReturn } from "@/server/pos/service";

export const POST = posRoute("returns.create", ({ integration, adapter, body }) => saleReturn(integration.id, adapter.parseReturn(body)));
