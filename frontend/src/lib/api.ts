const API_BASE = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
).replace(/\/+$/, "");

let csrfToken: string | null = null;

async function readCsrfToken() {
  if (csrfToken) return csrfToken;

  const response = await fetch(`${API_BASE}/api/auth/csrf/`, {
    credentials: "include",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("No se pudo iniciar la protección de la sesión.");
  }

  const data: { csrfToken?: string } = await response.json();
  if (!data.csrfToken) {
    throw new Error("El servidor no devolvió el token CSRF.");
  }

  csrfToken = data.csrfToken;
  return csrfToken;
}

async function refreshSession() {
  try {
    const token = await readCsrfToken();
    const response = await fetch(`${API_BASE}/api/auth/refresh/`, {
      method: "POST",
      credentials: "include",
      cache: "no-store",
      headers: { "X-CSRFToken": token },
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function apiFetch(
  path: string,
  init: RequestInit = {},
  refreshOnUnauthorized = true,
): Promise<Response> {
  const method = (init.method || "GET").toUpperCase();
  const headers = new Headers(init.headers);
  const unsafeMethod = !["GET", "HEAD", "OPTIONS", "TRACE"].includes(method);

  if (unsafeMethod) {
    headers.set("X-CSRFToken", await readCsrfToken());
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    method,
    headers,
    credentials: "include",
    cache: init.cache || "no-store",
  });

  const isAuthEndpoint = path.startsWith("/api/auth/");
  if (
    response.status === 401 &&
    refreshOnUnauthorized &&
    !isAuthEndpoint &&
    (await refreshSession())
  ) {
    return apiFetch(path, init, false);
  }

  return response;
}
