import { apiFetch } from "../../../shared/api/client";
import type { ExamResponse } from "../model/types";

type ExamCreateRequest = {
  title: string;
  description?: string;
  timeLimitMinutes?: number | null;
  subjectId?: number | null;
  examCategoryId?: number | null;
  items: Array<{ questionId: string; points: number }>;
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

async function parseExamResponse(response: Response) {
  if (!response.ok) {
    let message = `HTTP ${response.status}`;
    try {
      const data = (await response.json()) as { message?: string };
      if (data.message) message = data.message;
    } catch {
      // ignore invalid error body
    }
    throw new Error(message);
  }
  return (await response.json()) as ExamResponse;
}

export async function fetchManagedExams(apiUrl: string, token: string) {
  const response = await apiFetch(`${apiUrl}/api/exams`, {
    headers: authHeaders(token),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return (await response.json()) as ExamResponse[];
}

export async function fetchManagedExam(apiUrl: string, token: string, examId: string) {
  const response = await apiFetch(`${apiUrl}/api/exams/${examId}`, {
    headers: authHeaders(token),
  });
  return parseExamResponse(response);
}

export async function createManagedExam(apiUrl: string, token: string, body: ExamCreateRequest) {
  const response = await apiFetch(`${apiUrl}/api/exams`, {
    method: "POST",
    headers: jsonAuthHeaders(token),
    body: JSON.stringify(body),
  });
  return parseExamResponse(response);
}

export async function updateManagedExam(apiUrl: string, token: string, examId: string, body: ExamCreateRequest) {
  const response = await apiFetch(`${apiUrl}/api/exams/${examId}`, {
    method: "PUT",
    headers: jsonAuthHeaders(token),
    body: JSON.stringify(body),
  });
  return parseExamResponse(response);
}

export async function publishManagedExam(apiUrl: string, token: string, examId: string) {
  const response = await apiFetch(`${apiUrl}/api/exams/${examId}/publish`, {
    method: "POST",
    headers: authHeaders(token),
  });
  return parseExamResponse(response);
}

export async function closeManagedExam(apiUrl: string, token: string, examId: string) {
  const response = await apiFetch(`${apiUrl}/api/exams/${examId}/close`, {
    method: "POST",
    headers: authHeaders(token),
  });
  return parseExamResponse(response);
}

export async function republishManagedExam(apiUrl: string, token: string, examId: string) {
  const response = await apiFetch(`${apiUrl}/api/exams/${examId}/republish`, {
    method: "POST",
    headers: authHeaders(token),
  });
  return parseExamResponse(response);
}

export async function deleteManagedExam(apiUrl: string, token: string, examId: string) {
  const response = await apiFetch(`${apiUrl}/api/exams/${examId}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
}
