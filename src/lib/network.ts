/**
 * Network error helpers — used to identify retryable network errors
 * (ERR_NETWORK_CHANGED, Failed to fetch, etc.) without retrying on
 * applicative HTTP errors (4xx/5xx).
 */

export function isNetworkError(err: unknown): boolean {
  if (!err) return false;

  const e = err as { status?: unknown; name?: unknown; message?: unknown };

  // Never retry on HTTP errors (4xx/5xx applicative)
  if (typeof e.status === "number" && e.status >= 400) return false;

  // Supabase functions network error class (check by name to avoid import coupling)
  if (e.name === "FunctionsFetchError") return true;

  const msg = String(e.message ?? err).toLowerCase();
  if (msg.includes("failed to fetch")) return true;
  if (msg.includes("networkerror")) return true;
  if (msg.includes("network changed")) return true;
  if (msg.includes("err_network")) return true;

  return false;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface RetryOptions {
  delays?: number[];
  onRetry?: (attempt: number, reason: string) => void;
}

/**
 * Wraps an async function with automatic retries on network errors only.
 * Default: 2 retries (3 total attempts) with 500ms then 2000ms delays.
 * The callback receives the attempt index (0-based) so callers can generate
 * fresh resources (e.g. UUIDs) per attempt.
 */
export async function retryOnNetworkError<T>(
  fn: (attempt: number) => Promise<T>,
  opts: RetryOptions = {}
): Promise<T> {
  const delays = opts.delays ?? [500, 2000];
  const maxAttempts = delays.length + 1;

  let lastErr: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn(attempt);
    } catch (err) {
      lastErr = err;
      const isLast = attempt === maxAttempts - 1;
      if (isLast || !isNetworkError(err)) throw err;
      const reason = String((err as { message?: unknown })?.message ?? err).slice(0, 120);
      opts.onRetry?.(attempt + 1, reason);
      await sleep(delays[attempt]);
    }
  }
  throw lastErr;
}
