export type AssetFeature = {
  type: "Feature";
  id: string;
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: {
    assetCode: string;
    name: string;
    status: string;
    criticality: string;
    categoryId?: string;
    departmentId?: string;
  };
};

export type AssetCollection = {
  type: "FeatureCollection";
  features: AssetFeature[];
  meta?: { count?: number; limit?: number; truncated?: boolean };
};

export type Session = {
  accessToken: string;
  user: { id?: string; name: string; email: string };
  organization: { id?: string; name: string; slug?: string };
  membership: { id?: string; role: string };
};

const API_BASE = "/api/v1";

async function request<T>(path: string, init: RequestInit = {}, token?: string): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    credentials: "include"
  });
  const payload = await response.json().catch(() => null) as {
    success?: boolean;
    data?: T;
    error?: { message?: string };
  } | null;
  if (!response.ok || !payload?.success) {
    throw new Error(payload?.error?.message || `Request failed (${response.status})`);
  }
  return payload.data as T;
}

export const authApi = {
  login: (email: string, password: string, organizationSlug: string) =>
    request<Session>("/auth/login", { method: "POST", body: JSON.stringify({ email, password, organizationSlug }) }),
  register: (input: { name: string; email: string; password: string; organizationName: string; organizationSlug: string }) =>
    request<Session>("/auth/register", { method: "POST", body: JSON.stringify(input) }),
  refresh: () => request<Session>("/auth/refresh", { method: "POST" }),
  logout: () => request<{ message: string }>("/auth/logout", { method: "POST" })
};

export const assetsApi = {
  map: (token: string, filters: { status?: string; criticality?: string }, bbox: string, signal?: AbortSignal) => {
    const query = new URLSearchParams({ bbox, limit: "500" });
    if (filters.status) query.set("status", filters.status);
    if (filters.criticality) query.set("criticality", filters.criticality);
    return request<AssetCollection>(`/assets/map?${query.toString()}`, { signal }, token);
  }
};
