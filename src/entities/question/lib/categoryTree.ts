import type { CategoryNode, CategoryRecord } from "../model/types";

export function buildCategoryTree(flat: CategoryRecord[]): CategoryNode[] {
  const map = new Map<number, CategoryNode>();
  flat.forEach((record) => map.set(record.id, { ...record, children: [], subtreeCount: 0 }));

  const roots: CategoryNode[] = [];
  map.forEach((node) => {
    if (node.parentId === null || !map.has(node.parentId)) {
      roots.push(node);
    } else {
      map.get(node.parentId)!.children.push(node);
    }
  });

  const fill = (node: CategoryNode): number => {
    node.subtreeCount = node.questionCount + node.children.reduce((sum, child) => sum + fill(child), 0);
    return node.subtreeCount;
  };
  roots.forEach(fill);

  const sortRec = (nodes: CategoryNode[]) => {
    nodes.sort((a, b) => a.displayOrder - b.displayOrder || a.id - b.id);
    nodes.forEach((node) => sortRec(node.children));
  };
  sortRec(roots);
  return roots;
}

export function findCategoryNode(nodes: CategoryNode[], id: number | null): CategoryNode | null {
  if (id === null) return null;
  for (const node of nodes) {
    if (node.id === id) return node;
    const child = findCategoryNode(node.children, id);
    if (child) return child;
  }
  return null;
}

export function flattenCategoryTree(nodes: CategoryNode[], depth = 0): Array<CategoryNode & { depth: number }> {
  return nodes.flatMap((node) => [
    { ...node, depth },
    ...flattenCategoryTree(node.children, depth + 1),
  ]);
}
