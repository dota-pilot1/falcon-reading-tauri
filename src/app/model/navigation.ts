import {
  BarChart3,
  BookOpenText,
  Headphones,
  Home,
  RotateCcw,
  Settings,
  UserCircle,
  WholeWord,
  type LucideIcon,
} from "lucide-react";
import type { UserSummary } from "../../entities/user/model/types";

export type WebMenuId = "today" | "reading" | "listening" | "vocabulary" | "review" | "records" | "profile" | "settings";

export type WebMenu = {
  id: WebMenuId;
  label: string;
  subtitle: string;
  icon: LucideIcon;
  children?: string[];
};

export const WEB_HEADER_MENUS: WebMenu[] = [
  {
    id: "today",
    label: "오늘 학습",
    subtitle: "독해 1개 · 듣기 1개 · 복습",
    icon: Home,
  },
  {
    id: "reading",
    label: "독해",
    subtitle: "문장 해석 · 구조 파악 · 이해 문제",
    icon: BookOpenText,
  },
  {
    id: "listening",
    label: "듣기",
    subtitle: "오디오 · 스크립트 · 받아쓰기",
    icon: Headphones,
  },
  {
    id: "vocabulary",
    label: "단어장",
    subtitle: "저장 단어 · 예문 · 반복 복습",
    icon: WholeWord,
  },
  {
    id: "review",
    label: "복습",
    subtitle: "놓친 문장 · 오답 · 받아쓰기",
    icon: RotateCcw,
  },
  {
    id: "records",
    label: "기록",
    subtitle: "연속 학습 · 정답률 · 듣기 반복",
    icon: BarChart3,
  },
  {
    id: "settings",
    label: "설정",
    subtitle: "계정 · 앱 환경",
    icon: Settings,
  },
];

export const PROFILE_MENU: WebMenu = {
  id: "profile",
  label: "프로필",
  subtitle: "내 계정 · 권한 정보",
  icon: UserCircle,
};

export function canAccessMenu(user: UserSummary | null, menu: WebMenuId) {
  return user !== null && [...WEB_HEADER_MENUS, PROFILE_MENU].some((item) => item.id === menu);
}
