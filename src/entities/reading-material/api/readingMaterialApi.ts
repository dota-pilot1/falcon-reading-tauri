import { apiFetch } from "../../../shared/api/client";
import type {
  ReadingFolder,
  ReadingFolderCreateRequest,
  ReadingFolderRenameRequest,
  ReadingFolderReorderRequest,
  ReadingMaterial,
  ReadingMaterialStatus,
  ReadingMaterialUpsertRequest,
  ReadingSourceType,
  ReadingTreeResponse,
} from "../model/types";

type ListParams = {
  folderId?: number;
  date?: string;
  sourceType?: ReadingSourceType;
  status?: ReadingMaterialStatus;
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

async function parseError(response: Response) {
  try {
    const body = (await response.json()) as { message?: string; code?: string };
    return body.message || body.code || `HTTP ${response.status}`;
  } catch {
    return `HTTP ${response.status}`;
  }
}

function buildQuery(params: ListParams) {
  const query = new URLSearchParams();
  if (params.folderId !== undefined) query.set("folderId", String(params.folderId));
  if (params.date) query.set("date", params.date);
  if (params.sourceType) query.set("sourceType", params.sourceType);
  if (params.status) query.set("status", params.status);
  const value = query.toString();
  return value ? `?${value}` : "";
}

export async function fetchReadingTree(apiUrl: string, token: string) {
  const response = await apiFetch(`${apiUrl}/api/reading-materials/tree`, {
    headers: authHeaders(token),
  });
  if (!response.ok) throw new Error(await parseError(response));
  return (await response.json()) as ReadingTreeResponse;
}

export async function fetchReadingMaterials(apiUrl: string, token: string, params: ListParams = {}) {
  const response = await apiFetch(`${apiUrl}/api/reading-materials${buildQuery(params)}`, {
    headers: authHeaders(token),
  });
  if (!response.ok) throw new Error(await parseError(response));
  return (await response.json()) as ReadingMaterial[];
}

export async function createReadingMaterial(apiUrl: string, token: string, body: ReadingMaterialUpsertRequest) {
  const response = await apiFetch(`${apiUrl}/api/reading-materials`, {
    method: "POST",
    headers: jsonAuthHeaders(token),
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(await parseError(response));
  return (await response.json()) as ReadingMaterial;
}

export async function updateReadingMaterial(apiUrl: string, token: string, id: string, body: ReadingMaterialUpsertRequest) {
  const response = await apiFetch(`${apiUrl}/api/reading-materials/${id}`, {
    method: "PUT",
    headers: jsonAuthHeaders(token),
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(await parseError(response));
  return (await response.json()) as ReadingMaterial;
}

export async function fetchReadingFolders(apiUrl: string, token: string) {
  const response = await apiFetch(`${apiUrl}/api/reading-folders`, {
    headers: authHeaders(token),
  });
  if (!response.ok) throw new Error(await parseError(response));
  return (await response.json()) as ReadingFolder[];
}

export async function createReadingFolder(apiUrl: string, token: string, body: ReadingFolderCreateRequest) {
  const response = await apiFetch(`${apiUrl}/api/reading-folders`, {
    method: "POST",
    headers: jsonAuthHeaders(token),
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(await parseError(response));
  return (await response.json()) as ReadingFolder;
}

export async function renameReadingFolder(apiUrl: string, token: string, id: number, body: ReadingFolderRenameRequest) {
  const response = await apiFetch(`${apiUrl}/api/reading-folders/${id}`, {
    method: "PUT",
    headers: jsonAuthHeaders(token),
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(await parseError(response));
  return (await response.json()) as ReadingFolder;
}

export async function reorderReadingFolders(apiUrl: string, token: string, body: ReadingFolderReorderRequest) {
  const response = await apiFetch(`${apiUrl}/api/reading-folders/reorder`, {
    method: "PUT",
    headers: jsonAuthHeaders(token),
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(await parseError(response));
  return (await response.json()) as ReadingFolder[];
}

export async function deleteReadingFolder(apiUrl: string, token: string, id: number) {
  const response = await apiFetch(`${apiUrl}/api/reading-folders/${id}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
  if (!response.ok) throw new Error(await parseError(response));
}
