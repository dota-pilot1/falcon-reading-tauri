import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { ReadingTreeFilter } from "../../../entities/reading-material";
import { fetchReadingMaterialVocabulary, fetchReadingMaterials, fetchReadingTree, fetchReadingVocabulary } from "../../../entities/reading-material/api/readingMaterialApi";

function paramsFromFilter(filter: ReadingTreeFilter) {
  if (filter.kind === "folder") return { folderId: filter.folderId };
  if (filter.kind === "date") return { date: filter.date };
  if (filter.kind === "sourceType") return { sourceType: filter.sourceType };
  if (filter.kind === "status") return { status: filter.status };
  return {};
}

export const readingMaterialQueryKeys = {
  root: ["reading-materials"] as const,
  tree: (apiUrl: string) => ["reading-materials", apiUrl, "tree"] as const,
  materialsRoot: (apiUrl: string) => ["reading-materials", apiUrl, "materials"] as const,
  materials: (apiUrl: string, filter: ReadingTreeFilter) => ["reading-materials", apiUrl, "materials", filter] as const,
  vocabularyRoot: (apiUrl: string) => ["reading-materials", apiUrl, "vocabulary"] as const,
  materialVocabulary: (apiUrl: string, materialId: string) => ["reading-materials", apiUrl, "vocabulary", materialId] as const,
};

export function useReadingTreeQuery(apiUrl: string, token: string) {
  return useQuery({
    queryKey: readingMaterialQueryKeys.tree(apiUrl),
    queryFn: () => fetchReadingTree(apiUrl, token),
    enabled: token.trim().length > 0,
  });
}

export function useReadingMaterialsQuery(apiUrl: string, token: string, filter: ReadingTreeFilter) {
  return useQuery({
    queryKey: readingMaterialQueryKeys.materials(apiUrl, filter),
    queryFn: async () => {
      const items = await fetchReadingMaterials(apiUrl, token, paramsFromFilter(filter));
      return filter.kind === "folder" ? items.filter((material) => material.folderId === filter.folderId) : items;
    },
    enabled: token.trim().length > 0,
  });
}

export function useReadingMaterialVocabularyQuery(apiUrl: string, token: string, materialId: string | null) {
  return useQuery({
    queryKey: readingMaterialQueryKeys.materialVocabulary(apiUrl, materialId ?? "none"),
    queryFn: () => fetchReadingMaterialVocabulary(apiUrl, token, materialId ?? ""),
    enabled: token.trim().length > 0 && Boolean(materialId),
  });
}

export function useReadingVocabularyQuery(apiUrl: string, token: string) {
  return useQuery({
    queryKey: readingMaterialQueryKeys.vocabularyRoot(apiUrl),
    queryFn: () => fetchReadingVocabulary(apiUrl, token),
    enabled: token.trim().length > 0,
  });
}

export function useInvalidateReadingMaterials(apiUrl: string) {
  const queryClient = useQueryClient();

  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: readingMaterialQueryKeys.tree(apiUrl), refetchType: "all" }),
      queryClient.invalidateQueries({ queryKey: readingMaterialQueryKeys.materialsRoot(apiUrl), refetchType: "all" }),
      queryClient.invalidateQueries({ queryKey: readingMaterialQueryKeys.vocabularyRoot(apiUrl), refetchType: "all" }),
    ]);
}
