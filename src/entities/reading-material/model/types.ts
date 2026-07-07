export type ReadingSourceType = "OFFICIAL_DOCS" | "ARTICLE" | "BOOK" | "EXAM_PASSAGE";

export type ReadingLevel = "B1" | "B2" | "C1";

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
  OFFICIAL_DOCS: "공식 문서",
  ARTICLE: "기사",
  BOOK: "원서",
  EXAM_PASSAGE: "시험 지문",
};

export const statusLabels: Record<ReadingMaterialStatus, string> = {
  RAW: "원문 저장",
  ANALYSIS_PENDING: "분석 대기",
  READY: "학습 가능",
};
