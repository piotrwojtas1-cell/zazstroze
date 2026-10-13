import { apiRoute, readJson } from "@/server/http";
import { couponValidate } from "@/server/pos/service";
import { adapter, posAuth } from "../../_shared";

export const POST = apiRoute({ auth: posAuth }, async ({ req }) => couponValidate(adapter.parseCoupon(await readJson(req))));
