import { apiFetch } from "../../../shared/api/client";

export type CharacterDetail = {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  level?: string;
  sessionGoal?: string;
  skills?: string[];
  starterPrompts?: string[];
  style?: string;
  scenario?: string;
  character?: string;
  knowledge?: string;
  news?: string;
  schedule?: string;
};

export type CharacterUpsertBody = {
  title: string;
  subtitle?: string;
  description?: string;
  level?: string;
  sessionGoal?: string;
  skills: string[];
  starterPrompts: string[];
  style?: string;
  scenario?: string;
  character?: string;
  knowledge?: string;
  news?: string;
  schedule?: string;
};

function jsonAuthHeaders(token: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function fetchCharacter(apiUrl: string, token: string, id: string) {
  const response = await apiFetch(`${apiUrl}/api/characters/${id}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return (await response.json()) as CharacterDetail;
}

export async function updateCharacter(apiUrl: string, token: string, id: string, body: CharacterUpsertBody) {
  const response = await apiFetch(`${apiUrl}/api/characters/${id}`, {
    method: "PUT",
    headers: jsonAuthHeaders(token),
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return (await response.json()) as CharacterDetail;
}
