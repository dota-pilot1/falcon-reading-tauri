import type { Agent } from "./types";

export const FALLBACK_AGENTS: Agent[] = [
  {
    id: "debate",
    title: "미국 친구",
    subtitle: "American Friend",
    description: "일상 회화와 짧은 영어 답변을 편하게 연습합니다.",
    sessionGoal: "오늘 있었던 일이나 관심사를 영어로 말하기",
  },
  {
    id: "interview",
    title: "면접 코치",
    subtitle: "Interview Coach",
    description: "답변을 짧고 명확한 영어로 정리합니다.",
    sessionGoal: "자기소개와 경험 설명 연습",
  },
  {
    id: "travel",
    title: "여행 도우미",
    subtitle: "Travel Buddy",
    description: "공항, 호텔, 식당에서 바로 쓰는 표현을 연습합니다.",
    sessionGoal: "여행 상황별 말하기",
  },
];

export const starterPrompts = [
  "How was your day?",
  "What do you usually do on weekends?",
  "Tell me about life in the U.S.",
];
