import { apiRoute } from "@/server/http";
import { setFavorite } from "@/server/services/shopping";

export const PUT = apiRoute({ auth: "customer" }, async ({ user, params }) => {
  await setFavorite(user!.id, params.productId!, true);
  return { favorite: true };
});

export const DELETE = apiRoute({ auth: "customer" }, async ({ user, params }) => {
  await setFavorite(user!.id, params.productId!, false);
  return { favorite: false };
});
