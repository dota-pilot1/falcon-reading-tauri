import { apiFetch } from "../../../shared/api/client";

export type QuizQuestionType = "MULTIPLE_CHOICE" | "SHORT_ANSWER";

export type QuizQuestion = {
  id: number;
  type: QuizQuestionType;
  prompt: string;
  imageUrl: string | null;
  choices: string[];
  choiceImageUrls: string[];
  answer: string | null;
  explanation: string | null;
  displayOrder: number;
};

export type Quiz = {
  id: number;
  title: string;
  description: string | null;
  category: string;
  difficulty: string;
  coverImageUrl: string | null;
  active: boolean;
  questionCount: number;
  questions: QuizQuestion[];
  updatedAt: string;
};

export type QuizAttemptResult = {
  id: number;
  quizId: number;
  quizTitle: string;
  score: number;
  maxScore: number;
  answers: Array<{
    questionId: number;
    prompt: string;
    submittedAnswer: string | null;
    correctAnswer: string;
    explanation: string | null;
    correct: boolean;
  }>;
  createdAt: string;
};

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

export async function fetchPlayableQuizzes(apiUrl: string, token: string) {
  const response = await apiFetch(`${apiUrl}/api/quiz-play/quizzes`, {
    headers: authHeaders(token),
  });
  if (!response.ok) throw new Error(`quiz list HTTP ${response.status}`);
  return (await response.json()) as Quiz[];
}

export async function fetchPlayableQuiz(apiUrl: string, token: string, quizId: number) {
  const response = await apiFetch(`${apiUrl}/api/quiz-play/quizzes/${quizId}`, {
    headers: authHeaders(token),
  });
  if (!response.ok) throw new Error(`quiz HTTP ${response.status}`);
  return (await response.json()) as Quiz;
}

export async function submitQuizAnswers(
  apiUrl: string,
  token: string,
  quizId: number,
  answers: Array<{ questionId: number; answer: string }>
) {
  const response = await apiFetch(`${apiUrl}/api/quiz-play/quizzes/${quizId}/submit`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ answers }),
  });
  if (!response.ok) throw new Error(`quiz submit HTTP ${response.status}`);
  return (await response.json()) as QuizAttemptResult;
}
