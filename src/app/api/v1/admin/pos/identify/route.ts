import { apiRoute, readJson } from "@/server/http";
import { identify } from "@/server/pos/service";
import { adapter, posAuth } from "../_shared";

export const POST = apiRoute({ auth: posAuth }, async ({ req }) => identify(adapter.parseIdentify(await readJson(req)).code));
