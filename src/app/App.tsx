import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  CircleAlert,
  Folder,
  Link,
  PlayCircle,
  Plus,
  Save,
  X,
} from "lucide-react";
import { WEB_HEADER_MENUS, PROFILE_MENU, SETTINGS_MENU, canAccessMenu, type WebMenu, type WebMenuId } from "./model/navigation";
import { LoginScreen } from "../features/auth/login/LoginScreen";
import { login, logout, signup } from "../features/auth/api/authApi";
import { useAuthSession } from "../features/auth/model/useAuthSession";
import { defaultApiUrl, unauthorizedEventName } from "../shared/api/client";
import { AppSidebar } from "../widgets/app-shell/ui/AppSidebar";
import { AppTopbar } from "../widgets/app-shell/ui/AppTopbar";
import { Badge } from "../shared/ui/Badge";
import { Button } from "../shared/ui/Button";
import { Card, CardDescription, CardHeader, CardTitle } from "../shared/ui/Card";
import { Select } from "../shared/ui/Select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../shared/ui/Tabs";
import { useInvalidateReadingMaterials, useReadingMaterialsQuery, useReadingTreeQuery } from "../features/reading-materials/model/useReadingMaterialQueries";
import {
  type ReadingLevel,
  sourceTypeLabels,
  statusLabels,
  type ReadingMaterial,
  type ReadingMaterialStatus,
  type ReadingMaterialUpsertRequest,
  type ReadingSourceType,
  type ReadingTreeFilter,
  type ReadingTreeResponse,
  type ReadingTreeSection,
} from "../entities/reading-material";
import { ReadingMaterialTreePanel, type FolderDialogState } from "../features/reading-materials/ui/ReadingMaterialTreePanel";
import {
  createReadingFolder,
  createReadingMaterial,
  deleteReadingFolder,
  fetchReadingMaterials,
  renameReadingFolder,
  reorderReadingFolders,
  updateReadingMaterial,
} from "../entities/reading-material/api/readingMaterialApi";

const appVersion = "0.1.16";

type ConnectionStatus = "checking" | "online" | "offline";
type StudyQueueKey = "today" | "week" | "month";
type StudyQueueState = Record<StudyQueueKey, string[]>;

const studyQueueStorageKey = "falcon-reading-study-queues";
const studyQueueTabs: Array<{ key: StudyQueueKey; label: string; description: string }> = [
  { key: "today", label: "오늘의 학습", description: "지금 바로 읽을 자료" },
  { key: "week", label: "이주의 학습", description: "이번 주 후보 자료" },
  { key: "month", label: "이달의 학습", description: "장기 학습 풀" },
];

const emptyStudyQueues: StudyQueueState = {
  today: [],
  week: [],
  month: [],
};

function loadStudyQueues(): StudyQueueState {
  if (typeof window === "undefined") return emptyStudyQueues;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(studyQueueStorageKey) ?? "{}") as Partial<StudyQueueState>;
    return {
      today: Array.isArray(parsed.today) ? parsed.today : [],
      week: Array.isArray(parsed.week) ? parsed.week : [],
      month: Array.isArray(parsed.month) ? parsed.month : [],
    };
  } catch {
    return emptyStudyQueues;
  }
}

function addMaterialsToStudyQueue(queue: StudyQueueKey, materialIds: string[]) {
  const queues = loadStudyQueues();
  const nextIds = [...queues[queue]];
  for (const materialId of materialIds) {
    if (!nextIds.includes(materialId)) nextIds.push(materialId);
  }
  const nextQueues = {
    ...queues,
    [queue]: nextIds,
  };
  window.localStorage.setItem(studyQueueStorageKey, JSON.stringify(nextQueues));
  return nextQueues;
}

function buildFolderNodes(tree: ReadingTreeResponse, parentId: number | null, depth = 0): ReadingTreeSection["nodes"] {
  return tree.folders
    .filter((folder) => folder.parentId === parentId)
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .flatMap((folder) => {
      const filter: ReadingTreeFilter = { kind: "folder", folderId: folder.id };
      return [
        {
          id: `folder:${folder.id}`,
          label: folder.name,
          count: folder.materialCount,
          depth,
          parentFolderId: folder.parentId,
          filter,
        },
        ...buildFolderNodes(tree, folder.id, depth + 1),
      ];
    });
}

function buildTreeSections(tree: ReadingTreeResponse): ReadingTreeSection[] {
  return [
    {
      id: "library",
      label: "내 폴더",
      nodes: buildFolderNodes(tree, null),
    },
    {
      id: "dates",
      label: "날짜별",
      nodes: tree.dates.map((date) => ({
        id: `date:${date.key}`,
        label: date.label,
        count: date.count,
        filter: { kind: "date", date: date.key },
      })),
    },
    {
      id: "types",
      label: "유형별",
      nodes: tree.sourceTypes.map((sourceType) => ({
        id: `source:${sourceType.key}`,
        label: sourceType.label,
        count: sourceType.count,
        filter: { kind: "sourceType", sourceType: sourceType.key as ReadingSourceType },
      })),
    },
    {
      id: "status",
      label: "상태별",
      nodes: tree.statuses.map((status) => ({
        id: `status:${status.key}`,
        label: status.label,
        count: status.count,
        filter: { kind: "status", status: status.key as ReadingMaterialStatus },
      })),
    },
  ];
}

function visibleNodesForSection(section: ReadingTreeSection, collapsedFolders: Set<number>) {
  if (section.id !== "library") return section.nodes;
  const folderNodeById = new Map<number, ReadingTreeSection["nodes"][number]>();
  for (const node of section.nodes) {
    if (node.filter.kind === "folder") folderNodeById.set(node.filter.folderId, node);
  }

  const hasCollapsedAncestor = (node: ReadingTreeSection["nodes"][number]) => {
    let parentId = node.parentFolderId;
    while (parentId !== null && parentId !== undefined) {
      if (collapsedFolders.has(parentId)) return true;
      parentId = folderNodeById.get(parentId)?.parentFolderId;
    }
    return false;
  };

  return section.nodes.filter((node) => !hasCollapsedAncestor(node));
}

export function App() {
  const apiUrl = defaultApiUrl;
  const { token, user, setToken, setRefreshToken, setUser } = useAuthSession();
  const [activeMenu, setActiveMenu] = useState<WebMenuId>("readingMaterials");
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("checking");
  const isLoggedIn = token.trim().length > 0 && user !== null;
  const activeWebMenu = useMemo(
    () => [...WEB_HEADER_MENUS, PROFILE_MENU, SETTINGS_MENU].find((menu) => menu.id === activeMenu) ?? WEB_HEADER_MENUS[0],
    [activeMenu]
  );
  const canAccessActiveMenu = canAccessMenu(user, activeMenu);

  useEffect(() => {
    const clearExpiredSession = () => {
      setToken("");
      setRefreshToken("");
      setUser(null);
      setActiveMenu("readingMaterials");
    };
    window.addEventListener(unauthorizedEventName, clearExpiredSession);
    return () => window.removeEventListener(unauthorizedEventName, clearExpiredSession);
  }, [setRefreshToken, setToken, setUser]);

  useEffect(() => {
    let cancelled = false;
    setConnectionStatus("checking");
    void fetch(`${apiUrl}/actuator/health`)
      .then((response) => {
        if (!cancelled) setConnectionStatus(response.ok ? "online" : "offline");
      })
      .catch(() => {
        if (!cancelled) setConnectionStatus("offline");
      });
    return () => {
      cancelled = true;
    };
  }, [apiUrl]);

  const handleLogin = async (email: string, password: string) => {
    const data = await login(apiUrl, email, password);
    setToken(data.accessToken);
    setRefreshToken(data.refreshToken);
    setUser(data.user);
    setActiveMenu("readingMaterials");
  };

  const handleSignup = async (email: string, username: string, password: string) => {
    await signup(apiUrl, email, username, password);
  };

  const handleLogout = async () => {
    await logout(apiUrl, token);
    setToken("");
    setRefreshToken("");
    setUser(null);
    setActiveMenu("readingMaterials");
  };

  const openMenu = (menu: WebMenuId) => {
    if (!canAccessMenu(user, menu)) return;
    setActiveMenu(menu);
  };

  if (!isLoggedIn) {
    return <LoginScreen onLogin={handleLogin} onSignup={handleSignup} />;
  }

  return (
    <main className="app-shell">
      <AppSidebar
        menus={WEB_HEADER_MENUS}
        activeMenu={activeMenu}
        activeWebMenu={activeWebMenu}
        user={user}
        connectionStatus={connectionStatus}
        appVersion={appVersion}
        onOpenMenu={openMenu}
        onLogout={() => void handleLogout()}
      />

      <div className="app-content">
        <AppTopbar activeMenu={activeMenu} activeWebMenu={activeWebMenu} />
        {canAccessActiveMenu ? (
          <FalconWorkspace activeMenu={activeMenu} userName={user.username || user.email} apiUrl={apiUrl} token={token} />
        ) : (
          <ForbiddenView menu={activeWebMenu} />
        )}
      </div>
    </main>
  );
}

function FalconWorkspace({ activeMenu, userName, apiUrl, token }: { activeMenu: WebMenuId; userName: string; apiUrl: string; token: string }) {
  if (activeMenu === "readingMaterials") return <ReadingMaterialsView apiUrl={apiUrl} token={token} />;
  if (activeMenu === "readingStudy") return <ReadingStudyView apiUrl={apiUrl} token={token} />;
  if (activeMenu === "profile") return <ProfileView userName={userName} />;
  if (activeMenu === "settings") return <SettingsView />;
  return <ReadingMaterialsView apiUrl={apiUrl} token={token} />;
}

const emptyForm: ReadingMaterialUpsertRequest = {
  folderId: null,
  title: "",
  sourceType: "OFFICIAL_DOCS",
  level: "B2",
  status: "RAW",
  sourceUrl: "",
  originalText: "",
  collectedDate: new Date().toISOString().slice(0, 10),
};

function formFromMaterial(material: ReadingMaterial): ReadingMaterialUpsertRequest {
  return {
    folderId: material.folderId,
    title: material.title,
    sourceType: material.sourceType,
    level: material.level,
    status: material.status,
    sourceUrl: material.sourceUrl ?? "",
    originalText: material.originalText,
    collectedDate: material.collectedDate,
  };
}

function ReadingMaterialsView({ apiUrl, token }: { apiUrl: string; token: string }) {
  const [todayQueueIds, setTodayQueueIds] = useState<Set<string>>(() => new Set(loadStudyQueues().today));
  const [selectedMaterialIds, setSelectedMaterialIds] = useState<Set<string>>(() => new Set());
  const [moveTargetFolderId, setMoveTargetFolderId] = useState("");
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [activeTreeId, setActiveTreeId] = useState("all");
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(() => new Set());
  const [collapsedFolders, setCollapsedFolders] = useState<Set<number>>(() => new Set());
  const [selectedMaterialId, setSelectedMaterialId] = useState<string | null>(null);
  const [form, setForm] = useState<ReadingMaterialUpsertRequest>(emptyForm);
  const [folderDraftName, setFolderDraftName] = useState("");
  const [materialDialogOpen, setMaterialDialogOpen] = useState(false);
  const [folderDialog, setFolderDialog] = useState<FolderDialogState | null>(null);
  const [folderManagementOpen, setFolderManagementOpen] = useState(false);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [savingFolder, setSavingFolder] = useState(false);
  const [deletingFolder, setDeletingFolder] = useState(false);
  const [refreshingTree, setRefreshingTree] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [movingMaterials, setMovingMaterials] = useState(false);
  const treeQuery = useReadingTreeQuery(apiUrl, token);
  const tree = treeQuery.data ?? null;
  const treeSections = useMemo(() => (tree ? buildTreeSections(tree) : []), [tree]);
  const moveFolderNodes = useMemo(
    () => treeSections.find((section) => section.id === "library")?.nodes.filter((node) => node.filter.kind === "folder") ?? [],
    [treeSections]
  );
  const visibleTreeSections = useMemo(
    () => treeSections.map((section) => ({
      ...section,
      nodes: collapsedSections.has(section.id) ? [] : visibleNodesForSection(section, collapsedFolders),
    })),
    [collapsedFolders, collapsedSections, treeSections]
  );
  const activeNode = treeSections.flatMap((section) => section.nodes).find((node) => node.id === activeTreeId);
  const activeFilter = activeNode?.filter ?? { kind: "all" as const };
  const activeTreeLabel = activeNode?.label ?? "전체 자료";
  const activeFolderId = activeNode?.filter.kind === "folder" ? activeNode.filter.folderId : null;
  const materialsQuery = useReadingMaterialsQuery(apiUrl, token, activeFilter);
  const materials = materialsQuery.data ?? [];
  const invalidateReadingMaterials = useInvalidateReadingMaterials(apiUrl);
  const queryError = treeQuery.error ?? materialsQuery.error;
  const visibleError = error || (queryError instanceof Error ? queryError.message : "");
  const selectedMaterials = useMemo(
    () => materials.filter((material) => selectedMaterialIds.has(material.id)),
    [materials, selectedMaterialIds]
  );
  const selectedSourceFolderId = useMemo(() => {
    const folderIds = new Set(selectedMaterials.map((material) => material.folderId).filter((folderId): folderId is number => folderId !== null));
    return folderIds.size === 1 ? [...folderIds][0] : null;
  }, [selectedMaterials]);
  const childFolders = useMemo(
    () =>
      activeFolderId === null
        ? []
        : (tree?.folders ?? [])
            .filter((folder) => folder.parentId === activeFolderId)
            .sort((a, b) => a.displayOrder - b.displayOrder || a.id - b.id),
    [activeFolderId, tree?.folders]
  );
  const folderOptions = useMemo(
    () => [
      { value: "", label: "폴더 선택 필요" },
      ...(tree?.folders ?? []).map((folder) => ({
        value: String(folder.id),
        label: folder.name,
      })),
    ],
    [tree?.folders]
  );

  const refreshReadingWorkspace = async () => {
    setRefreshingTree(true);
    setError("");
    try {
      await Promise.all([treeQuery.refetch(), materialsQuery.refetch()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "자료 트리를 새로고침하지 못했습니다.");
    } finally {
      setRefreshingTree(false);
    }
  };

  useEffect(() => {
    const nextMaterial = selectedMaterialId ? materials.find((material) => material.id === selectedMaterialId) : materials[0];
    if (nextMaterial) {
      setSelectedMaterialId(nextMaterial.id);
      setForm(formFromMaterial(nextMaterial));
      return;
    }
    setSelectedMaterialId(null);
    setForm(emptyForm);
  }, [materials, selectedMaterialId]);

  const selectTreeNode = (nodeId: string, _filter: ReadingTreeFilter) => {
    setActiveTreeId(nodeId);
    setSelectedMaterialIds(new Set());
    setMoveTargetFolderId("");
    setError("");
  };

  const selectFolder = (folderId: number) => {
    selectTreeNode(`folder:${folderId}`, { kind: "folder", folderId });
  };

  const toggleSection = (sectionId: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  };

  const toggleFolder = (folderId: number) => {
    setCollapsedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      return next;
    });
  };

  const openCreateRootFolder = () => {
    setFolderDialog({
      mode: "create",
      folderId: null,
      parentId: null,
      name: "루트 폴더",
    });
    setFolderDraftName("");
  };

  const openCreateChildFolder = (node: ReadingTreeSection["nodes"][number]) => {
    if (node.filter.kind !== "folder") return;
    setFolderDialog({
      mode: "create",
      folderId: null,
      parentId: node.filter.folderId,
      name: `${node.label} 하위 폴더`,
    });
    setFolderDraftName("");
  };

  const openEditFolder = (node: ReadingTreeSection["nodes"][number]) => {
    if (node.filter.kind !== "folder") return;
    setFolderDialog({
      mode: "edit",
      folderId: node.filter.folderId,
      parentId: node.parentFolderId ?? null,
      name: node.label,
    });
    setFolderDraftName(node.label);
  };

  const closeFolderDialog = () => {
    setFolderDialog(null);
    setFolderDraftName("");
  };

  const selectMaterial = (material: ReadingMaterial) => {
    setSelectedMaterialId(material.id);
    setForm(formFromMaterial(material));
    setMaterialDialogOpen(true);
  };

  const toggleMaterialSelection = (materialId: string) => {
    setSelectedMaterialIds((prev) => {
      const next = new Set(prev);
      if (next.has(materialId)) next.delete(materialId);
      else next.add(materialId);
      return next;
    });
  };

  const assignSelectedTodayStudy = () => {
    if (selectedMaterialIds.size === 0) return;
    const nextQueues = addMaterialsToStudyQueue("today", Array.from(selectedMaterialIds));
    setTodayQueueIds(new Set(nextQueues.today));
    setSelectedMaterialIds(new Set());
  };

  const moveSelectedMaterials = async () => {
    if (selectedMaterialIds.size === 0 || !moveTargetFolderId) return;
    const targetFolderId = Number(moveTargetFolderId);
    if (!Number.isFinite(targetFolderId)) return;
    if (selectedSourceFolderId === targetFolderId) return;
    if (selectedMaterials.length === 0) return;
    setMovingMaterials(true);
    setError("");
    try {
      await Promise.all(
        selectedMaterials.map((material) =>
          updateReadingMaterial(apiUrl, token, material.id, {
            ...formFromMaterial(material),
            folderId: targetFolderId,
          })
        )
      );
      setSelectedMaterialIds(new Set());
      setMoveTargetFolderId("");
      setMoveDialogOpen(false);
      await invalidateReadingMaterials();
    } catch (err) {
      setError(err instanceof Error ? err.message : "자료 이동에 실패했습니다.");
    } finally {
      setMovingMaterials(false);
    }
  };

  const startNewMaterial = () => {
    const targetFolderId = activeFolderId ?? tree?.folders[0]?.id ?? null;
    if (targetFolderId === null) {
      setError("먼저 왼쪽 자료 트리에서 폴더를 추가하세요.");
      return;
    }
    setSelectedMaterialId(null);
    setForm({
      ...emptyForm,
      folderId: targetFolderId,
    });
    setMaterialDialogOpen(true);
  };

  const saveFolder = async () => {
    if (!folderDialog) return;
    const name = folderDraftName.trim();
    if (!name) {
      setError("폴더 이름을 입력하세요.");
      return;
    }
    setError("");
    if (folderDialog.mode === "create") {
      setCreatingFolder(true);
      try {
        const folder = await createReadingFolder(apiUrl, token, {
          name,
          parentId: folderDialog.parentId,
        });
        closeFolderDialog();
        setActiveTreeId(`folder:${folder.id}`);
        setForm((prev) => ({ ...prev, folderId: folder.id }));
        await invalidateReadingMaterials();
      } catch (err) {
        setError(err instanceof Error ? err.message : "폴더 생성에 실패했습니다.");
      } finally {
        setCreatingFolder(false);
      }
      return;
    }

    if (folderDialog.folderId === null) return;
    setSavingFolder(true);
    try {
      await renameReadingFolder(apiUrl, token, folderDialog.folderId, { name });
      await invalidateReadingMaterials();
      closeFolderDialog();
    } catch (err) {
      setError(err instanceof Error ? err.message : "폴더 수정에 실패했습니다.");
    } finally {
      setSavingFolder(false);
    }
  };

  const deleteFolder = async (node?: ReadingTreeSection["nodes"][number]) => {
    const folderId = node?.filter.kind === "folder" ? node.filter.folderId : folderDialog?.folderId;
    if (!folderId) return;
    setDeletingFolder(true);
    setError("");
    try {
      await deleteReadingFolder(apiUrl, token, folderId);
      await invalidateReadingMaterials();
      if (activeTreeId === `folder:${folderId}`) {
        setActiveTreeId("all");
      }
      closeFolderDialog();
    } catch (err) {
      setError(err instanceof Error ? err.message : "폴더 삭제에 실패했습니다.");
    } finally {
      setDeletingFolder(false);
    }
  };

  const reorderFolder = async (activeFolderId: number, overFolderId: number) => {
    if (!tree) return;
    const target = tree.folders.find((folder) => folder.id === activeFolderId);
    const over = tree.folders.find((folder) => folder.id === overFolderId);
    if (!target || !over || target.parentId !== over.parentId) {
      setError("같은 부모 폴더 안에서만 순서를 바꿀 수 있습니다.");
      return;
    }
    const siblings = tree.folders
      .filter((folder) => folder.parentId === target.parentId)
      .sort((a, b) => a.displayOrder - b.displayOrder || a.id - b.id);
    const currentIndex = siblings.findIndex((folder) => folder.id === target.id);
    const nextIndex = siblings.findIndex((folder) => folder.id === over.id);
    if (!target) return;
    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= siblings.length) return;
    const reordered = [...siblings];
    const [moved] = reordered.splice(currentIndex, 1);
    reordered.splice(nextIndex, 0, moved);
    setError("");
    try {
      await reorderReadingFolders(apiUrl, token, {
        parentId: target.parentId,
        orderedIds: reordered.map((folder) => folder.id),
      });
      await invalidateReadingMaterials();
    } catch (err) {
      setError(err instanceof Error ? err.message : "폴더 순서 변경에 실패했습니다.");
    }
  };

  const saveMaterial = async () => {
    if (form.folderId === null) {
      setError("자료를 저장할 폴더를 먼저 선택하거나 추가하세요.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const saved = selectedMaterialId
        ? await updateReadingMaterial(apiUrl, token, selectedMaterialId, form)
        : await createReadingMaterial(apiUrl, token, form);
      setSelectedMaterialId(saved.id);
      setForm(formFromMaterial(saved));
      setMaterialDialogOpen(false);
      await invalidateReadingMaterials();
    } catch (err) {
      setError(err instanceof Error ? err.message : "독해 자료 저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="falcon-view">
      <div className="falcon-inner">
        <header className="falcon-page-head">
          <div>
            <h1>독해 자료</h1>
            <p>원문을 수집하고 출처, 난이도, 분석 결과를 함께 관리합니다.</p>
          </div>
        </header>

        {visibleError ? <div className="material-error">{visibleError}</div> : null}

        <div className="material-workbench">
          <ReadingMaterialTreePanel
            sections={visibleTreeSections}
            activeTreeId={activeTreeId}
            collapsedSections={collapsedSections}
            collapsedFolders={collapsedFolders}
            folderDialog={folderDialog}
            folderManagementOpen={folderManagementOpen}
            folderDraftName={folderDraftName}
            creatingFolder={creatingFolder}
            savingFolder={savingFolder}
            deletingFolder={deletingFolder}
            refreshing={refreshingTree}
            onOpenCreateRoot={openCreateRootFolder}
            onRefresh={() => void refreshReadingWorkspace()}
            onOpenCreateChild={openCreateChildFolder}
            onOpenEditFolder={openEditFolder}
            onOpenFolderManagement={() => setFolderManagementOpen(true)}
            onCloseFolderManagement={() => setFolderManagementOpen(false)}
            onCloseFolderDialog={closeFolderDialog}
            onSelect={selectTreeNode}
            onToggleSection={toggleSection}
            onToggleFolder={toggleFolder}
            onChangeFolderDraftName={setFolderDraftName}
            onSaveFolder={() => void saveFolder()}
            onDeleteFolder={(node) => void deleteFolder(node)}
            onReorderFolder={(activeFolderId, overFolderId) => void reorderFolder(activeFolderId, overFolderId)}
          />

          <main className="material-editor-panel">
            <div className="editor-section-title">
              <div>
                <span>자료 관리</span>
                <h2>{activeTreeLabel}</h2>
              </div>
              <Button type="button" onClick={startNewMaterial}><Plus size={16} /> 자료 추가</Button>
            </div>

            {activeFolderId !== null ? (
              <div className="material-folder-section">
                <div className="material-inline-head">
                  <strong>하위 폴더</strong>
                  <span>{childFolders.length}</span>
                </div>
                {childFolders.length === 0 ? <div className="material-empty">이 폴더에 하위 폴더가 없습니다.</div> : null}
                {childFolders.length > 0 ? (
                  <div className="material-folder-grid">
                    {childFolders.map((folder) => (
                      <button key={folder.id} type="button" className="material-folder-card" onClick={() => selectFolder(folder.id)}>
                        <span>
                          <Folder size={17} />
                        </span>
                        <strong>{folder.name}</strong>
                        <small>{folder.materialCount}개 자료</small>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="material-inline-list">
              <div className="material-inline-head">
                <strong>
                  {activeFolderId === null ? "독해 자료" : "이 폴더의 독해 자료"}
                  <span>{materials.length}</span>
                </strong>
                <div className="material-inline-head-actions">
                  <Button
                    type="button"
                    className="material-move-button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setMoveTargetFolderId("");
                      setMoveDialogOpen(true);
                    }}
                    disabled={selectedMaterialIds.size === 0 || movingMaterials}
                  >
                    폴더 이동
                  </Button>
                  <Button
                    type="button"
                    className="material-bulk-assign"
                    variant={selectedMaterialIds.size > 0 ? "default" : "outline"}
                    size="sm"
                    onClick={assignSelectedTodayStudy}
                    disabled={selectedMaterialIds.size === 0}
                  >
                    오늘의 학습{selectedMaterialIds.size > 0 ? ` ${selectedMaterialIds.size}` : ""}
                  </Button>
                </div>
              </div>
              {materials.length === 0 ? <div className="material-empty">선택한 트리에 저장된 자료가 없습니다.</div> : null}
              {materials.map((material) => (
                <MaterialCard
                  key={material.id}
                  material={material}
                  active={material.id === selectedMaterialId}
                  assignedToday={todayQueueIds.has(material.id)}
                  checked={selectedMaterialIds.has(material.id)}
                  onSelect={() => selectMaterial(material)}
                  onToggleSelection={() => toggleMaterialSelection(material.id)}
                />
              ))}
            </div>
          </main>
        </div>
        {moveDialogOpen ? (
          <MoveMaterialsDialog
            folders={moveFolderNodes}
            selectedCount={selectedMaterialIds.size}
            currentFolderId={selectedSourceFolderId}
            targetFolderId={moveTargetFolderId}
            moving={movingMaterials}
            onChangeTarget={setMoveTargetFolderId}
            onClose={() => {
              if (movingMaterials) return;
              setMoveDialogOpen(false);
              setMoveTargetFolderId("");
            }}
            onConfirm={() => void moveSelectedMaterials()}
          />
        ) : null}
        {materialDialogOpen ? (
          <div
            className="material-dialog-backdrop fixed inset-0 z-[80] grid place-items-center bg-slate-950/30 p-8"
            onClick={() => setMaterialDialogOpen(false)}
          >
            <div
              className="material-dialog grid max-h-[calc(100vh-96px)] w-[min(920px,calc(100vw-96px))] overflow-auto rounded-[10px] border border-zinc-200 bg-white p-[18px] shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="editor-section-title">
                <div>
                  <span>{selectedMaterialId ? "Saved Material" : "New Material"}</span>
                  <h2>{selectedMaterialId ? "독해 자료 수정" : "새 독해 자료 등록"}</h2>
                </div>
                <strong>{statusLabels[form.status]}</strong>
              </div>
              <div className="material-form-grid">
                <label>
                  제목
                  <input value={form.title} onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))} />
                </label>
                <div className="material-field">
                  자료 유형
                  <Select
                    ariaLabel="자료 유형"
                    value={form.sourceType}
                    options={[
                      { value: "OFFICIAL_DOCS", label: "공식 문서" },
                      { value: "ARTICLE", label: "기사" },
                      { value: "BOOK", label: "원서" },
                      { value: "EXAM_PASSAGE", label: "시험 지문" },
                    ]}
                    onChange={(sourceType) => setForm((prev) => ({ ...prev, sourceType }))}
                  />
                </div>
                <div className="material-field">
                  난이도
                  <Select
                    ariaLabel="난이도"
                    value={form.level}
                    options={[
                      { value: "B1", label: "B1" },
                      { value: "B2", label: "B2" },
                      { value: "C1", label: "C1" },
                    ]}
                    onChange={(level) => setForm((prev) => ({ ...prev, level: level as ReadingLevel }))}
                  />
                </div>
                <label>
                  저장 날짜
                  <input value={form.collectedDate} onChange={(event) => setForm((prev) => ({ ...prev, collectedDate: event.target.value }))} />
                </label>
                <div className="material-field">
                  저장 폴더
                  <Select
                    ariaLabel="저장 폴더"
                    value={form.folderId === null ? "" : String(form.folderId)}
                    options={folderOptions}
                    onChange={(folderId) => setForm((prev) => ({ ...prev, folderId: folderId ? Number(folderId) : null }))}
                  />
                </div>
                <div className="material-field">
                  상태
                  <Select
                    ariaLabel="상태"
                    value={form.status}
                    options={[
                      { value: "RAW", label: "원문 저장" },
                      { value: "ANALYSIS_PENDING", label: "분석 대기" },
                      { value: "READY", label: "학습 가능" },
                    ]}
                    onChange={(status) => setForm((prev) => ({ ...prev, status }))}
                  />
                </div>
                <label className="wide">
                  출처 URL
                  <div className="url-input">
                    <Link size={16} />
                    <input value={form.sourceUrl} onChange={(event) => setForm((prev) => ({ ...prev, sourceUrl: event.target.value }))} />
                  </div>
                </label>
                <label className="wide">
                  원문
                  <textarea value={form.originalText} onChange={(event) => setForm((prev) => ({ ...prev, originalText: event.target.value }))} />
                </label>
              </div>
              <div className="material-dialog-actions">
                <Button variant="outline" type="button" onClick={() => setMaterialDialogOpen(false)}>닫기</Button>
                <Button type="button" onClick={() => void saveMaterial()} disabled={saving}>
                  <Save size={16} /> {saving ? "저장 중" : "저장"}
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function MoveMaterialsDialog({
  folders,
  selectedCount,
  currentFolderId,
  targetFolderId,
  moving,
  onChangeTarget,
  onClose,
  onConfirm,
}: {
  folders: ReadingTreeSection["nodes"];
  selectedCount: number;
  currentFolderId: number | null;
  targetFolderId: string;
  moving: boolean;
  onChangeTarget: (folderId: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="material-dialog-backdrop folder-dialog-backdrop" onClick={onClose}>
      <section className="material-move-dialog" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <div className="folder-dialog-head">
          <div>
            <span>Move Materials</span>
            <h2>폴더 이동</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="닫기" disabled={moving}>
            <X size={18} />
          </button>
        </div>
        <p className="material-move-summary">선택한 독해 자료 {selectedCount}개를 이동할 폴더를 선택하세요.</p>
        <div className="material-move-folder-list">
          {folders.map((node) => {
            if (node.filter.kind !== "folder") return null;
            const value = String(node.filter.folderId);
            const current = currentFolderId === node.filter.folderId;
            const selected = targetFolderId === value;
            return (
              <button
                key={node.id}
                type="button"
                className={`material-move-folder ${selected ? "selected" : ""} ${current ? "current" : ""}`}
                style={{ paddingLeft: `${12 + (node.depth ?? 0) * 18}px` }}
                disabled={current}
                onClick={() => onChangeTarget(value)}
              >
                <Folder size={16} />
                <span>{node.label}</span>
                {current ? <strong>현재</strong> : null}
                <em>{node.count}</em>
              </button>
            );
          })}
        </div>
        <div className="folder-dialog-actions">
          <Button type="button" variant="outline" onClick={onClose} disabled={moving}>
            취소
          </Button>
          <Button type="button" onClick={onConfirm} disabled={!targetFolderId || moving || targetFolderId === String(currentFolderId)}>
            {moving ? "이동 중" : "이동"}
          </Button>
        </div>
      </section>
    </div>
  );
}

function MaterialCard({
  material,
  active,
  assignedToday,
  checked,
  onSelect,
  onToggleSelection,
}: {
  material: ReadingMaterial;
  active: boolean;
  assignedToday: boolean;
  checked: boolean;
  onSelect: () => void;
  onToggleSelection: () => void;
}) {
  return (
    <article className={`material-card ${active ? "active" : ""}`}>
      <label className={`material-card-check ${assignedToday ? "assigned" : ""}`}>
        <input type="checkbox" checked={checked} onChange={onToggleSelection} />
        <span>{checked ? "선택됨" : "선택"}</span>
      </label>
      <button className="material-card-open" type="button" onClick={onSelect}>
        <strong>{material.title}</strong>
        <span>{sourceTypeLabels[material.sourceType]} · {material.level}</span>
        <small>{material.wordCount} words · {material.estimatedMinutes}분 · {material.collectedDate}</small>
        {assignedToday ? <small>오늘의 학습 지정됨</small> : null}
        <MaterialStatus status={material.status} />
      </button>
    </article>
  );
}

function MaterialStatus({ status }: { status: ReadingMaterial["status"] }) {
  return <em className={`material-status ${status === "READY" ? "ready" : status === "ANALYSIS_PENDING" ? "pending" : "raw"}`}>{statusLabels[status]}</em>;
}

function ReadingStudyView({ apiUrl, token }: { apiUrl: string; token: string }) {
  const [materials, setMaterials] = useState<ReadingMaterial[]>([]);
  const [queues, setQueues] = useState<StudyQueueState>(() => loadStudyQueues());
  const [activeQueue, setActiveQueue] = useState<StudyQueueKey>("today");
  const [selectedMaterialId, setSelectedMaterialId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const materialById = useMemo(() => new Map(materials.map((material) => [material.id, material])), [materials]);
  const queueMaterials = useMemo(
    () => queues[activeQueue].map((materialId) => materialById.get(materialId)).filter((material): material is ReadingMaterial => Boolean(material)),
    [activeQueue, materialById, queues]
  );
  const selectedMaterial = queueMaterials.find((material) => material.id === selectedMaterialId) ?? queueMaterials[0] ?? null;
  const previewSentences = useMemo(() => {
    if (!selectedMaterial) return [];
    return selectedMaterial.originalText
      .split(/(?<=[.!?])\s+/)
      .map((sentence) => sentence.trim())
      .filter(Boolean)
      .slice(0, 5);
  }, [selectedMaterial]);
  const activeQueueMeta = studyQueueTabs.find((tab) => tab.key === activeQueue) ?? studyQueueTabs[0];

  useEffect(() => {
    let cancelled = false;
    setError("");
    void fetchReadingMaterials(apiUrl, token)
      .then((items) => {
        if (cancelled) return;
        setMaterials(items);
        const storedQueues = loadStudyQueues();
        setQueues(storedQueues);
        const firstQueuedId = storedQueues.today[0] ?? storedQueues.week[0] ?? storedQueues.month[0] ?? null;
        setSelectedMaterialId(firstQueuedId);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "학습 자료를 불러오지 못했습니다.");
      });
    return () => {
      cancelled = true;
    };
  }, [apiUrl, token]);

  useEffect(() => {
    if (materials.length === 0) return;
    const validIds = new Set(materials.map((material) => material.id));
    setQueues((prev) => ({
      today: prev.today.filter((materialId) => validIds.has(materialId)),
      week: prev.week.filter((materialId) => validIds.has(materialId)),
      month: prev.month.filter((materialId) => validIds.has(materialId)),
    }));
  }, [materials]);

  useEffect(() => {
    window.localStorage.setItem(studyQueueStorageKey, JSON.stringify(queues));
  }, [queues]);

  const removeFromQueue = (queue: StudyQueueKey, materialId: string) => {
    setQueues((prev) => ({
      ...prev,
      [queue]: prev[queue].filter((queuedId) => queuedId !== materialId),
    }));
    if (selectedMaterialId === materialId) {
      const nextId = queues[queue].find((queuedId) => queuedId !== materialId) ?? null;
      setSelectedMaterialId(nextId);
    }
  };

  return (
    <section className="falcon-view">
      <div className="falcon-inner">
        <header className="falcon-page-head">
          <div>
            <h1>독해 학습</h1>
            <p>전체 자료 중에서 오늘, 이번 주, 이번 달에 볼 학습 큐를 만들고 순서대로 진행합니다.</p>
          </div>
          <Tabs
            className="justify-self-end"
            value={activeQueue}
            onValueChange={(value) => {
              const queue = value as StudyQueueKey;
              setActiveQueue(queue);
              setSelectedMaterialId(queues[queue][0] ?? null);
            }}
          >
            <TabsList>
              {studyQueueTabs.map((tab) => (
                <TabsTrigger key={tab.key} value={tab.key} className="gap-2">
                  {tab.label}
                  <Badge variant={activeQueue === tab.key ? "outline" : "secondary"}>{queues[tab.key].length}</Badge>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </header>

        {error ? <div className="material-error">{error}</div> : null}

        <div className="reading-study-layout">
          <Card className="reading-study-list">
            <CardHeader className="grid-cols-[minmax(0,1fr)_auto] items-start p-0">
              <div>
                <CardTitle>{activeQueueMeta.label}</CardTitle>
                <CardDescription>{activeQueueMeta.description}</CardDescription>
              </div>
              <Badge variant="outline">{queueMaterials.length}</Badge>
            </CardHeader>
            {queueMaterials.length === 0 ? <div className="material-empty">독해 자료에서 자료를 선택해 {activeQueueMeta.label}으로 지정하세요.</div> : null}
            {queueMaterials.map((material, index) => (
              <div key={material.id} className={`reading-study-card ${selectedMaterial?.id === material.id ? "active" : ""}`}>
                <button type="button" onClick={() => setSelectedMaterialId(material.id)}>
                  <span>{index + 1}</span>
                  <strong>{material.title}</strong>
                  <small>{sourceTypeLabels[material.sourceType]} · {material.level} · {material.estimatedMinutes}분</small>
                </button>
                <Button type="button" variant="outline" size="sm" onClick={() => removeFromQueue(activeQueue, material.id)}>제외</Button>
              </div>
            ))}
          </Card>

          <Card className="reading-study-stage">
            {selectedMaterial ? (
              <>
                <div className="editor-section-title">
                  <div>
                    <span>Study Session</span>
                    <h2>{selectedMaterial.title}</h2>
                    <p>{sourceTypeLabels[selectedMaterial.sourceType]} · {selectedMaterial.level} · {selectedMaterial.estimatedMinutes}분</p>
                  </div>
                  <Button type="button">
                    <PlayCircle size={16} /> 학습 시작
                  </Button>
                </div>

                <Tabs defaultValue="reading">
                  <TabsList aria-label="학습 단계">
                    <TabsTrigger value="reading">본문</TabsTrigger>
                    <TabsTrigger value="sentences">문장 분석</TabsTrigger>
                    <TabsTrigger value="words">단어</TabsTrigger>
                    <TabsTrigger value="quiz">퀴즈</TabsTrigger>
                  </TabsList>

                  <TabsContent value="reading">
                    <article className="reading-study-reader">
                      <div className="reading-study-reader-head">
                        <strong>본문 읽기</strong>
                        <Badge variant={selectedMaterial.status === "READY" ? "success" : selectedMaterial.status === "ANALYSIS_PENDING" ? "warning" : "secondary"}>
                          {statusLabels[selectedMaterial.status]}
                        </Badge>
                      </div>
                      <p>{selectedMaterial.originalText}</p>
                    </article>
                  </TabsContent>
                  <TabsContent value="sentences">
                    <div className="reading-study-reader">
                      <div className="reading-study-reader-head">
                        <strong>문장 분석</strong>
                        <Badge variant="secondary">{previewSentences.length}</Badge>
                      </div>
                      {previewSentences.length === 0 ? <p>분석할 문장이 없습니다.</p> : null}
                      <ol>
                        {previewSentences.map((sentence) => (
                          <li key={sentence}>{sentence}</li>
                        ))}
                      </ol>
                    </div>
                  </TabsContent>
                  <TabsContent value="words">
                    <div className="material-empty">핵심 단어 추출 결과를 연결할 영역입니다.</div>
                  </TabsContent>
                  <TabsContent value="quiz">
                    <div className="material-empty">이해도 퀴즈를 연결할 영역입니다.</div>
                  </TabsContent>
                </Tabs>

                <section className="reading-study-support">
                  <div>
                    <strong>문장 단위 미리보기</strong>
                    {previewSentences.length === 0 ? <p>분석할 문장이 없습니다.</p> : null}
                    <ol>
                      {previewSentences.map((sentence) => (
                        <li key={sentence}>{sentence}</li>
                      ))}
                    </ol>
                  </div>
                  <div>
                    <strong>학습 흐름</strong>
                    <span>본문 읽기</span>
                    <span>문장 구조 확인</span>
                    <span>핵심 단어 복습</span>
                    <span>이해도 퀴즈</span>
                  </div>
                </section>
              </>
            ) : (
              <div className="material-empty">독해 자료에서 학습할 자료를 오늘의 학습으로 지정하세요.</div>
            )}
          </Card>
        </div>
      </div>
    </section>
  );
}

function ProfileView({ userName }: { userName: string }) {
  return (
    <SimpleGridView
      title="프로필"
      description={`${userName} 계정으로 Falcon Reading에 로그인되어 있습니다.`}
      items={["학습 서버 연결", "계정 정보", "개인 자료 보관함", "앱 버전 v0.1.16"]}
    />
  );
}

function SettingsView() {
  return (
    <SimpleGridView
      title="설정"
      description="자료 저장, AI 분석, 서버 연결 같은 앱 환경을 배치할 영역입니다."
      items={["기본 서버 http://localhost:3301", "자동 분석 OFF", "기본 난이도 B2", "출처 URL 저장 ON"]}
    />
  );
}

function SimpleGridView({ title, description, items }: { title: string; description: string; items: string[] }) {
  return (
    <section className="falcon-view">
      <div className="falcon-inner">
        <header className="falcon-page-head">
          <div>
            <h1>{title}</h1>
            <p>{description}</p>
          </div>
        </header>
        <div className="simple-card-grid">
          {items.map((item) => (
            <article className="simple-card" key={item}>
              <CheckCircle2 size={18} />
              <strong>{item}</strong>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function ForbiddenView({ menu }: { menu: WebMenu }) {
  const Icon = menu.icon;
  return (
    <section className="feature-placeholder">
      <div className="feature-placeholder-box">
        <div className="empty-icon warning">
          <CircleAlert size={26} />
        </div>
        <h1>{menu.label}</h1>
        <p>이 메뉴를 열 수 없습니다. 로그인 상태를 확인해주세요.</p>
        <span>
          <Icon size={15} />
          {menu.subtitle}
        </span>
      </div>
    </section>
  );
}
