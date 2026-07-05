import type { EmbeddingStatus, QuestionDifficulty, QuestionKind, QuestionSourceType } from "../model/types";

export function difficultyLabel(value: QuestionDifficulty) {
  return { easy: "하", medium: "중", hard: "상" }[value];
}

export function embeddingLabel(value: EmbeddingStatus) {
  return { PENDING: "임베딩 대기", COMPLETED: "완료", FAILED: "실패" }[value];
}

export function questionKindLabel(value: QuestionKind | null | undefined) {
  const labels: Record<QuestionKind, string> = {
    GENERAL: "일반",
    LISTENING_PURPOSE_OPINION: "목적/의견",
    LISTENING_RELATION_PLACE: "관계/장소",
    LISTENING_VISUAL_CHART: "그림/도표",
    LISTENING_TASK_REASON: "할 일/이유",
    LISTENING_DETAIL: "내용 일치",
    LISTENING_LONG_TALK: "긴 대화/담화",
    MAIN_IDEA: "대의 파악",
    PURPOSE: "목적",
    CLAIM: "주장",
    GIST: "요지",
    TOPIC: "주제",
    TITLE: "제목",
    DETAIL_CHART: "도표",
    DETAIL_MATCH: "내용 일치",
    PRACTICAL_TEXT: "실용문",
    VOCAB_CONTEXT: "문맥상 어휘",
    VOCAB_UNDERLINED: "밑줄 어휘",
    GRAMMAR_CHECK: "어법성 판단",
    BLANK_WORD: "단어 빈칸",
    BLANK_PHRASE: "구/절 빈칸",
    BLANK_SENTENCE: "문장 빈칸",
    IRRELEVANT_SENTENCE: "무관한 문장",
    ORDERING: "글의 순서",
    SENTENCE_INSERTION: "문장 삽입",
    SUMMARY_COMPLETION: "요약문 완성",
    LONG_READING_SET: "1지문 2문항",
    COMPOSITE_READING: "복합 장문",
  };
  return labels[value ?? "GENERAL"];
}

export function sourceLabel(type: QuestionSourceType | null | undefined, name?: string | null) {
  const labels: Record<QuestionSourceType, string> = {
    UNKNOWN: "출처 미상",
    CSAT: "수능",
    MOCK: "모의고사",
    CUSTOM: "자체 제작",
  };
  const base = labels[type ?? "UNKNOWN"];
  return name ? `${base} · ${name}` : base;
}
