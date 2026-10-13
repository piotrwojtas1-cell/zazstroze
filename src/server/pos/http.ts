import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import type { PosIntegration, Prisma } from "@prisma/client";
import { prisma, isUniqueViolation } from "../db";
import { AppError } from "../errors";
import { decryptSecret, sha256 } from "../crypto";
import { errorResponse } from "../http";
import { enforce, RULES } from "../rate-limit";
import { SIGNATURE_HEADERS, verifySignature } from "./signature";
import { getAdapter } from "./integrations";
import type { PosAdapter } from "./adapter";

const MAX_BODY = 256_000;

/**
 * Handler API POS:
 *  1. uwierzytelnienie integracji (X-ZZ-Key-Id) i weryfikacja podpisu HMAC z ochroną przed powtórzeniem (znacznik czasu),
 *  2. limit żądań na integrację,
 *  3. idempotencja (Idempotency-Key): ponowienie zwraca zapamiętaną odpowiedź; ten sam klucz z innym ciałem → 422,
 *  4. dziennik żądań (monitoring błędów w panelu → Integracje).
 */
export function posRoute(endpoint: string, handler: (args: { integration: PosIntegration; adapter: PosAdapter; body: unknown }) => Promise<unknown>) {
  return async (req: NextRequest): Promise<Response> => {
    const started = Date.now();
    let integration: PosIntegration | null = null;
    try {
      const raw = await req.text();
      if (raw.length > MAX_BODY) throw new AppError("BAD_REQUEST", "Zbyt duże żądanie.");
      const keyId = req.headers.get(SIGNATURE_HEADERS.keyId);
      integration = keyId ? await prisma.posIntegration.findUnique({ where: { keyId } }) : null;
      if (!integration || !integration.active || integration.adapter === "INTERNAL") {
        throw new AppError("INVALID_SIGNATURE", "Nieznana lub nieaktywna integracja.");
      }
      const verdict = verifySignature({
        secret: decryptSecret(integration.secretEncrypted),
        timestamp: req.headers.get(SIGNATURE_HEADERS.timestamp),
        signature: req.headers.get(SIGNATURE_HEADERS.signature),
        method: req.method,
        path: req.nextUrl.pathname,
        body: raw,
      });
      if (!verdict.ok) {
        throw new AppError("INVALID_SIGNATURE", verdict.reason === "STALE" ? "Znacznik czasu żądania jest nieaktualny." : "Nieprawidłowy podpis żądania.");
      }
      await enforce(RULES.posIntegration, integration.id);

      const idemKey = req.headers.get(SIGNATURE_HEADERS.idempotency)?.trim();
      if (!idemKey || !/^[A-Za-z0-9._:-]{8,128}$/.test(idemKey)) throw new AppError("BAD_REQUEST", "Wymagany nagłówek Idempotency-Key (8–128 znaków).");
      const requestHash = sha256(`${endpoint}\n${raw}`);
      const previous = await prisma.posRequestLog.findUnique({
        where: { integrationId_idempotencyKey: { integrationId: integration.id, idempotencyKey: idemKey } },
      });
      if (previous) {
        if (previous.requestHash !== requestHash) throw new AppError("IDEMPOTENCY_KEY_REUSED", "Klucz idempotencji użyty dla innego żądania.");
        return NextResponse.json(previous.responseBody, { status: previous.status, headers: { "Idempotent-Replayed": "true" } });
      }

      let body: unknown;
      try {
        body = raw ? JSON.parse(raw) : {};
      } catch {
        throw new AppError("BAD_REQUEST", "Nieprawidłowy format JSON.");
      }

      let response: NextResponse;
      try {
        const result = await handler({ integration, adapter: getAdapter(integration.adapter), body });
        response = NextResponse.json(result, { status: 200 });
      } catch (error) {
        response = errorResponse(error);
      }
      const responseBody = (await response.clone().json()) as Prisma.InputJsonValue;
      // Zapamiętujemy odpowiedzi deterministyczne (< 500). Błędy serwera można ponowić tym samym kluczem.
      if (response.status < 500) {
        await prisma.posRequestLog
          .create({
            data: {
              integrationId: integration.id,
              idempotencyKey: idemKey,
              endpoint,
              requestHash,
              status: response.status,
              responseBody,
              errorCode: response.status >= 400 ? ((responseBody as { error?: { code?: string } }).error?.code ?? null) : null,
              durationMs: Date.now() - started,
            },
          })
          .catch((e) => {
            if (!isUniqueViolation(e)) throw e;
          });
      } else {
        console.error(`[pos] ${endpoint} błąd ${response.status}`, responseBody);
      }
      await prisma.posIntegration.update({ where: { id: integration.id }, data: { lastUsedAt: new Date() } });
      return response;
    } catch (error) {
      if (!(error instanceof AppError) || error.code === "INVALID_SIGNATURE") {
        console.warn(`[pos] odrzucone żądanie ${endpoint}: ${error instanceof Error ? error.message : String(error)}`);
      }
      return errorResponse(error);
    }
  };
}
