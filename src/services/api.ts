// Small fetch wrapper for the local API server (see server/index.js).
// In dev, Vite proxies /api to the local server; in Docker the same Node
// process serves both the API and the built frontend.

export const apiFetch = async <T>(
  path: string,
  options?: RequestInit
): Promise<T> => {
  const response = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const body = await response.json();
      if (body.error) message = body.error;
    } catch {
      // keep default message
    }
    throw new Error(message);
  }

  return response.json();
};
