import { apiFetch } from "../../../shared/api/client";
import type { ChatTurn } from "../model/types";

export type ChatRequest = {
  agentId: string;
  message: string;
  instructions: string;
  history: ChatTurn[];
  images?: Array<{ dataUrl: string }>;
};

function jsonAuthHeaders(token: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function sendChat(apiUrl: string, token: string, body: ChatRequest) {
  const response = await apiFetch(`${apiUrl}/api/ai/chat`, {
    method: "POST",
    headers: jsonAuthHeaders(token),
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return (await response.json()) as { content: string };
}

export async function translateToKorean(apiUrl: string, token: string, text: string) {
  const response = await apiFetch(`${apiUrl}/api/ai/translate-to-korean`, {
    method: "POST",
    headers: jsonAuthHeaders(token),
    body: JSON.stringify({ text }),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return (await response.json()) as { text: string };
}

export async function streamChat(
  apiUrl: string,
  token: string,
  body: ChatRequest,
  onChunk: (chunk: string) => void
) {
  const response = await apiFetch(`${apiUrl}/api/ai/chat/stream`, {
    method: "POST",
    headers: jsonAuthHeaders(token),
    body: JSON.stringify(body),
  });
  if (!response.ok || !response.body) throw new Error(`HTTP ${response.status}`);

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let responseText = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split("\n\n");
    buffer = events.pop() ?? "";
    for (const rawEvent of events) {
      const data = rawEvent
        .split("\n")
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5))
        .join("\n");
      if (!data) continue;
      responseText += data;
      onChunk(data);
    }
  }

  return responseText;
}

export async function transcribeAudio(apiUrl: string, token: string, audio: Blob, language?: string, timeoutMs = 20_000) {
  const ext = audio.type.includes("ogg")
    ? "ogg"
    : audio.type.includes("mp4")
      ? "mp4"
      : audio.type.includes("mpeg")
        ? "mp3"
        : "webm";
  const form = new FormData();
  form.append("file", audio, `audio.${ext}`);
  if (language?.trim()) form.append("language", language.trim());

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await apiFetch(`${apiUrl}/api/ai/transcribe`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return (await response.json()) as { text: string };
  } finally {
    window.clearTimeout(timeout);
  }
}
