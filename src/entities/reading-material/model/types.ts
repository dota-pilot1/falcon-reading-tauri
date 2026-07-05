export type ReadingSourceType = "공식 문서" | "기사" | "원서" | "시험 지문";

export type ReadingLevel = "B1" | "B2" | "C1";

export type ReadingMaterialStatus = "원문 저장" | "분석 대기" | "학습 가능";

export type ReadingFolder = {
  id: string;
  name: string;
  parentId: string | null;
  sortOrder: number;
};

export type ReadingMaterial = {
  id: number;
  folderId: string;
  title: string;
  sourceType: ReadingSourceType;
  level: ReadingLevel;
  status: ReadingMaterialStatus;
  sourceUrl: string;
  collectedDate: string;
  savedAt: string;
  wordCount: number;
  estimatedMinutes: number;
};

export type ReadingTreeFilter =
  | { kind: "all" }
  | { kind: "folder"; folderId: string }
  | { kind: "date"; date: string }
  | { kind: "status"; status: ReadingMaterialStatus }
  | { kind: "sourceType"; sourceType: ReadingSourceType };

export type ReadingTreeNode = {
  id: string;
  label: string;
  count: number;
  depth?: number;
  filter: ReadingTreeFilter;
};

export type ReadingTreeSection = {
  id: string;
  label: string;
  nodes: ReadingTreeNode[];
};
