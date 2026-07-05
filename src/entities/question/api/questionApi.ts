import { apiFetch } from "../../../shared/api/client";
import type {
  CategoryRecord,
  EmbeddingBatchResult,
  EmbeddingStatusResponse,
  PageResponse,
  QuestionDifficulty,
  QuestionResponse,
} from "../model/types";

function authHeaders(token: string): HeadersInit | undefined {
  return token ? { Authorization: `Bearer ${token}` } : undefined;
}

export async function fetchQuestionBank(apiUrl: string, token: string) {
  const headers = authHeaders(token);
  const [categories, embeddingStatus] = await Promise.all([
    apiFetch(`${apiUrl}/api/question-categories`, { headers }).then(async (response) => {
      if (!response.ok) throw new Error(`categories HTTP ${response.status}`);
      return (await response.json()) as CategoryRecord[];
    }),
    apiFetch(`${apiUrl}/api/questions/embedding-status`, { headers }).then(async (response) => {
      if (!response.ok) throw new Error(`embedding HTTP ${response.status}`);
      return (await response.json()) as EmbeddingStatusResponse;
    }),
  ]);

  return { categories, embeddingStatus };
}

export async function fetchQuestionsByCategory({
  apiUrl,
  token,
  categoryId,
  subjectId,
  difficulty,
  keyword,
}: {
  apiUrl: string;
  token: string;
  categoryId: number;
  subjectId: number;
  difficulty: QuestionDifficulty | "";
  keyword: string;
}) {
  const headers = authHeaders(token);
  const params = new URLSearchParams({
    categoryId: String(categoryId),
    size: "100",
    sort: "createdAt,desc",
  });
  if (difficulty) params.set("difficulty", difficulty);
  if (keyword.trim()) params.set("keyword", keyword.trim());

  const [questions, embeddingStatus] = await Promise.all([
    apiFetch(`${apiUrl}/api/questions?${params.toString()}`, { headers }).then(async (response) => {
      if (!response.ok) throw new Error(`questions HTTP ${response.status}`);
      const data = (await response.json()) as PageResponse<QuestionResponse> | QuestionResponse[];
      return Array.isArray(data) ? data : data.content;
    }),
    apiFetch(`${apiUrl}/api/questions/embedding-status?categoryId=${subjectId}`, { headers }).then(async (response) => {
      if (!response.ok) throw new Error(`embedding HTTP ${response.status}`);
      return (await response.json()) as EmbeddingStatusResponse;
    }),
  ]);

  return { questions, embeddingStatus };
}

export async function requestQuestionEmbedding(apiUrl: string, token: string, questionId: string) {
  const response = await apiFetch(`${apiUrl}/api/questions/${questionId}/embed`, {
    method: "POST",
    headers: authHeaders(token),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
}

export async function requestPendingQuestionEmbeddings(apiUrl: string, token: string, categoryId: number) {
  const response = await apiFetch(
    `${apiUrl}/api/questions/embed-pending?categoryId=${categoryId}&limit=50`,
    { method: "POST", headers: authHeaders(token) }
  );
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return (await response.json()) as EmbeddingBatchResult;
}

export async function removeQuestion(apiUrl: string, token: string, questionId: string) {
  const response = await apiFetch(`${apiUrl}/api/questions/${questionId}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
}
