// One polite request: bounded retries with growing waits, and a timeout.
const RETRIES = 3;
const TIMEOUT_MS = 30_000;

/** Fetches a URL, retrying network errors and 5xx/429 answers. Other statuses are returned. */
export async function fetchRetry(
  url: string | URL,
  init: RequestInit = {},
): Promise<Response> {
  for (let attempt = 1; ; attempt++) {
    try {
      const response = await fetch(url, {
        ...init,
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (response.status >= 500 || response.status === 429)
        throw new Error(`HTTP ${response.status}`);
      return response;
    } catch (error) {
      if (attempt === RETRIES) throw error;
      await Bun.sleep(2000 * attempt);
    }
  }
}
