import type { QuestionType } from "../../question/model/types";

export type ExamStatus = "DRAFT" | "PUBLISHED" | "CLOSED";

export type AttemptStatus = "IN_PROGRESS" | "SUBMITTED";

export type ExamItemResponse = {
  questionId: string;
  orderNo: number;
  points: number;
  questionType: QuestionType;
  difficulty: "easy" | "medium" | "hard";
  categoryPath: string[];
  question: string;
  passage: string | null;
  choices: string[];
  answer: string;
  explanation: string;
};

export type ExamResponse = {
  id: string;
  title: string;
  description: string | null;
  subjectId: number | null;
  subjectName: string | null;
  examCategoryId: number | null;
  examCategoryName: string | null;
  status: ExamStatus;
  timeLimitMinutes: number | null;
  totalPoints: number;
  itemCount: number;
  createdById: number;
  createdByName: string;
  items: ExamItemResponse[];
  createdAt: string;
  updatedAt: string;
};

export type TakeItem = {
  questionId: string;
  orderNo: number;
  questionType: QuestionType;
  question: string;
  passage: string | null;
  choices: string[];
  maxPoints: number;
};

export type ExamTakeResponse = {
  attemptId: string;
  examId: string;
  title: string;
  description: string | null;
  timeLimitMinutes: number | null;
  maxScore: number;
  startedAt: string;
  items: TakeItem[];
};

export type AttemptResultItem = {
  questionId: string;
  orderNo: number;
  questionType: QuestionType;
  question: string;
  passage: string | null;
  choices: string[];
  submittedAnswer: string | null;
  correctAnswer: string;
  correct: boolean | null;
  earnedPoints: number;
  maxPoints: number;
  explanation: string;
  requiresReview: boolean;
};

export type AttemptResultResponse = {
  attemptId: string;
  examId: string;
  examTitle: string;
  status: AttemptStatus;
  totalScore: number;
  maxScore: number;
  requiresReview: boolean;
  submittedAt: string | null;
  items: AttemptResultItem[];
};

export type AttemptSummaryResponse = {
  attemptId: string;
  examId: string;
  examTitle: string;
  examineeId: number;
  examineeName: string;
  status: AttemptStatus;
  totalScore: number;
  maxScore: number;
  requiresReview: boolean;
  startedAt: string;
  submittedAt: string | null;
};
