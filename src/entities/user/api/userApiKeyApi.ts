import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import { apiFetch } from "../../../shared/api/client";

export type OpenAiApiKeyResponse = {
  configured: boolean;
  maskedKey: string;
};

export type OpenAiApiKeyValidationResponse = {
  valid: boolean;
  message: string;
};

function authHeaders(token: string): HeadersInit {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function jsonAuthHeaders(token: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    ...authHeaders(token),
  };
}

async function readError(response: Response, fallback: string) {
  try {
    const data = (await response.json()) as { message?: string; fieldErrors?: Record<string, string> };
    const fieldMessage = data.fieldErrors ? Object.values(data.fieldErrors)[0] : "";
    return fieldMessage || data.message || fallback;
  } catch {
    return fallback;
  }
}

export async function getOpenAiApiKey(apiUrl: string, token: string) {
  const response = await apiFetch(`${apiUrl}/api/users/me/api-key/openai`, {
    headers: authHeaders(token),
  });
  if (!response.ok) throw new Error(await readError(response, `API 키 조회 실패 (HTTP ${response.status})`));
  return (await response.json()) as OpenAiApiKeyResponse;
}

export async function saveOpenAiApiKey(apiUrl: string, token: string, apiKey: string) {
  const response = await apiFetch(`${apiUrl}/api/users/me/api-key/openai`, {
    method: "PUT",
    headers: jsonAuthHeaders(token),
    body: JSON.stringify({ apiKey }),
  });
  if (!response.ok) throw new Error(await readError(response, `API 키 저장 실패 (HTTP ${response.status})`));
  return (await response.json()) as OpenAiApiKeyResponse;
}

export async function deleteOpenAiApiKey(apiUrl: string, token: string) {
  const response = await apiFetch(`${apiUrl}/api/users/me/api-key/openai`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
  if (!response.ok) throw new Error(await readError(response, `API 키 삭제 실패 (HTTP ${response.status})`));
}

export async function validateOpenAiApiKey(apiUrl: string, token: string) {
  const response = await apiFetch(`${apiUrl}/api/users/me/api-key/openai/validate`, {
    method: "POST",
    headers: authHeaders(token),
  });
  if (!response.ok) throw new Error(await readError(response, `API 키 확인 실패 (HTTP ${response.status})`));
  return (await response.json()) as OpenAiApiKeyValidationResponse;
}

export async function validateOpenAiApiKeyDraft(apiKey: string) {
  const key = apiKey.trim();
  if (!key) return { valid: false, message: "API 키를 입력해주세요." };

  try {
    const response = await tauriFetch("https://api.openai.com/v1/models", {
      headers: {
        Authorization: `Bearer ${key}`,
      },
    });

    if (response.ok) return { valid: true, message: "유효한 키입니다. 저장을 눌러 보관하세요." };
    if (response.status === 401) return { valid: false, message: "키가 거부되었습니다. (인증 실패)" };
    return { valid: false, message: `OpenAI 확인 실패 (HTTP ${response.status})` };
  } catch {
    return { valid: false, message: "OpenAI 확인 요청에 실패했습니다." };
  }
}
