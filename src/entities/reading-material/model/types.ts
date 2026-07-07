export type ReadingSourceType = "TEXTBOOK_PASSAGE" | "EXAM_PASSAGE" | "NEWS_ARTICLE" | "EXPOSITORY" | "ARGUMENTATIVE" | "ESSAY";

export type ReadingLevel = "MIDDLE" | "HIGH_BASIC" | "HIGH" | "CSAT" | "ADVANCED";

export type ReadingMaterialStatus = "RAW" | "ANALYSIS_PENDING" | "READY";

export type ReadingFolder = {
  id: number;
  name: string;
  parentId: number | null;
  displayOrder: number;
  materialCount: number;
  createdAt: string;
  updatedAt: string;
};

export type ReadingMaterial = {
  id: string;
  folderId: number | null;
  title: string;
  sourceType: ReadingSourceType;
  level: ReadingLevel;
  status: ReadingMaterialStatus;
  sourceUrl: string | null;
  originalText: string;
  translationText: string | null;
  collectedDate: string;
  wordCount: number;
  estimatedMinutes: number;
  createdAt: string;
  updatedAt: string;
};

export type ReadingMaterialUpsertRequest = {
  folderId: number | null;
  title: string;
  sourceType: ReadingSourceType;
  level: ReadingLevel;
  status: ReadingMaterialStatus;
  sourceUrl: string;
  originalText: string;
  translationText: string;
  collectedDate: string;
};

export type ReadingFolderCreateRequest = {
  parentId: number | null;
  name: string;
};

export type ReadingFolderRenameRequest = {
  name: string;
};

export type ReadingFolderReorderRequest = {
  parentId: number | null;
  orderedIds: number[];
};

export type ReadingTreeFilter =
  | { kind: "all" }
  | { kind: "folder"; folderId: number }
  | { kind: "date"; date: string }
  | { kind: "status"; status: ReadingMaterialStatus }
  | { kind: "sourceType"; sourceType: ReadingSourceType };

export type ReadingTreeNode = {
  id: string;
  label: string;
  count: number;
  depth?: number;
  parentFolderId?: number | null;
  filter: ReadingTreeFilter;
};

export type ReadingTreeSection = {
  id: string;
  label: string;
  nodes: ReadingTreeNode[];
};

export type TreeCount = {
  key: string;
  label: string;
  count: number;
};

export type ReadingTreeResponse = {
  folders: ReadingFolder[];
  dates: TreeCount[];
  sourceTypes: TreeCount[];
  statuses: TreeCount[];
};

export const sourceTypeLabels: Record<ReadingSourceType, string> = {
  TEXTBOOK_PASSAGE: "교과서 지문",
  EXAM_PASSAGE: "시험 지문",
  NEWS_ARTICLE: "기사문",
  EXPOSITORY: "설명문",
  ARGUMENTATIVE: "논설문",
  ESSAY: "에세이",
};

export const readingLevelLabels: Record<ReadingLevel, string> = {
  MIDDLE: "중등",
  HIGH_BASIC: "고등 기본",
  HIGH: "고등 실전",
  CSAT: "수능",
  ADVANCED: "심화",
};

export function readingLevelLabel(level: string) {
  return (
    {
      ...readingLevelLabels,
      B1: "고등 기본",
      B2: "고등 실전",
      C1: "심화",
    }[level] ?? level
  );
}

export const statusLabels: Record<ReadingMaterialStatus, string> = {
  RAW: "원문 저장",
  ANALYSIS_PENDING: "분석 대기",
  READY: "학습 가능",
};
