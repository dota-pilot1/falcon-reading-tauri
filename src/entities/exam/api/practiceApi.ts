import { apiFetch } from "../../../shared/api/client";
import type {
  AttemptResultResponse,
  AttemptSummaryResponse,
  ExamResponse,
  ExamTakeResponse,
} from "../model/types";

function authHeaders(token: string): HeadersInit {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function jsonAuthHeaders(token: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    ...authHeaders(token),
  };
}

export async function fetchPracticeDashboard(apiUrl: string, token: string) {
  const headers = authHeaders(token);
  const [exams, attempts] = await Promise.all([
    apiFetch(`${apiUrl}/api/practice/exams`, { headers }).then(async (response) => {
      if (!response.ok) throw new Error(`published exams HTTP ${response.status}`);
      return (await response.json()) as ExamResponse[];
    }),
    apiFetch(`${apiUrl}/api/attempts/me`, { headers }).then(async (response) => {
      if (!response.ok) throw new Error(`attempts HTTP ${response.status}`);
      return (await response.json()) as AttemptSummaryResponse[];
    }),
  ]);

  return { exams, attempts };
}

export async function startExamAttempt(apiUrl: string, token: string, examId: string) {
  const response = await apiFetch(`${apiUrl}/api/attempts/start/${examId}`, {
    method: "POST",
    headers: jsonAuthHeaders(token),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return (await response.json()) as ExamTakeResponse;
}

export async function fetchAttemptResult(apiUrl: string, token: string, attemptId: string) {
  const response = await apiFetch(`${apiUrl}/api/attempts/${attemptId}/result`, {
    headers: authHeaders(token),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return (await response.json()) as AttemptResultResponse;
}

export async function submitAttemptAnswers(
  apiUrl: string,
  token: string,
  attemptId: string,
  answers: Array<{ questionId: string; answer: string }>
) {
  const response = await apiFetch(`${apiUrl}/api/attempts/${attemptId}/submit`, {
    method: "POST",
    headers: jsonAuthHeaders(token),
    body: JSON.stringify({ answers }),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return (await response.json()) as AttemptResultResponse;
}
