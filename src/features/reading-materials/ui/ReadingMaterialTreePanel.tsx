import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CalendarDays, ChevronDown, ChevronRight, Folder, FolderOpen, GripVertical, Pencil, Plus, RefreshCw, Search, Settings, Trash2, X } from "lucide-react";
import { Button } from "../../../shared/ui/Button";
import type { ReadingTreeFilter, ReadingTreeSection } from "../../../entities/reading-material";

export type FolderDialogState = {
  mode: "create" | "edit";
  folderId: number | null;
  parentId: number | null;
  name: string;
};

type ReadingMaterialTreePanelProps = {
  sections: ReadingTreeSection[];
  activeTreeId: string;
  collapsedSections: Set<string>;
  collapsedFolders: Set<number>;
  folderDialog: FolderDialogState | null;
  folderManagementOpen: boolean;
  folderDraftName: string;
  creatingFolder: boolean;
  savingFolder: boolean;
  deletingFolder: boolean;
  refreshing: boolean;
  onOpenCreateRoot: () => void;
  onRefresh: () => void;
  onOpenCreateChild: (node: ReadingTreeSection["nodes"][number]) => void;
  onOpenEditFolder: (node: ReadingTreeSection["nodes"][number]) => void;
  onOpenFolderManagement: () => void;
  onCloseFolderManagement: () => void;
  onCloseFolderDialog: () => void;
  onSelect: (nodeId: string, filter: ReadingTreeFilter) => void;
  onToggleSection: (sectionId: string) => void;
  onToggleFolder: (folderId: number) => void;
  onChangeFolderDraftName: (value: string) => void;
  onSaveFolder: () => void;
  onDeleteFolder: (node?: ReadingTreeSection["nodes"][number]) => void;
  onReorderFolder: (activeFolderId: number, overFolderId: number) => void;
};

type TreeContextMenuState = {
  node: ReadingTreeSection["nodes"][number];
  x: number;
  y: number;
};

export function ReadingMaterialTreePanel({
  sections,
  activeTreeId,
  collapsedSections,
  collapsedFolders,
  folderDialog,
  folderManagementOpen,
  folderDraftName,
  creatingFolder,
  savingFolder,
  deletingFolder,
  refreshing,
  onOpenCreateRoot,
  onRefresh,
  onOpenCreateChild,
  onOpenEditFolder,
  onOpenFolderManagement,
  onCloseFolderManagement,
  onCloseFolderDialog,
  onSelect,
  onToggleSection,
  onToggleFolder,
  onChangeFolderDraftName,
  onSaveFolder,
  onDeleteFolder,
  onReorderFolder,
}: ReadingMaterialTreePanelProps) {
  const [contextMenu, setContextMenu] = useState<TreeContextMenuState | null>(null);
  const folderNodes = useMemo(
    () => sections.find((section) => section.id === "library")?.nodes.filter((node) => node.filter.kind === "folder") ?? [],
    [sections]
  );

  useEffect(() => {
    const closeContextMenu = () => setContextMenu(null);
    window.addEventListener("click", closeContextMenu);
    window.addEventListener("keydown", closeContextMenu);
    return () => {
      window.removeEventListener("click", closeContextMenu);
      window.removeEventListener("keydown", closeContextMenu);
    };
  }, []);

  return (
    <aside className="material-tree-panel">
      <div className="material-list-head">
        <div>
          <strong>자료 트리</strong>
        </div>
        <div className="material-list-actions">
          <button type="button" className="material-tree-action" onClick={onOpenCreateRoot} aria-label="루트 폴더 추가" title="루트 폴더 추가">
            <Plus size={16} />
          </button>
          <button
            type="button"
            className="material-tree-action"
            onClick={onRefresh}
            disabled={refreshing}
            aria-label="자료 트리 새로고침"
            title="새로고침"
          >
            <RefreshCw className={refreshing ? "spinning" : ""} size={15} />
          </button>
          <button type="button" className="material-tree-gear" onClick={onOpenFolderManagement} aria-label="폴더 관리" title="폴더 관리">
            <Settings size={16} />
          </button>
        </div>
      </div>

      <div className="material-tree-search">
        <Search size={15} />
        <span>폴더, 날짜, 상태 검색</span>
      </div>

      <div className="material-tree-sections">
        {sections.map((section) => (
          <TreeSection
            key={section.id}
            section={section}
            activeTreeId={activeTreeId}
            collapsed={collapsedSections.has(section.id)}
            collapsedFolders={collapsedFolders}
            onSelect={onSelect}
            onToggleSection={onToggleSection}
            onToggleFolder={onToggleFolder}
            onOpenContextMenu={(node, x, y) => setContextMenu({ node, x, y })}
          />
        ))}
      </div>

      {contextMenu ? (
        <div
          className="material-tree-context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(event) => event.stopPropagation()}
        >
          <strong>{contextMenu.node.label}</strong>
          <button
            type="button"
            onClick={() => {
              onOpenCreateChild(contextMenu.node);
              setContextMenu(null);
            }}
          >
            <Plus size={14} /> 하위 폴더 추가
          </button>
          <button
            type="button"
            onClick={() => {
              onOpenEditFolder(contextMenu.node);
              setContextMenu(null);
            }}
          >
            <Pencil size={14} /> 이름 수정
          </button>
        </div>
      ) : null}

      {folderManagementOpen ? (
        <FolderManagementDialog
          nodes={folderNodes}
          onClose={onCloseFolderManagement}
          onOpenCreateRoot={onOpenCreateRoot}
          onOpenCreateChild={onOpenCreateChild}
          onOpenEditFolder={onOpenEditFolder}
          onDeleteFolder={onDeleteFolder}
          deletingFolder={deletingFolder}
          onReorderFolder={onReorderFolder}
        />
      ) : null}

      {folderDialog ? (
        <div className="material-dialog-backdrop folder-dialog-backdrop" onClick={onCloseFolderDialog}>
          <section className="folder-dialog" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <div className="folder-dialog-head">
              <div>
                <span>{folderDialog.mode === "create" ? "New Folder" : "Folder Settings"}</span>
                <h2>{folderDialog.mode === "create" ? "폴더 추가" : folderDialog.name}</h2>
              </div>
              <button type="button" className="icon-button" onClick={onCloseFolderDialog} aria-label="닫기">
                <X size={17} />
              </button>
            </div>

            <label className="folder-dialog-field">
              폴더 이름
              <input value={folderDraftName} onChange={(event) => onChangeFolderDraftName(event.target.value)} placeholder="폴더 이름" autoFocus />
            </label>

            <div className="folder-dialog-actions">
              {folderDialog.mode === "edit" ? (
                <>
                  <Button type="button" variant="outline" onClick={() => onOpenCreateChild(nodeFromDialog(folderDialog))}>
                    <Plus size={15} /> 하위 폴더
                  </Button>
                  <Button type="button" variant="outline" onClick={() => onDeleteFolder()} disabled={deletingFolder}>
                    <Trash2 size={15} /> {deletingFolder ? "삭제 중" : "삭제"}
                  </Button>
                </>
              ) : null}
              <Button type="button" onClick={onSaveFolder} disabled={creatingFolder || savingFolder}>
                {folderDialog.mode === "create" ? <Plus size={15} /> : <Pencil size={15} />}
                {creatingFolder || savingFolder ? "저장 중" : folderDialog.mode === "create" ? "추가" : "저장"}
              </Button>
            </div>
          </section>
        </div>
      ) : null}
    </aside>
  );
}

function nodeFromDialog(dialog: FolderDialogState): ReadingTreeSection["nodes"][number] {
  return {
    id: `folder:${dialog.folderId}`,
    label: dialog.name,
    count: 0,
    parentFolderId: dialog.parentId,
    filter: { kind: "folder", folderId: dialog.folderId ?? 0 },
  };
}

function FolderManagementDialog({
  nodes,
  deletingFolder,
  onClose,
  onOpenCreateRoot,
  onOpenCreateChild,
  onOpenEditFolder,
  onDeleteFolder,
  onReorderFolder,
}: {
  nodes: ReadingTreeSection["nodes"];
  deletingFolder: boolean;
  onClose: () => void;
  onOpenCreateRoot: () => void;
  onOpenCreateChild: (node: ReadingTreeSection["nodes"][number]) => void;
  onOpenEditFolder: (node: ReadingTreeSection["nodes"][number]) => void;
  onDeleteFolder: (node?: ReadingTreeSection["nodes"][number]) => void;
  onReorderFolder: (activeFolderId: number, overFolderId: number) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const folderIds = nodes
    .map((node) => node.filter.kind === "folder" ? node.filter.folderId : null)
    .filter((id): id is number => id !== null);

  const handleDragEnd = (event: DragEndEvent) => {
    const activeFolderId = Number(event.active.id);
    const overFolderId = Number(event.over?.id);
    if (!Number.isFinite(activeFolderId) || !Number.isFinite(overFolderId) || activeFolderId === overFolderId) return;
    onReorderFolder(activeFolderId, overFolderId);
  };

  return (
    <div className="material-dialog-backdrop folder-dialog-backdrop" onClick={onClose}>
      <section className="folder-manage-dialog" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <div className="folder-dialog-head">
          <div>
            <span>Folder Manager</span>
            <h2>폴더 수정 및 순서 변경</h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="닫기">
            <X size={17} />
          </button>
        </div>

        <div className="folder-manage-toolbar">
          <Button type="button" variant="outline" onClick={onOpenCreateRoot}>
            <Plus size={15} /> 루트 폴더
          </Button>
        </div>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={folderIds} strategy={verticalListSortingStrategy}>
            <div className="folder-manage-list">
              {nodes.map((node, index) => {
                const folderId = node.filter.kind === "folder" ? node.filter.folderId : null;
                const previousNode = nodes[index - 1];
                const startsRootGroup = (node.depth ?? 0) === 0 && previousNode !== undefined;
                const hasChildren = folderId !== null && nodes.some((candidate) => candidate.parentFolderId === folderId);
                return folderId === null ? null : (
                  <ManageFolderRow
                    key={node.id}
                    folderId={folderId}
                    node={node}
                    startsRootGroup={startsRootGroup}
                    hasChildren={hasChildren}
                    deletingFolder={deletingFolder}
                    onOpenCreateChild={onOpenCreateChild}
                    onOpenEditFolder={onOpenEditFolder}
                    onDeleteFolder={onDeleteFolder}
                  />
                );
              })}
            </div>
          </SortableContext>
        </DndContext>
      </section>
    </div>
  );
}

function ManageFolderRow({
  folderId,
  node,
  startsRootGroup,
  hasChildren,
  deletingFolder,
  onOpenCreateChild,
  onOpenEditFolder,
  onDeleteFolder,
}: {
  folderId: number;
  node: ReadingTreeSection["nodes"][number];
  startsRootGroup: boolean;
  hasChildren: boolean;
  deletingFolder: boolean;
  onOpenCreateChild: (node: ReadingTreeSection["nodes"][number]) => void;
  onOpenEditFolder: (node: ReadingTreeSection["nodes"][number]) => void;
  onDeleteFolder: (node?: ReadingTreeSection["nodes"][number]) => void;
}) {
  const { attributes, listeners, setActivatorNodeRef, setNodeRef, transform, transition, isDragging } = useSortable({ id: folderId });
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div className={`folder-manage-row depth-${node.depth ?? 0} ${startsRootGroup ? "root-start" : ""} ${isDragging ? "dragging" : ""}`} ref={setNodeRef} style={style}>
      <button
        type="button"
        className="folder-manage-drag"
        ref={setActivatorNodeRef}
        title="드래그해서 순서 변경"
        aria-label={`${node.label} 순서 변경`}
        {...attributes}
        {...listeners}
      >
        <GripVertical size={15} />
      </button>
      <div className="folder-manage-name" style={{ paddingLeft: `${(node.depth ?? 0) * 14}px` }}>
        {hasChildren ? (
          <ChevronDown className="folder-manage-chevron" size={14} />
        ) : (
          <ChevronRight className="folder-manage-chevron muted" size={14} />
        )}
        <Folder size={15} />
        <span>{node.label}</span>
        <em>{node.count}</em>
      </div>
      <button type="button" className="folder-manage-icon" onClick={() => onOpenCreateChild(node)} aria-label="하위 폴더 추가" title="하위 폴더 추가">
        <Plus size={14} />
      </button>
      <button type="button" className="folder-manage-icon" onClick={() => onOpenEditFolder(node)} aria-label="이름 수정" title="이름 수정">
        <Pencil size={14} />
      </button>
      <button type="button" className="folder-manage-icon danger" onClick={() => onDeleteFolder(node)} disabled={deletingFolder} aria-label="삭제" title="삭제">
        <Trash2 size={14} />
      </button>
    </div>
  );
}

function TreeSection({
  section,
  activeTreeId,
  collapsed,
  collapsedFolders,
  onSelect,
  onToggleSection,
  onToggleFolder,
  onOpenContextMenu,
}: {
  section: ReadingTreeSection;
  activeTreeId: string;
  collapsed: boolean;
  collapsedFolders: Set<number>;
  onSelect: (nodeId: string, filter: ReadingTreeFilter) => void;
  onToggleSection: (sectionId: string) => void;
  onToggleFolder: (folderId: number) => void;
  onOpenContextMenu: (node: ReadingTreeSection["nodes"][number], x: number, y: number) => void;
}) {
  return (
    <section className="material-tree-section">
      <button className="material-tree-section-title" type="button" onClick={() => onToggleSection(section.id)}>
        <ChevronDown className={collapsed ? "collapsed" : ""} size={15} />
        <strong>{section.label}</strong>
      </button>
      <div className="material-tree-node-list">
        {section.nodes.map((node) => {
          const folderId = node.filter.kind === "folder" ? node.filter.folderId : null;
          const isFolderCollapsed = folderId !== null && collapsedFolders.has(folderId);
          return (
            <div
              className="material-tree-node-wrap"
              key={node.id}
              onContextMenu={(event) => {
                event.preventDefault();
                event.stopPropagation();
                if (folderId !== null) onOpenContextMenu(node, event.clientX, event.clientY);
              }}
            >
              <button
                className={`material-tree-collapse ${folderId === null ? "spacer" : ""}`}
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  if (folderId !== null) onToggleFolder(folderId);
                }}
                title={folderId !== null ? "하위 폴더 접기" : undefined}
                aria-hidden={folderId === null}
                tabIndex={folderId === null ? -1 : 0}
              >
                {folderId !== null ? <ChevronDown className={isFolderCollapsed ? "collapsed" : ""} size={14} /> : null}
              </button>
              <button
                className={`material-tree-node depth-${node.depth ?? 0} ${node.id === activeTreeId ? "active" : ""}`}
                type="button"
                onClick={() => onSelect(node.id, node.filter)}
              >
                {section.id === "dates" ? <CalendarDays size={15} /> : node.id === activeTreeId ? <FolderOpen size={15} /> : <Folder size={15} />}
                <span>{node.label}</span>
                <em>{node.count}</em>
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
