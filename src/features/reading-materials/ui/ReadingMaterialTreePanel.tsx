import type { MouseEvent } from "react";
import { CalendarDays, ChevronDown, Folder, FolderOpen, MoveDown, MoveUp, Plus, Search } from "lucide-react";
import { Button } from "../../../shared/ui/Button";
import type { ReadingTreeFilter, ReadingTreeSection } from "../../../entities/reading-material";

export type FolderContextState = {
  folderId: number | null;
  parentId: number | null;
  name: string;
  x: number;
  y: number;
};

type ReadingMaterialTreePanelProps = {
  sections: ReadingTreeSection[];
  activeTreeId: string;
  collapsedSections: Set<string>;
  collapsedFolders: Set<number>;
  contextFolder: FolderContextState | null;
  newFolderName: string;
  creatingFolder: boolean;
  onOpenRootContext: (x: number, y: number) => void;
  onOpenFolderContext: (event: MouseEvent, node: ReadingTreeSection["nodes"][number]) => void;
  onSelect: (nodeId: string, filter: ReadingTreeFilter) => void;
  onToggleSection: (sectionId: string) => void;
  onToggleFolder: (folderId: number) => void;
  onChangeNewFolderName: (value: string) => void;
  onCreateFolder: () => void;
  onMoveFolder: (direction: -1 | 1) => void;
};

export function ReadingMaterialTreePanel({
  sections,
  activeTreeId,
  collapsedSections,
  collapsedFolders,
  contextFolder,
  newFolderName,
  creatingFolder,
  onOpenRootContext,
  onOpenFolderContext,
  onSelect,
  onToggleSection,
  onToggleFolder,
  onChangeNewFolderName,
  onCreateFolder,
  onMoveFolder,
}: ReadingMaterialTreePanelProps) {
  return (
    <aside className="material-tree-panel">
      <div className="material-list-head">
        <div>
          <strong>자료 트리</strong>
          <small>우클릭으로 하위 폴더 추가</small>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={(event) => {
            const rect = event.currentTarget.getBoundingClientRect();
            onOpenRootContext(rect.left, rect.bottom + 6);
          }}
        >
          <Plus size={15} /> 추가
        </Button>
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
            onOpenContext={onOpenFolderContext}
          />
        ))}
      </div>

      <div
        className="material-tree-dropzone"
        onContextMenu={(event) => {
          event.preventDefault();
          onOpenRootContext(event.clientX, event.clientY);
        }}
      >
        빈 곳 우클릭으로 루트 폴더 추가
      </div>

      {contextFolder ? (
        <div
          className="material-context-menu"
          style={{ left: contextFolder.x, top: contextFolder.y }}
          onClick={(event) => event.stopPropagation()}
        >
          <strong>{contextFolder.name}</strong>
          {contextFolder.folderId !== null ? (
            <div className="material-context-menu-row">
              <button type="button" className="ghost" onClick={() => onMoveFolder(-1)}>
                <MoveUp size={14} /> 위로
              </button>
              <button type="button" className="ghost" onClick={() => onMoveFolder(1)}>
                <MoveDown size={14} /> 아래로
              </button>
            </div>
          ) : null}
          <input
            value={newFolderName}
            onChange={(event) => onChangeNewFolderName(event.target.value)}
            placeholder="하위 폴더 이름"
            autoFocus
          />
          <button type="button" onClick={onCreateFolder} disabled={creatingFolder}>
            <Plus size={14} /> {contextFolder.folderId === null ? "루트 폴더 추가" : "하위 폴더 추가"}
          </button>
        </div>
      ) : null}
    </aside>
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
  onOpenContext,
}: {
  section: ReadingTreeSection;
  activeTreeId: string;
  collapsed: boolean;
  collapsedFolders: Set<number>;
  onSelect: (nodeId: string, filter: ReadingTreeFilter) => void;
  onToggleSection: (sectionId: string) => void;
  onToggleFolder: (folderId: number) => void;
  onOpenContext: (event: MouseEvent, node: ReadingTreeSection["nodes"][number]) => void;
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
            <div className="material-tree-node-wrap" key={node.id} onContextMenu={(event) => onOpenContext(event, node)}>
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
