export type CategoryRecord = {
  id: number;
  parentId: number | null;
  name: string;
  displayOrder: number;
  questionCount: number;
};

export type CategoryNode = CategoryRecord & {
  children: CategoryNode[];
  subtreeCount: number;
};

export type EmbeddingStatusResponse = {
  pending: number;
  completed: number;
  failed: number;
};

export type QuestionDifficulty = "easy" | "medium" | "hard";

export type QuestionType = "MULTIPLE_CHOICE" | "SHORT_ANSWER";

export type EmbeddingStatus = "PENDING" | "COMPLETED" | "FAILED";

export type QuestionKind =
  | "GENERAL"
  | "LISTENING_PURPOSE_OPINION"
  | "LISTENING_RELATION_PLACE"
  | "LISTENING_VISUAL_CHART"
  | "LISTENING_TASK_REASON"
  | "LISTENING_DETAIL"
  | "LISTENING_LONG_TALK"
  | "MAIN_IDEA"
  | "PURPOSE"
  | "CLAIM"
  | "GIST"
  | "TOPIC"
  | "TITLE"
  | "DETAIL_CHART"
  | "DETAIL_MATCH"
  | "PRACTICAL_TEXT"
  | "VOCAB_CONTEXT"
  | "VOCAB_UNDERLINED"
  | "GRAMMAR_CHECK"
  | "BLANK_WORD"
  | "BLANK_PHRASE"
  | "BLANK_SENTENCE"
  | "IRRELEVANT_SENTENCE"
  | "ORDERING"
  | "SENTENCE_INSERTION"
  | "SUMMARY_COMPLETION"
  | "LONG_READING_SET"
  | "COMPOSITE_READING";

export type QuestionSourceType = "UNKNOWN" | "CSAT" | "MOCK" | "CUSTOM";

export type QuestionResponse = {
  id: string;
  questionType: QuestionType;
  questionKind: QuestionKind;
  sourceType: QuestionSourceType;
  sourceName: string | null;
  categoryId: number;
  categoryPath: string[];
  area: string | null;
  listening: boolean;
  difficulty: QuestionDifficulty;
  question: string;
  passage?: string | null;
  choices: string[];
  answer: string;
  explanation: string;
  keywords: string[];
  embeddingText: string;
  embeddingStatus: EmbeddingStatus;
  embeddingModel: string | null;
  embeddedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PageResponse<T> = {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
};

export type EmbeddingBatchResult = {
  picked: number;
  completed: number;
  failed: number;
  stillPending: number;
};
