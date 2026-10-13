import { apiRoute } from "@/server/http";
import { getCardForUser } from "@/server/services/customer";
import { createCardQrPayload } from "@/server/pos/card-qr";
import { qrSvg } from "@/server/pos/qr-image";

/** Świeży, podpisany kod QR karty (odświeżany przez aplikację co 30 s). */
export const GET = apiRoute({ auth: "customer" }, async ({ user }) => {
  const card = await getCardForUser(user!.id);
  const { payload, expiresInSec } = createCardQrPayload(card.number);
  return { payload, expiresInSec, svg: await qrSvg(payload), status: card.status };
});
