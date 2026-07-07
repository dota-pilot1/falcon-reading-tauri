import { fetch as tauriFetch } from "@tauri-apps/plugin-http";

export const defaultApiUrl =
  import.meta.env.VITE_API_URL ??
  (import.meta.env.DEV ? "http://localhost:3301" : "https://dxline-tallent.com");

export const unauthorizedEventName = "auth:unauthorized";

function shouldEmitUnauthorized(input: string) {
  return !/\/api\/auth\/(?:login|signup|check-email)\b/.test(input);
}

export async function apiFetch(input: string, init?: RequestInit) {
  const response = await tauriFetch(input, init);
  if (response.status === 401 && shouldEmitUnauthorized(input)) {
    window.dispatchEvent(new CustomEvent(unauthorizedEventName));
  }
  return response;
}
