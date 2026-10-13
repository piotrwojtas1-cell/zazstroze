import { posRoute } from "@/server/pos/http";
import { identify } from "@/server/pos/service";

/** Identyfikacja klienta po zeskanowaniu kodu QR lub wpisaniu numeru karty. */
export const POST = posRoute("identify", ({ adapter, body }) => identify(adapter.parseIdentify(body).code));
