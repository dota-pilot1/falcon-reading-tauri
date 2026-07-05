import { apiFetch } from "../../../shared/api/client";
import type { Agent } from "../model/types";

function authHeaders(token: string): HeadersInit | undefined {
  return token ? { Authorization: `Bearer ${token}` } : undefined;
}

export async function fetchAgents(apiUrl: string, token: string) {
  const response = await apiFetch(`${apiUrl}/api/agents`, {
    headers: authHeaders(token),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return (await response.json()) as Agent[];
}
