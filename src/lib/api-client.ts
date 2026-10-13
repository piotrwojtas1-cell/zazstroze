/** Klient API dla komponentów przeglądarkowych — jednolita obsługa błędów serwera. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
  }
  fieldErrors(): Record<string, string> {
    const out: Record<string, string> = {};
    if (Array.isArray(this.details)) {
      for (const d of this.details as { path?: string; message?: string }[]) if (d.path && d.message && !out[d.path]) out[d.path] = d.message;
    }
    return out;
  }
}

export function newIdempotencyKey(): string {
  return crypto.randomUUID().replace(/-/g, "");
}

export async function api<T = unknown>(
  url: string,
  init: { method?: string; body?: unknown; idempotencyKey?: string; signal?: AbortSignal } = {},
): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (init.body !== undefined) headers["Content-Type"] = "application/json";
  if (init.idempotencyKey) headers["Idempotency-Key"] = init.idempotencyKey;
  let res: Response;
  try {
    res = await fetch(url, {
      method: init.method ?? (init.body !== undefined ? "POST" : "GET"),
      headers,
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      credentials: "same-origin",
      signal: init.signal,
    });
  } catch (e) {
    if ((e as Error).name === "AbortError") throw e;
    throw new ApiError(0, "NETWORK", "Brak połączenia z internetem. Sprawdź sieć i spróbuj ponownie.");
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const err = (data as { error?: { code?: string; message?: string; details?: unknown } } | null)?.error;
    throw new ApiError(res.status, err?.code ?? "UNKNOWN", err?.message ?? "Coś poszło nie tak. Spróbuj ponownie.", err?.details);
  }
  return data as T;
}
