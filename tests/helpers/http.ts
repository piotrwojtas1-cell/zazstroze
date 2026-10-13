import { NextRequest } from "next/server";
import { createSession, SESSION_COOKIE } from "@/server/auth/session";
import { env } from "@/server/env";

type Handler = (req: NextRequest, ctx: { params: Promise<Record<string, string>> }) => Promise<Response>;

/** Wywołuje handler trasy API bezpośrednio (bez serwera HTTP) z opcjonalną sesją. */
export async function call(
  handler: Handler,
  opts: { method?: string; path?: string; body?: unknown; token?: string; params?: Record<string, string>; headers?: Record<string, string>; origin?: string | null } = {},
) {
  const url = new URL(opts.path ?? "/api/test", env().APP_URL);
  const headers = new Headers(opts.headers);
  if (opts.body !== undefined) headers.set("content-type", "application/json");
  if (opts.origin !== null) headers.set("origin", opts.origin ?? url.origin);
  if (opts.token) headers.set("cookie", `${SESSION_COOKIE}=${opts.token}`);
  const req = new NextRequest(url, { method: opts.method ?? (opts.body !== undefined ? "POST" : "GET"), headers, body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined });
  const res = await handler(req, { params: Promise.resolve(opts.params ?? {}) });
  const json = await res.json().catch(() => null);
  return { status: res.status, json: json as Record<string, any>, headers: res.headers }; // eslint-disable-line @typescript-eslint/no-explicit-any
}

export async function tokenFor(user: { id: string; kind: "CUSTOMER" | "STAFF" }) {
  return (await createSession(user, {})).token;
}
