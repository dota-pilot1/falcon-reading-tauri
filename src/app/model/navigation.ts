import {
  BookOpenText,
  Home,
  Settings,
  UserCircle,
  type LucideIcon,
} from "lucide-react";
import type { UserSummary } from "../../entities/user/model/types";

export type WebMenuId = "home" | "readingMaterials" | "profile" | "settings";

export type WebMenu = {
  id: WebMenuId;
  label: string;
  subtitle: string;
  icon: LucideIcon;
  children?: string[];
};

export const WEB_HEADER_MENUS: WebMenu[] = [
  {
    id: "home",
    label: "홈",
    subtitle: "자료 현황 · 최근 저장 · 작업 대기",
    icon: Home,
  },
  {
    id: "readingMaterials",
    label: "독해 자료",
    subtitle: "원문 저장 · 분석 준비 · 학습 자료화",
    icon: BookOpenText,
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
