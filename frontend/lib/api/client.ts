const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function apiRequest(
  endpoint: string,
  options: RequestInit = {},
  accessToken?: string
): Promise<Response> {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  };

  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  return res;
}
