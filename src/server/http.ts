import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { ZodError, type z } from "zod";
import { randomUUID } from "node:crypto";
import { AppError } from "./errors";
import { env } from "./env";
import { hashIp } from "./crypto";
import { getSessionUser, SESSION_COOKIE, type SessionUser } from "./auth/session";
import { requireCustomer, requirePermission, requireStaff, requireUser } from "./auth/guards";
import type { PermissionKey } from "./auth/permissions";
import { enforce, RULES } from "./rate-limit";

export type AuthMode = "public" | "user" | "customer" | "staff" | { permission: PermissionKey };

export interface RouteContext<B, Q> {
  req: NextRequest;
  user: SessionUser | null;
  body: B;
  query: Q;
  params: Record<string, string>;
  ip: string;
  ipHash: string;
}

const MAX_BODY_BYTES = 100_000;
const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function clientIp(req: Request): string {
  if (env().TRUST_PROXY === "true") {
    const xff = req.headers.get("x-forwarded-for");
    if (xff) return xff.split(",")[0]!.trim();
    const real = req.headers.get("x-real-ip");
    if (real) return real.trim();
  }
  return "local";
}

/** Ochrona CSRF dla API sesyjnego: żądania modyfikujące muszą pochodzić z naszego originu. */
export function assertSameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  const allowed = new Set([new URL(env().APP_URL).origin, new URL(req.url).origin]);
  if (origin) {
    if (!allowed.has(origin)) throw new AppError("FORBIDDEN", "Nieprawidłowe pochodzenie żądania.");
    return;
  }
  if (req.headers.get("sec-fetch-site") === "same-origin") return;
  throw new AppError("FORBIDDEN", "Brak nagłówka Origin w żądaniu modyfikującym.");
}

export function errorResponse(error: unknown): NextResponse {
  if (error instanceof AppError) {
    const headers: Record<string, string> = {};
    const retry = (error.details as { retryAfterSec?: number } | undefined)?.retryAfterSec;
    if (error.code === "RATE_LIMITED" && retry) headers["Retry-After"] = String(retry);
    return NextResponse.json(
      { error: { code: error.code, message: error.message, ...(error.details !== undefined ? { details: error.details } : {}) } },
      { status: error.status, headers },
    );
  }
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: error.issues[0]?.message ?? "Nieprawidłowe dane.",
          details: error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
        },
      },
      { status: 422 },
    );
  }
  const requestId = randomUUID();
  console.error(`[api] Nieobsłużony błąd ${requestId}`, error);
  return NextResponse.json(
    { error: { code: "INTERNAL_ERROR", message: "Wystąpił nieoczekiwany błąd. Spróbuj ponownie później.", requestId } },
    { status: 500 },
  );
}

export async function readJson(req: Request): Promise<unknown> {
  const text = await req.text();
  if (text.length > MAX_BODY_BYTES) throw new AppError("BAD_REQUEST", "Zbyt duże żądanie.");
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    throw new AppError("BAD_REQUEST", "Nieprawidłowy format JSON.");
  }
}

function authorize(user: SessionUser | null, mode: AuthMode): SessionUser | null {
  if (mode === "public") return user;
  if (mode === "user") return requireUser(user);
  if (mode === "customer") return requireCustomer(user);
  if (mode === "staff") return requireStaff(user);
  return requirePermission(user, mode.permission);
}

/**
 * Fabryka handlerów API: uwierzytelnienie, autoryzacja (na serwerze), CSRF, walidacja Zod,
 * limit żądań i jednolity format błędów.
 */
export function apiRoute<BS extends z.ZodTypeAny | undefined = undefined, QS extends z.ZodTypeAny | undefined = undefined>(
  opts: { auth: AuthMode; body?: BS; query?: QS; csrf?: boolean },
  handler: (
    ctx: RouteContext<BS extends z.ZodTypeAny ? z.infer<BS> : undefined, QS extends z.ZodTypeAny ? z.infer<QS> : undefined>,
  ) => Promise<unknown>,
) {
  return async (req: NextRequest, routeCtx: { params: Promise<Record<string, string>> }): Promise<Response> => {
    try {
      if (MUTATING.has(req.method) && opts.csrf !== false) assertSameOrigin(req);
      const sessionUser = await getSessionUser(req.cookies.get(SESSION_COOKIE)?.value);
      const user = authorize(sessionUser, opts.auth);
      const ip = clientIp(req);
      const ipHash = hashIp(ip);
      if (user) await enforce(RULES.apiUser, user.id);

      const body = opts.body ? opts.body.parse(await readJson(req)) : undefined;
      const query = opts.query ? opts.query.parse(Object.fromEntries(req.nextUrl.searchParams)) : undefined;
      const params = (await routeCtx?.params) ?? {};

      const result = await handler({ req, user, body, query, params, ip, ipHash } as RouteContext<
        BS extends z.ZodTypeAny ? z.infer<BS> : undefined,
        QS extends z.ZodTypeAny ? z.infer<QS> : undefined
      >);
      if (result instanceof Response) return result;
      return NextResponse.json(result ?? { ok: true }, { headers: { "Cache-Control": "no-store" } });
    } catch (error) {
      return errorResponse(error);
    }
  };
}

/** Klucz idempotencji z nagłówka (wymagany przez operacje typu „wymień punkty”). */
export function idempotencyKey(req: Request): string {
  const key = req.headers.get("idempotency-key")?.trim();
  if (!key || !/^[A-Za-z0-9_-]{8,100}$/.test(key)) {
    throw new AppError("BAD_REQUEST", "Brak lub nieprawidłowy nagłówek Idempotency-Key.");
  }
  return key;
}
