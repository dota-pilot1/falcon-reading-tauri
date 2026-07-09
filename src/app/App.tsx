import { useMemo, useState, useEffect, type ReactNode } from "react";
import { AgGridReact } from "ag-grid-react";
import type { ColDef } from "ag-grid-community";
import {
  BookOpenCheck,
  CalendarDays,
  CheckSquare,
  ChevronDown,
  FileText,
  Folder,
  FolderOpen,
  Languages,
  Link,
  Loader2,
  Play,
  Plus,
  Save,
  Search,
  X,
} from "lucide-react";
import { defaultApiUrl, unauthorizedEventName } from "../shared/api/client";
import { Button } from "../shared/ui/Button";
import { Select } from "../shared/ui/Select";
import { DateInput } from "../shared/ui/DateInput";
import { Dialog, DialogContent } from "../shared/ui/Dialog";
import { Badge } from "../shared/ui/Badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../shared/ui/Tabs";
import { AppUpdatePanel } from "../shared/ui/AppUpdatePanel";
import { LoginScreen } from "../features/auth/login/LoginScreen";
import { login, logout, signup } from "../features/auth/api/authApi";
import { useAuthSession } from "../features/auth/model/useAuthSession";
import { AppSidebar } from "../widgets/app-shell/ui/AppSidebar";
import { AppTopbar } from "../widgets/app-shell/ui/AppTopbar";
import { ReadingMaterialTreePanel, type FolderDialogState } from "../features/reading-materials/ui/ReadingMaterialTreePanel";
import {
  createReadingFolder,
  createReadingMaterial,
  deleteReadingFolder,
  fetchReadingMaterials,
  replaceReadingMaterialVocabulary,
  renameReadingFolder,
  reorderReadingFolders,
  updateReadingMaterial,
} from "../entities/reading-material/api/readingMaterialApi";
import {
  readingLevelLabel,
  readingLevelLabels,
  sourceTypeLabels,
  statusLabels,
  type ReadingFolder,
  type ReadingMaterial,
  type ReadingMaterialStatus,
  type ReadingMaterialUpsertRequest,
  type ReadingSourceType,
  type ReadingTreeFilter,
  type ReadingTreeSection,
  type ReadingVocabularyItem,
  type ReadingVocabularyItemUpsertRequest,
} from "../entities/reading-material";
import { sendChat, translateToKorean } from "../entities/chat/api/chatApi";
import { WEB_HEADER_MENUS, PROFILE_MENU, SETTINGS_MENU, canAccessMenu, type WebMenu, type WebMenuId } from "./model/navigation";
import {
  useInvalidateReadingMaterials,
  useReadingMaterialVocabularyQuery,
  useReadingMaterialsQuery,
  useReadingTreeQuery,
  useReadingVocabularyQuery,
} from "../features/reading-materials/model/useReadingMaterialQueries";
import { useAppUpdate } from "../shared/lib/useAppUpdate";

type ConnectionStatus = "checking" | "online" | "offline";
type AppUpdateControls = ReturnType<typeof useAppUpdate>;
type SentenceAnalysis = {
  chunks: string[];
  grammar: string[];
  raw?: string;
};

type SyntaxDialogState = {
  sentenceIndex: number;
  sentence: string;
  analysis?: SentenceAnalysis;
  error?: string;
};

type VocabularyEntry = {
  id?: number | null;
  word: string;
  meaning: string;
  note: string;
};

type VocabularyFilter =
  | { kind: "all" }
  | { kind: "material"; materialId: string }
  | { kind: "folder"; folderId: number }
  | { kind: "date"; date: string }
  | { kind: "sourceType"; sourceType: ReadingSourceType }
  | { kind: "status"; status: "missingMeaning" | "hasNote" | "duplicate" };

type VocabularyGridRow = ReadingVocabularyItem & {
  folderId: number | null;
  folderName: string;
  sourceType: ReadingSourceType | null;
  level: ReadingMaterial["level"] | null;
  materialStatus: ReadingMaterialStatus | null;
  collectedDate: string;
  duplicateCount: number;
};

type VocabularyFilterNode = {
  id: string;
  label: string;
  count: number;
  depth?: number;
  parentFolderId?: number | null;
  filter: VocabularyFilter;
};

type VocabularyFilterSection = {
  id: string;
  label: string;
  nodes: VocabularyFilterNode[];
};

const LEARNING_QUEUE_KEY = "falcon-reading:learning-queue";
const appVersion = "0.1.19";
const fallbackUser = {
  id: 0,
  email: "local@falcon.reading",
  username: "오현",
  role: { id: 1, code: "ROLE_ADMIN", name: "관리자" },
  permissions: [],
};

const emptyForm: ReadingMaterialUpsertRequest = {
  folderId: null,
  title: "",
  sourceType: "TEXTBOOK_PASSAGE",
  level: "HIGH",
  status: "RAW",
  sourceUrl: "",
  originalText: "",
  translationText: "",
  chunkAnalysisText: "",
  grammarAnalysisText: "",
  keyExpressionText: "",
  sentenceAnalysisText: "",
  collectedDate: new Date().toISOString().slice(0, 10),
};

const sourceTypeOptions = Object.entries(sourceTypeLabels).map(([value, label]) => ({
  value: value as ReadingSourceType,
  label,
}));

const readingLevelOptions = Object.entries(readingLevelLabels).map(([value, label]) => ({
  value: value as ReadingMaterialUpsertRequest["level"],
  label,
}));

const statusOptions = Object.entries(statusLabels).map(([value, label]) => ({
  value: value as ReadingMaterialStatus,
  label,
}));

export function App() {
  const apiUrl = defaultApiUrl;
  const { token, user, setToken, setRefreshToken, setUser } = useAuthSession();
  const [activeMenu, setActiveMenu] = useState<WebMenuId>("readingVocabulary");
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("checking");
  const appUpdate = useAppUpdate(appVersion);
  const isLoggedIn = Boolean(token && user);

  useEffect(() => {
    const handleUnauthorized = () => {
      setToken("");
      setRefreshToken("");
      setUser(null);
    };
    window.addEventListener(unauthorizedEventName, handleUnauthorized);
    return () => window.removeEventListener(unauthorizedEventName, handleUnauthorized);
  }, [setRefreshToken, setToken, setUser]);

  useEffect(() => {
    if (!token) {
      setConnectionStatus("offline");
      return;
    }
    setConnectionStatus("checking");
    fetchReadingMaterials(apiUrl, token, {})
      .then(() => setConnectionStatus("online"))
      .catch(() => setConnectionStatus("offline"));
  }, [apiUrl, token]);

  useEffect(() => {
    if (!isLoggedIn) return;
    const timer = window.setTimeout(() => {
      appUpdate.checkOnceOnStartup();
    }, 10_000);
    return () => window.clearTimeout(timer);
  }, [appUpdate.checkOnceOnStartup, isLoggedIn]);

  const handleLogin = async (email: string, password: string) => {
    const result = await login(apiUrl, email, password);
    setToken(result.accessToken);
    setRefreshToken(result.refreshToken);
    setUser(result.user);
  };

  const handleSignup = async (email: string, username: string, password: string) => {
    await signup(apiUrl, email, username, password);
  };

  const handleLogout = async () => {
    await logout(apiUrl, token);
    setToken("");
    setRefreshToken("");
    setUser(null);
  };

  if (!token || !user) {
    return <LoginScreen onLogin={handleLogin} onSignup={handleSignup} />;
  }

  const activeWebMenu = [...WEB_HEADER_MENUS, PROFILE_MENU, SETTINGS_MENU].find((menu) => menu.id === activeMenu) ?? WEB_HEADER_MENUS[0];
  const openMenu = (menu: WebMenuId) => {
    if (!canAccessMenu(user, menu)) return;
    setActiveMenu(menu);
  };

  return (
    <div className="app-shell">
      <AppSidebar
        menus={WEB_HEADER_MENUS}
        activeMenu={activeMenu}
        activeWebMenu={activeWebMenu}
        user={user ?? fallbackUser}
        connectionStatus={connectionStatus}
        appVersion={appUpdate.state.currentVersion}
        updateState={appUpdate.state}
        updateBusy={appUpdate.busy}
        onOpenMenu={openMenu}
        onInstallUpdate={() => void appUpdate.installUpdate()}
        onLogout={() => void handleLogout()}
      />
      <div className="app-main">
        <AppTopbar
          activeWebMenu={activeWebMenu}
        />
        <FalconWorkspace
          activeMenu={activeMenu}
          activeWebMenu={activeWebMenu}
          apiUrl={apiUrl}
          token={token}
          userName={user.username || user.email}
          appUpdate={appUpdate}
        />
      </div>
    </div>
  );
}

function FalconWorkspace({
  activeMenu,
  activeWebMenu,
  apiUrl,
  token,
  userName,
  appUpdate,
}: {
  activeMenu: WebMenuId;
  activeWebMenu: WebMenu;
  apiUrl: string;
  token: string;
  userName: string;
  appUpdate: AppUpdateControls;
}) {
  if (activeMenu === "readingMaterials") return <ReadingMaterialsView apiUrl={apiUrl} token={token} />;
  if (activeMenu === "readingVocabulary") return <ReadingVocabularyView apiUrl={apiUrl} token={token} />;
  if (activeMenu === "readingStudy") return <ReadingStudyView apiUrl={apiUrl} token={token} />;
  if (activeMenu === "profile") {
    return <ProfileView userName={userName} icon={activeWebMenu.icon} appUpdate={appUpdate} />;
  }
  return <SimpleView title="설정" description="자료 저장, AI 해석, 서버 연결 같은 앱 환경을 관리합니다." icon={activeWebMenu.icon} items={["자료 저장", "AI 해석", "서버 연결", `앱 버전 v${appUpdate.state.currentVersion}`]} />;
}

function ReadingMaterialsView({ apiUrl, token }: { apiUrl: string; token: string }) {
  const [activeTreeId, setActiveTreeId] = useState("all");
  const [activeFilter, setActiveFilter] = useState<ReadingTreeFilter>({ kind: "all" });
  const [collapsedSections, setCollapsedSections] = useState(() => new Set<string>());
  const [collapsedFolders, setCollapsedFolders] = useState(() => new Set<number>());
  const [selectedMaterialId, setSelectedMaterialId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState(() => new Set<string>());
  const [form, setForm] = useState<ReadingMaterialUpsertRequest>(emptyForm);
  const [materialDialogOpen, setMaterialDialogOpen] = useState(false);
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [moveTargetFolderId, setMoveTargetFolderId] = useState("");
  const [folderDialog, setFolderDialog] = useState<FolderDialogState | null>(null);
  const [folderManagementOpen, setFolderManagementOpen] = useState(false);
  const [folderDraftName, setFolderDraftName] = useState("");
  const [error, setError] = useState("");
  const [folderError, setFolderError] = useState("");
  const [saving, setSaving] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [savingFolder, setSavingFolder] = useState(false);
  const [deletingFolder, setDeletingFolder] = useState(false);
  const [movingMaterials, setMovingMaterials] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [todayQueue, setTodayQueue] = useLearningQueue();

  const { data: tree, isLoading: treeLoading, refetch: refetchTree } = useReadingTreeQuery(apiUrl, token);
  const { data: materials = [], isLoading: materialsLoading, refetch: refetchMaterials } = useReadingMaterialsQuery(apiUrl, token, activeFilter);
  const invalidateReadingMaterials = useInvalidateReadingMaterials(apiUrl);
  const folders = tree?.folders ?? [];
  const activeFolderId = activeFilter.kind === "folder" ? activeFilter.folderId : null;
  const visibleError = error || (!treeLoading && !tree ? "서버 오류가 발생했습니다." : "");

  useEffect(() => {
    const next = selectedMaterialId ? materials.find((material) => material.id === selectedMaterialId) : materials[0];
    if (next) {
      setSelectedMaterialId(next.id);
      setForm(formFromMaterial(next));
    } else {
      setSelectedMaterialId(null);
      setForm(emptyForm);
    }
  }, [materials, selectedMaterialId]);

  const sections = useMemo(() => buildTreeSections(tree?.folders ?? [], tree), [tree]);
  const childFolders = useMemo(
    () => folders.filter((folder) => folder.parentId === activeFolderId).sort((a, b) => a.displayOrder - b.displayOrder || a.id - b.id),
    [activeFolderId, folders],
  );
  const folderOptions = useMemo(() => buildFolderOptions(folders), [folders]);
  const selectedMaterials = useMemo(() => materials.filter((material) => selectedIds.has(material.id)), [materials, selectedIds]);
  const { data: selectedVocabulary = [], isLoading: loadingSelectedVocabulary } = useReadingMaterialVocabularyQuery(apiUrl, token, selectedMaterialId);
  const refreshAll = async () => {
    setRefreshing(true);
    setError("");
    try {
      await Promise.all([refetchTree(), refetchMaterials()]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "자료를 새로고침하지 못했습니다.");
    } finally {
      setRefreshing(false);
    }
  };

  const selectTreeNode = (nodeId: string, filter: ReadingTreeFilter) => {
    setActiveTreeId(nodeId);
    setActiveFilter(filter);
    setSelectedIds(new Set());
  };

  const openNewMaterial = () => {
    const folderId = activeFilter.kind === "folder" ? activeFilter.folderId : folders[0]?.id ?? null;
    if (folderId === null) {
      setError("먼저 왼쪽 자료 트리에서 폴더를 추가하세요.");
      return;
    }
    setSelectedMaterialId(null);
    setForm({ ...emptyForm, folderId });
    setMaterialDialogOpen(true);
  };

  const openMaterial = (material: ReadingMaterial) => {
    setSelectedMaterialId(material.id);
    setForm(formFromMaterial(material));
    setMaterialDialogOpen(true);
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
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "독해 자료 저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const generateTranslation = async () => {
    const text = form.originalText.trim();
    if (!text) {
      setError("AI 해석을 만들 원문을 먼저 입력하세요.");
      return;
    }
    setTranslating(true);
    setError("");
    try {
      const result = await translateToKorean(apiUrl, token, text);
      setForm((prev) => ({ ...prev, translationText: result.text.trim() }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "AI 해석 생성에 실패했습니다.");
    } finally {
      setTranslating(false);
    }
  };

  const generateVocabularyAnalysis = async () => {
    const text = form.originalText.trim();
    if (!text) {
      throw new Error("단어 정리를 만들 원문을 먼저 입력하세요.");
    }
    if (!selectedMaterialId) {
      throw new Error("자료를 먼저 저장한 뒤 단어 정리를 생성하세요.");
    }
    const vocabularyItems = await requestVocabularyAnalysis(apiUrl, token, text);
    await replaceReadingMaterialVocabulary(apiUrl, token, selectedMaterialId, vocabularyItems.map((item, index) => ({
      ...item,
      displayOrder: index,
    })));
    await invalidateReadingMaterials();
  };

  const saveVocabulary = async (items: ReadingVocabularyItemUpsertRequest[]) => {
    if (!selectedMaterialId) {
      throw new Error("자료를 먼저 저장한 뒤 단어 정리를 편집하세요.");
    }
    await replaceReadingMaterialVocabulary(apiUrl, token, selectedMaterialId, items);
    await invalidateReadingMaterials();
  };

  const saveFolder = async () => {
    if (!folderDialog) return;
    const name = folderDraftName.trim();
    if (!name) {
      setFolderError("폴더 이름을 입력하세요.");
      return;
    }
    setFolderError("");
    try {
      if (folderDialog.mode === "create") {
        setCreatingFolder(true);
        const folder = await createReadingFolder(apiUrl, token, { name, parentId: folderDialog.parentId });
        setFolderDialog(null);
        setActiveTreeId(`folder:${folder.id}`);
        setActiveFilter({ kind: "folder", folderId: folder.id });
        setForm((prev) => ({ ...prev, folderId: folder.id }));
      } else if (folderDialog.folderId !== null) {
        setSavingFolder(true);
        await renameReadingFolder(apiUrl, token, folderDialog.folderId, { name });
        setFolderDialog(null);
      }
      await invalidateReadingMaterials();
    } catch (caught) {
      setFolderError(caught instanceof Error ? caught.message : "폴더 저장에 실패했습니다.");
    } finally {
      setCreatingFolder(false);
      setSavingFolder(false);
    }
  };

  const removeFolder = async (node?: ReadingTreeSection["nodes"][number]) => {
    const id = node?.filter.kind === "folder" ? node.filter.folderId : folderDialog?.folderId;
    if (!id) return;
    setDeletingFolder(true);
    setFolderError("");
    try {
      await deleteReadingFolder(apiUrl, token, id);
      if (activeTreeId === `folder:${id}`) {
        setActiveTreeId("all");
        setActiveFilter({ kind: "all" });
      }
      setFolderDialog(null);
      await invalidateReadingMaterials();
    } catch (caught) {
      setFolderError(caught instanceof Error ? caught.message : "폴더 삭제에 실패했습니다.");
    } finally {
      setDeletingFolder(false);
    }
  };

  const reorderFolder = async (activeFolderIdValue: number, overFolderId: number) => {
    const activeFolder = folders.find((folder) => folder.id === activeFolderIdValue);
    const overFolder = folders.find((folder) => folder.id === overFolderId);
    if (!activeFolder || !overFolder || activeFolder.parentId !== overFolder.parentId) {
      setFolderError("같은 부모 폴더 안에서만 순서를 바꿀 수 있습니다.");
      return;
    }
    const siblings = folders
      .filter((folder) => folder.parentId === activeFolder.parentId)
      .sort((a, b) => a.displayOrder - b.displayOrder || a.id - b.id);
    const fromIndex = siblings.findIndex((folder) => folder.id === activeFolderIdValue);
    const toIndex = siblings.findIndex((folder) => folder.id === overFolderId);
    if (fromIndex < 0 || toIndex < 0) return;
    const ordered = [...siblings];
    const [moved] = ordered.splice(fromIndex, 1);
    ordered.splice(toIndex, 0, moved);
    try {
      setFolderError("");
      await reorderReadingFolders(apiUrl, token, {
        parentId: activeFolder.parentId,
        orderedIds: ordered.map((folder) => folder.id),
      });
      await invalidateReadingMaterials();
    } catch (caught) {
      setFolderError(caught instanceof Error ? caught.message : "폴더 순서 변경에 실패했습니다.");
    }
  };

  const assignSelectedToday = () => {
    const ids = selectedIds.size > 0 ? Array.from(selectedIds) : selectedMaterialId ? [selectedMaterialId] : [];
    if (ids.length === 0) return;
    setTodayQueue((prev) => Array.from(new Set([...ids, ...prev])));
    setSelectedIds(new Set());
  };

  const openMoveDialog = () => {
    if (selectedMaterials.length === 0) return;
    setMoveTargetFolderId(activeFolderId === null ? "" : String(activeFolderId));
    setMoveDialogOpen(true);
  };

  const moveSelectedMaterials = async () => {
    const folderId = Number(moveTargetFolderId);
    if (!folderId || selectedMaterials.length === 0) return;
    setMovingMaterials(true);
    setError("");
    try {
      await Promise.all(
        selectedMaterials.map((material) =>
          updateReadingMaterial(apiUrl, token, material.id, {
            ...formFromMaterial(material),
            folderId,
          }),
        ),
      );
      setSelectedIds(new Set());
      await invalidateReadingMaterials();
      setActiveTreeId(`folder:${folderId}`);
      setActiveFilter({ kind: "folder", folderId });
      await Promise.all([
        refetchTree(),
        fetchReadingMaterials(apiUrl, token, { folderId }),
      ]);
      setMoveDialogOpen(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "선택한 자료를 이동하지 못했습니다.");
    } finally {
      setMovingMaterials(false);
    }
  };

  return (
    <section className="falcon-view material-page-view">
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
            sections={sections}
            activeTreeId={activeTreeId}
            collapsedSections={collapsedSections}
            collapsedFolders={collapsedFolders}
            folderDialog={folderDialog}
            folderManagementOpen={folderManagementOpen}
            folderDraftName={folderDraftName}
            folderError={folderError}
            creatingFolder={creatingFolder}
            savingFolder={savingFolder}
            deletingFolder={deletingFolder}
            refreshing={refreshing}
            onOpenCreateRoot={() => {
              setFolderError("");
              setFolderDialog({ mode: "create", folderId: null, parentId: null, name: "루트 폴더" });
              setFolderDraftName("");
            }}
            onRefresh={() => void refreshAll()}
            onOpenCreateChild={(node) => {
              if (node.filter.kind !== "folder") return;
              setFolderError("");
              setFolderDialog({ mode: "create", folderId: null, parentId: node.filter.folderId, name: `${node.label} 하위 폴더` });
              setFolderDraftName("");
            }}
            onOpenEditFolder={(node) => {
              if (node.filter.kind !== "folder") return;
              setFolderError("");
              setFolderDialog({ mode: "edit", folderId: node.filter.folderId, parentId: node.parentFolderId ?? null, name: node.label });
              setFolderDraftName(node.label);
            }}
            onOpenFolderManagement={() => {
              setFolderError("");
              setFolderManagementOpen(true);
            }}
            onCloseFolderManagement={() => {
              setFolderError("");
              setFolderManagementOpen(false);
            }}
            onCloseFolderDialog={() => {
              setFolderError("");
              setFolderDialog(null);
            }}
            onSelect={selectTreeNode}
            onToggleSection={(sectionId) =>
              setCollapsedSections((prev) => toggleSetValue(prev, sectionId))
            }
            onToggleFolder={(folderId) =>
              setCollapsedFolders((prev) => toggleSetValue(prev, folderId))
            }
            onChangeFolderDraftName={setFolderDraftName}
            onSaveFolder={() => void saveFolder()}
            onDeleteFolder={(node) => void removeFolder(node)}
            onReorderFolder={(activeFolderIdValue, overFolderId) => void reorderFolder(activeFolderIdValue, overFolderId)}
          />

          <main className="material-editor-panel">
            <div className="editor-section-title">
              <div>
                <span>자료 관리</span>
                <h2>{activeTreeTitle(activeTreeId, sections)}</h2>
              </div>
              <Button type="button" onClick={openNewMaterial}>
                <Plus size={16} /> 자료 추가
              </Button>
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
                      <button
                        type="button"
                        className="material-folder-card"
                        key={folder.id}
                        onClick={() => selectTreeNode(`folder:${folder.id}`, { kind: "folder", folderId: folder.id })}
                      >
                        <span><FileText size={17} /></span>
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
                  <Button type="button" variant="outline" size="sm" onClick={openMoveDialog} disabled={selectedIds.size === 0}>
                    <Folder size={14} /> 폴더 이동{selectedIds.size > 0 ? ` ${selectedIds.size}` : ""}
                  </Button>
                  <Button type="button" variant={selectedIds.size > 0 ? "default" : "outline"} size="sm" onClick={assignSelectedToday} disabled={selectedIds.size === 0 && !selectedMaterialId}>
                    오늘의 학습{selectedIds.size > 0 ? ` ${selectedIds.size}` : ""}
                  </Button>
                </div>
              </div>

              {materialsLoading ? <div className="material-empty">자료를 불러오는 중입니다.</div> : null}
              {!materialsLoading && materials.length === 0 ? <div className="material-empty">선택한 트리에 저장된 자료가 없습니다.</div> : null}
              {materials.map((material) => (
                <MaterialCard
                  key={material.id}
                  material={material}
                  active={material.id === selectedMaterialId}
                  assignedToday={todayQueue.includes(material.id)}
                  checked={selectedIds.has(material.id)}
                  onSelect={() => openMaterial(material)}
                  onToggleSelection={() => setSelectedIds((prev) => toggleSetValue(prev, material.id))}
                />
              ))}
            </div>
          </main>
        </div>

        {materialDialogOpen ? (
          <MaterialDialog
            form={form}
            folderOptions={folderOptions}
            selectedMaterialId={selectedMaterialId}
            saving={saving}
            translating={translating}
            onClose={() => setMaterialDialogOpen(false)}
            onChange={setForm}
            onGenerateTranslation={() => void generateTranslation()}
            onGenerateVocabularyAnalysis={generateVocabularyAnalysis}
            vocabularyItems={selectedVocabulary}
            vocabularyLoading={loadingSelectedVocabulary}
            onSaveVocabulary={saveVocabulary}
            onSave={() => void saveMaterial()}
          />
        ) : null}

        {moveDialogOpen ? (
          <MoveMaterialsDialog
            selectedMaterials={selectedMaterials}
            folders={folders}
            targetFolderId={moveTargetFolderId}
            moving={movingMaterials}
            onChangeTargetFolderId={setMoveTargetFolderId}
            onClose={() => setMoveDialogOpen(false)}
            onMove={() => void moveSelectedMaterials()}
          />
        ) : null}
      </div>
    </section>
  );
}

function MaterialDialog({
  form,
  folderOptions,
  selectedMaterialId,
  saving,
  translating,
  onClose,
  onChange,
  onGenerateTranslation,
  onGenerateVocabularyAnalysis,
  vocabularyItems,
  vocabularyLoading,
  onSaveVocabulary,
  onSave,
}: {
  form: ReadingMaterialUpsertRequest;
  folderOptions: Array<{ value: string; label: string; disabled?: boolean }>;
  selectedMaterialId: string | null;
  saving: boolean;
  translating: boolean;
  onClose: () => void;
  onChange: (updater: (prev: ReadingMaterialUpsertRequest) => ReadingMaterialUpsertRequest) => void;
  onGenerateTranslation: () => void;
  onGenerateVocabularyAnalysis: () => Promise<void>;
  vocabularyItems: ReadingVocabularyItem[];
  vocabularyLoading: boolean;
  onSaveVocabulary: (items: ReadingVocabularyItemUpsertRequest[]) => Promise<void>;
  onSave: () => void;
}) {
  const [generatingVocabularyAnalysis, setGeneratingVocabularyAnalysis] = useState(false);
  const [vocabularyAnalysisError, setVocabularyAnalysisError] = useState("");
  const [savingVocabulary, setSavingVocabulary] = useState(false);
  const generateDialogVocabularyAnalysis = async () => {
    setGeneratingVocabularyAnalysis(true);
    setVocabularyAnalysisError("");
    try {
      await onGenerateVocabularyAnalysis();
    } catch (caught) {
      setVocabularyAnalysisError(caught instanceof Error ? caught.message : "단어 정리 생성에 실패했습니다.");
    } finally {
      setGeneratingVocabularyAnalysis(false);
    }
  };
  const saveDialogVocabulary = async (items: ReadingVocabularyItemUpsertRequest[]) => {
    setSavingVocabulary(true);
    setVocabularyAnalysisError("");
    try {
      await onSaveVocabulary(items);
    } catch (caught) {
      setVocabularyAnalysisError(caught instanceof Error ? caught.message : "단어 정리 저장에 실패했습니다.");
    } finally {
      setSavingVocabulary(false);
    }
  };

  return (
    <Dialog className="material-dialog-backdrop z-[80] bg-slate-950/30 p-4" onClose={onClose}>
      <DialogContent className="material-dialog material-dialog-full max-w-none">
        <div className="editor-section-title">
          <div>
            <span>{selectedMaterialId ? "Saved Material" : "New Material"}</span>
            <h2>{selectedMaterialId ? "독해 자료 수정" : "새 독해 자료 등록"}</h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="닫기" title="닫기">
            <X size={18} />
          </button>
        </div>

        <div className="material-dialog-body">
          <div className="material-dialog-main">
            <div className="material-form-grid">
              <label>
                제목
                <input value={form.title} onChange={(event) => onChange((prev) => ({ ...prev, title: event.target.value }))} />
              </label>
              <div className="material-field">
                자료 유형
                <Select ariaLabel="자료 유형" value={form.sourceType} options={sourceTypeOptions} onChange={(sourceType) => onChange((prev) => ({ ...prev, sourceType }))} />
              </div>
              <div className="material-field">
                난이도
                <Select ariaLabel="난이도" value={form.level} options={readingLevelOptions} onChange={(level) => onChange((prev) => ({ ...prev, level }))} />
              </div>
              <label>
                저장 날짜
                <DateInput
                  ariaLabel="저장 날짜"
                  value={form.collectedDate}
                  onChange={(collectedDate) => onChange((prev) => ({ ...prev, collectedDate }))}
                />
              </label>
              <div className="material-field">
                저장 폴더
                <Select
                  ariaLabel="저장 폴더"
                  value={form.folderId === null ? "" : String(form.folderId)}
                  options={folderOptions}
                  onChange={(folderId) => onChange((prev) => ({ ...prev, folderId: folderId ? Number(folderId) : null }))}
                />
              </div>
              <div className="material-field">
                상태
                <Select ariaLabel="상태" value={form.status} options={statusOptions} onChange={(status) => onChange((prev) => ({ ...prev, status }))} />
              </div>
              <label className="wide">
                출처 URL
                <div className="url-input">
                  <Link size={16} />
                  <input value={form.sourceUrl} onChange={(event) => onChange((prev) => ({ ...prev, sourceUrl: event.target.value }))} />
                </div>
              </label>
              <div className="material-text-pair wide">
                <label>
                  <span className="material-text-label-head">원문</span>
                  <textarea value={form.originalText} onChange={(event) => onChange((prev) => ({ ...prev, originalText: event.target.value }))} />
                </label>
                <label>
                  <span className="material-text-label-head">
                    전체 해석
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="min-h-[30px] !border !border-slate-400 !bg-white px-2.5 text-xs font-extrabold !text-slate-700 shadow-none hover:!border-slate-500 hover:!bg-slate-50 hover:!text-zinc-900"
                      onClick={onGenerateTranslation}
                      disabled={translating || form.originalText.trim().length === 0}
                    >
                      {translating ? <Loader2 size={14} className="spin" /> : <Languages size={14} />}
                      {translating ? "해석 중" : "AI 해석"}
                    </Button>
                  </span>
                  <textarea
                    value={form.translationText}
                    placeholder="학습 화면의 전체 해석 탭에 표시할 한국어 해석을 입력하세요."
                    onChange={(event) => onChange((prev) => ({ ...prev, translationText: event.target.value }))}
                  />
                </label>
              </div>
            </div>
          </div>

          <aside className="material-dialog-vocabulary-panel">
            <div className="material-dialog-vocabulary-head">
              <div>
                <span>Vocabulary</span>
                <strong>단어 정리</strong>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="min-h-[32px] !border !border-slate-400 !bg-white px-3 text-xs font-extrabold !text-slate-700 shadow-none hover:!border-slate-500 hover:!bg-slate-50 hover:!text-zinc-900"
                onClick={() => void generateDialogVocabularyAnalysis()}
                disabled={generatingVocabularyAnalysis || form.originalText.trim().length === 0}
              >
                {generatingVocabularyAnalysis ? <Loader2 size={14} className="spin" /> : <CheckSquare size={14} />}
                {generatingVocabularyAnalysis ? "정리 중" : "단어 정리 AI"}
              </Button>
            </div>
            {vocabularyAnalysisError ? <div className="folder-dialog-error">{vocabularyAnalysisError}</div> : null}
            <VocabularyEditor
              disabled={!selectedMaterialId}
              loading={vocabularyLoading}
              saving={savingVocabulary}
              items={vocabularyItems}
              onSave={saveDialogVocabulary}
            />
          </aside>
        </div>

        <div className="material-dialog-actions">
          <Button variant="outline" type="button" onClick={onClose}>닫기</Button>
          <Button type="button" onClick={onSave} disabled={saving}>
            <Save size={16} /> {saving ? "저장 중" : "저장"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function MoveMaterialsDialog({
  selectedMaterials,
  folders,
  targetFolderId,
  moving,
  onChangeTargetFolderId,
  onClose,
  onMove,
}: {
  selectedMaterials: ReadingMaterial[];
  folders: ReadingFolder[];
  targetFolderId: string;
  moving: boolean;
  onChangeTargetFolderId: (value: string) => void;
  onClose: () => void;
  onMove: () => void;
}) {
  const [collapsedFolderIds, setCollapsedFolderIds] = useState(() => new Set<number>());
  const previewItems = selectedMaterials.slice(0, 5);
  const remainingCount = Math.max(0, selectedMaterials.length - previewItems.length);
  const folderNodes = useMemo(() => buildFolderNodes(folders, null, 0), [folders]);
  const childFolderIdsByParentId = useMemo(() => {
    const map = new Map<number | null, number[]>();
    folderNodes.forEach((node) => {
      if (node.filter.kind !== "folder") return;
      const parentId = node.parentFolderId ?? null;
      map.set(parentId, [...(map.get(parentId) ?? []), node.filter.folderId]);
    });
    return map;
  }, [folderNodes]);
  const nodeByFolderId = useMemo(() => {
    const map = new Map<number, ReadingTreeSection["nodes"][number]>();
    folderNodes.forEach((node) => {
      if (node.filter.kind === "folder") map.set(node.filter.folderId, node);
    });
    return map;
  }, [folderNodes]);
  const isHiddenByCollapsedAncestor = (node: ReadingTreeSection["nodes"][number]) => {
    let parentId = node.parentFolderId ?? null;
    while (parentId !== null) {
      if (collapsedFolderIds.has(parentId)) return true;
      parentId = nodeByFolderId.get(parentId)?.parentFolderId ?? null;
    }
    return false;
  };

  return (
    <Dialog className="material-dialog-backdrop folder-dialog-backdrop bg-slate-950/30 p-8" onClose={onClose}>
      <DialogContent className="folder-dialog material-move-dialog max-w-none">
        <div className="folder-dialog-head">
          <div>
            <span>Move Materials</span>
            <h2>선택 자료 폴더 이동</h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="닫기" title="닫기">
            <X size={17} />
          </button>
        </div>

        <div className="material-move-summary">
          <strong>{selectedMaterials.length}개 자료를 이동합니다.</strong>
          <ul>
            {previewItems.map((material) => (
              <li key={material.id}>{material.title}</li>
            ))}
            {remainingCount > 0 ? <li>외 {remainingCount}개</li> : null}
          </ul>
        </div>

        <div className="material-move-folder-tree">
          <div className="material-tree-section">
            <button className="material-tree-section-title" type="button">
              <ChevronDown size={16} strokeWidth={2.5} />
              <strong>내 폴더</strong>
            </button>
            <div className="material-tree-node-list">
              <div className="material-tree-node-list-inner">
                {folderNodes.length === 0 ? (
                  <div className="vocabulary-tree-empty">이동할 폴더가 없습니다.</div>
                ) : null}
                {folderNodes.map((node) => {
                  if (node.filter.kind !== "folder") return null;
                  const folderId = node.filter.folderId;
                  const hasChildFolders = (childFolderIdsByParentId.get(folderId)?.length ?? 0) > 0;
                  const isFolderCollapsed = collapsedFolderIds.has(folderId);
                  const isCollapsedChild = isHiddenByCollapsedAncestor(node);
                  const active = targetFolderId === String(folderId);
                  return (
                    <div
                      className={`material-tree-node-wrap ${isCollapsedChild ? "collapsed-child" : ""}`}
                      key={node.id}
                      style={{ paddingLeft: `${(node.depth ?? 0) * 18}px` }}
                    >
                      <button
                        className={`material-tree-collapse ${!hasChildFolders ? "spacer" : ""}`}
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setCollapsedFolderIds((prev) => toggleSetValue(prev, folderId));
                        }}
                        title={hasChildFolders ? "하위 폴더 접기" : undefined}
                        aria-hidden={!hasChildFolders}
                        tabIndex={hasChildFolders ? 0 : -1}
                      >
                        {hasChildFolders ? <ChevronDown className={isFolderCollapsed ? "collapsed" : ""} size={16} strokeWidth={2.5} /> : null}
                      </button>
                      <button
                        className={`material-tree-node ${active ? "active" : ""}`}
                        type="button"
                        onClick={() => onChangeTargetFolderId(String(folderId))}
                      >
                        {active ? <FolderOpen size={15} /> : <Folder size={15} />}
                        <span>{node.label}</span>
                        <em>{node.count}</em>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="folder-dialog-actions">
          <Button type="button" variant="outline" onClick={onClose} disabled={moving}>
            취소
          </Button>
          <Button type="button" onClick={onMove} disabled={moving || !targetFolderId}>
            {moving ? <Loader2 size={15} className="spin" /> : <Folder size={15} />}
            {moving ? "이동 중" : "이동"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
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
        <span>{sourceTypeLabels[material.sourceType]} · {readingLevelLabel(material.level)}</span>
        <small>{material.wordCount} words · {material.estimatedMinutes}분 · {material.collectedDate}</small>
        {assignedToday ? <small>오늘의 학습 지정됨</small> : null}
        <StatusBadge status={material.status} />
      </button>
    </article>
  );
}

function ReadingVocabularyView({ apiUrl, token }: { apiUrl: string; token: string }) {
  const [activeFilterId, setActiveFilterId] = useState("all");
  const [activeFilter, setActiveFilter] = useState<VocabularyFilter>({ kind: "all" });
  const [collapsedSections, setCollapsedSections] = useState(() => new Set<string>());
  const [collapsedFolders, setCollapsedFolders] = useState(() => new Set<number>());
  const [query, setQuery] = useState("");
  const [selectedWordId, setSelectedWordId] = useState<number | null>(null);
  const { data: tree } = useReadingTreeQuery(apiUrl, token);
  const { data: materials = [], isLoading: materialsLoading } = useReadingMaterialsQuery(apiUrl, token, { kind: "all" });
  const { data: vocabulary = [], isLoading: vocabularyLoading, error } = useReadingVocabularyQuery(apiUrl, token);

  const materialMap = useMemo(() => new Map(materials.map((material) => [material.id, material])), [materials]);
  const folderMap = useMemo(() => new Map((tree?.folders ?? []).map((folder) => [folder.id, folder])), [tree?.folders]);
  const duplicateCountByWord = useMemo(() => {
    const counts = new Map<string, number>();
    vocabulary.forEach((item) => {
      const key = item.word.trim().toLowerCase();
      if (!key) return;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });
    return counts;
  }, [vocabulary]);

  const rows = useMemo<VocabularyGridRow[]>(() => vocabulary.map((item) => {
    const material = materialMap.get(item.materialId);
    const folder = material?.folderId ? folderMap.get(material.folderId) : null;
    return {
      ...item,
      folderId: material?.folderId ?? null,
      folderName: folder?.name ?? "미분류",
      sourceType: material?.sourceType ?? null,
      level: material?.level ?? null,
      materialStatus: material?.status ?? null,
      collectedDate: material?.collectedDate ?? "",
      duplicateCount: duplicateCountByWord.get(item.word.trim().toLowerCase()) ?? 1,
    };
  }), [duplicateCountByWord, folderMap, materialMap, vocabulary]);

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (!matchesVocabularyFilter(row, activeFilter)) return false;
      if (!normalizedQuery) return true;
      return [row.word, row.meaning, row.note ?? ""]
        .some((value) => value.toLowerCase().includes(normalizedQuery));
    });
  }, [activeFilter, query, rows]);

  const selectedWord = useMemo(() => {
    if (selectedWordId === null) return filteredRows[0] ?? null;
    return filteredRows.find((row) => row.id === selectedWordId) ?? filteredRows[0] ?? null;
  }, [filteredRows, selectedWordId]);

  const filterSections = useMemo(() => buildVocabularyFilterSections(rows, tree?.folders ?? []), [rows, tree?.folders]);
  const normalizedQuery = query.trim();

  const columnDefs = useMemo<ColDef<VocabularyGridRow>[]>(() => [
    {
      field: "word",
      headerName: "단어",
      pinned: "left",
      width: 170,
      cellClass: "vocabulary-word-cell",
    },
    { field: "meaning", headerName: "뜻", flex: 0.9, minWidth: 180 },
    { field: "note", headerName: "메모", flex: 1.6, minWidth: 320, valueGetter: (params) => params.data?.note ?? "" },
  ], []);

  return (
    <section className="falcon-view material-page-view">
      <div className="falcon-inner">
        <header className="falcon-page-head">
          <div>
            <h1>독해 단어장</h1>
            <p>독해 자료에서 수집한 단어를 자료, 폴더, 날짜, 상태 기준으로 모아 관리합니다.</p>
          </div>
        </header>

        {error ? <div className="material-error">단어장을 불러오지 못했습니다.</div> : null}

        <div className="vocabulary-workbench">
          <aside className="material-tree-panel vocabulary-tree-panel">
            <div className="material-list-head">
              <div>
                <strong>자료 트리</strong>
              </div>
              <span>{rows.length}</span>
            </div>

            <div className="material-tree-search">
              <Search size={15} />
              <span>자료, 폴더, 날짜, 상태 검색</span>
            </div>

            <div className="material-tree-sections">
              <section className="material-tree-section">
                <div className="material-tree-node-list">
                  <div className="material-tree-node-list-inner">
                    <div className="material-tree-node-wrap vocabulary-tree-root">
                      <button
                        type="button"
                        className={`material-tree-node ${activeFilterId === "all" ? "active" : ""}`}
                        onClick={() => {
                          setActiveFilterId("all");
                          setActiveFilter({ kind: "all" });
                        }}
                      >
                        <FolderOpen size={15} />
                        <span>전체 자료</span>
                        <em>{rows.length}</em>
                      </button>
                    </div>
                  </div>
                </div>
              </section>
              {filterSections.map((section) => (
                <VocabularyTreeSection
                  key={section.id}
                  section={section}
                  activeFilterId={activeFilterId}
                  collapsed={collapsedSections.has(section.id)}
                  collapsedFolders={collapsedFolders}
                  onToggleSection={(sectionId) => setCollapsedSections((prev) => toggleSetValue(prev, sectionId))}
                  onToggleFolder={(folderId) => setCollapsedFolders((prev) => toggleSetValue(prev, folderId))}
                  onSelect={(node) => {
                    setActiveFilterId(node.id);
                    setActiveFilter(node.filter);
                  }}
                />
              ))}
            </div>
          </aside>

          <main className="vocabulary-grid-panel">
            <div className="vocabulary-toolbar">
              <div>
                <h2>
                  {vocabularyFilterTitle(activeFilterId, filterSections)}
                  <span>{normalizedQuery ? `(${filteredRows.length.toLocaleString()}/${rows.length.toLocaleString()})` : `(${rows.length.toLocaleString()})`}</span>
                </h2>
              </div>
              <label className="vocabulary-search">
                <Search size={16} />
                <input
                  value={query}
                  placeholder="단어, 뜻, 메모 검색"
                  onChange={(event) => setQuery(event.target.value)}
                />
              </label>
            </div>

            <div className="ag-theme-quartz reading-vocabulary-grid">
              <AgGridReact<VocabularyGridRow>
                theme="legacy"
                rowData={filteredRows}
                columnDefs={columnDefs}
                defaultColDef={{ sortable: true, filter: true, resizable: true }}
                rowSelection={{
                  mode: "multiRow",
                  checkboxes: true,
                  headerCheckbox: true,
                  enableClickSelection: true,
                }}
                rowClassRules={{
                  "reading-vocabulary-row-selected": (params) => params.data?.id === selectedWordId,
                }}
                onRowClicked={(event) => {
                  if (event.data) setSelectedWordId(event.data.id);
                }}
                overlayNoRowsTemplate={vocabularyLoading || materialsLoading ? "단어를 불러오는 중입니다." : "조건에 맞는 단어가 없습니다."}
              />
            </div>

            <aside className="vocabulary-detail-panel">
              {selectedWord ? (
                <>
                  <div>
                    <span>선택 단어</span>
                    <h3>{selectedWord.word}</h3>
                    <p>{selectedWord.meaning || "뜻이 입력되지 않았습니다."}</p>
                  </div>
                  <dl className="vocabulary-detail-meta compact">
                    <div>
                      <dt>독해 자료</dt>
                      <dd>{selectedWord.materialTitle}</dd>
                    </div>
                    <div>
                      <dt>난이도</dt>
                      <dd>{selectedWord.level ? readingLevelLabel(selectedWord.level) : "-"}</dd>
                    </div>
                    <div>
                      <dt>중복</dt>
                      <dd>{selectedWord.duplicateCount > 1 ? `${selectedWord.duplicateCount}개 자료에서 발견` : "없음"}</dd>
                    </div>
                  </dl>
                  {selectedWord.note ? <p className="vocabulary-detail-note">{selectedWord.note}</p> : null}
                </>
              ) : (
                <div className="material-empty">단어를 선택하면 상세 정보가 표시됩니다.</div>
              )}
            </aside>
          </main>
        </div>
      </div>
    </section>
  );
}

function VocabularyTreeSection({
  section,
  activeFilterId,
  collapsed,
  collapsedFolders,
  onToggleSection,
  onToggleFolder,
  onSelect,
}: {
  section: VocabularyFilterSection;
  activeFilterId: string;
  collapsed: boolean;
  collapsedFolders: Set<number>;
  onToggleSection: (sectionId: string) => void;
  onToggleFolder: (folderId: number) => void;
  onSelect: (node: VocabularyFilterNode) => void;
}) {
  const childFolderIdsByParentId = useMemo(() => {
    const map = new Map<number | null, number[]>();
    section.nodes.forEach((node) => {
      if (node.filter.kind !== "folder") return;
      const parentId = node.parentFolderId ?? null;
      map.set(parentId, [...(map.get(parentId) ?? []), node.filter.folderId]);
    });
    return map;
  }, [section.nodes]);
  const nodeByFolderId = useMemo(() => {
    const map = new Map<number, VocabularyFilterNode>();
    section.nodes.forEach((node) => {
      if (node.filter.kind === "folder") map.set(node.filter.folderId, node);
    });
    return map;
  }, [section.nodes]);
  const isHiddenByCollapsedAncestor = (node: VocabularyFilterNode) => {
    if (section.id !== "library") return false;
    let parentId = node.parentFolderId ?? null;
    while (parentId !== null) {
      if (collapsedFolders.has(parentId)) return true;
      parentId = nodeByFolderId.get(parentId)?.parentFolderId ?? null;
    }
    return false;
  };

  return (
    <section className="material-tree-section">
      <button className="material-tree-section-title" type="button" onClick={() => onToggleSection(section.id)}>
        <ChevronDown className={collapsed ? "collapsed" : ""} size={16} strokeWidth={2.5} />
        <strong>{section.label}</strong>
      </button>
      <div className={`material-tree-node-list ${collapsed ? "collapsed" : ""}`}>
        <div className="material-tree-node-list-inner">
          {section.nodes.length === 0 ? (
            <div className="vocabulary-tree-empty">표시할 항목이 없습니다.</div>
          ) : null}
          {section.nodes.map((node) => {
            const folderId = node.filter.kind === "folder" ? node.filter.folderId : null;
            const hasChildFolders = section.id === "library" && folderId !== null && (childFolderIdsByParentId.get(folderId)?.length ?? 0) > 0;
            const isFolderCollapsed = folderId !== null && collapsedFolders.has(folderId);
            const isCollapsedChild = isHiddenByCollapsedAncestor(node);
            return (
              <div
                className={`material-tree-node-wrap ${isCollapsedChild ? "collapsed-child" : ""}`}
                key={node.id}
                style={{ paddingLeft: `${(node.depth ?? 0) * 18}px` }}
              >
                <button
                  className={`material-tree-collapse ${!hasChildFolders ? "spacer" : ""}`}
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    if (folderId !== null && hasChildFolders) onToggleFolder(folderId);
                  }}
                  title={hasChildFolders ? "하위 폴더 접기" : undefined}
                  aria-hidden={!hasChildFolders}
                  tabIndex={hasChildFolders ? 0 : -1}
                >
                  {hasChildFolders ? <ChevronDown className={isFolderCollapsed ? "collapsed" : ""} size={16} strokeWidth={2.5} /> : null}
                </button>
                <button
                  className={`material-tree-node ${node.id === activeFilterId ? "active" : ""}`}
                  type="button"
                  onClick={() => onSelect(node)}
                >
                  {section.id === "dates" ? (
                    <CalendarDays size={15} />
                  ) : node.id === activeFilterId ? (
                    <FolderOpen size={15} />
                  ) : (
                    <Folder size={15} />
                  )}
                  <span>{node.label}</span>
                  <em>{node.count}</em>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function ReadingStudyView({ apiUrl, token }: { apiUrl: string; token: string }) {
  const [queue, setQueue] = useLearningQueue();
  const [selectedId, setSelectedId] = useState<string | null>(queue[0] ?? null);
  const [syntaxDialog, setSyntaxDialog] = useState<SyntaxDialogState | null>(null);
  const [savedSentenceAnalyses, setSavedSentenceAnalyses] = useState(() => new Map<string, SentenceAnalysis>());
  const [analyzingSentenceIndex, setAnalyzingSentenceIndex] = useState<number | null>(null);
  const [generatingVocabulary, setGeneratingVocabulary] = useState(false);
  const [vocabularyError, setVocabularyError] = useState("");
  const { data: allMaterials = [], isLoading, error } = useReadingMaterialsQuery(apiUrl, token, { kind: "all" });
  const invalidateReadingMaterials = useInvalidateReadingMaterials(apiUrl);
  const materialMap = useMemo(() => new Map(allMaterials.map((material) => [material.id, material])), [allMaterials]);
  const queuedMaterials = queue.map((id) => materialMap.get(id)).filter(Boolean) as ReadingMaterial[];
  const selectedMaterial = selectedId ? materialMap.get(selectedId) ?? queuedMaterials[0] ?? null : queuedMaterials[0] ?? null;
  const syntaxSentences = useMemo(() => splitReadingSentences(selectedMaterial?.originalText ?? ""), [selectedMaterial?.originalText]);
  const { data: selectedVocabulary = [] } = useReadingMaterialVocabularyQuery(apiUrl, token, selectedMaterial?.id ?? null);

  useEffect(() => {
    if (!selectedMaterial && queuedMaterials[0]) setSelectedId(queuedMaterials[0].id);
  }, [queuedMaterials, selectedMaterial]);

  useEffect(() => {
    setSyntaxDialog(null);
    setAnalyzingSentenceIndex(null);
  }, [selectedMaterial?.id]);

  useEffect(() => {
    setSavedSentenceAnalyses(parseStoredSentenceAnalysisMap(selectedMaterial?.sentenceAnalysisText));
  }, [selectedMaterial?.id, selectedMaterial?.sentenceAnalysisText]);

  const removeFromQueue = (id: string) => {
    setQueue((prev) => prev.filter((item) => item !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const generateSelectedVocabulary = async () => {
    if (!selectedMaterial) return;
    setGeneratingVocabulary(true);
    setVocabularyError("");
    try {
      const vocabularyItems = await requestVocabularyAnalysis(apiUrl, token, selectedMaterial.originalText);
      await replaceReadingMaterialVocabulary(apiUrl, token, selectedMaterial.id, vocabularyItems.map((item, index) => ({
        ...item,
        displayOrder: index,
      })));
      await invalidateReadingMaterials();
    } catch (caught) {
      setVocabularyError(caught instanceof Error ? caught.message : "단어 정리 생성에 실패했습니다.");
    } finally {
      setGeneratingVocabulary(false);
    }
  };

  const syntaxCacheKey = (sentence: string, sentenceIndex: number) => `${selectedMaterial?.id ?? "unknown"}:${sentenceIndex}:${sentence}`;
  const openSyntaxSentence = (sentence: string, sentenceIndex: number) => {
    const saved = savedSentenceAnalyses.get(syntaxCacheKey(sentence, sentenceIndex));
    if (saved) {
      setSyntaxDialog({ sentenceIndex, sentence, analysis: saved });
      return;
    }
    void analyzeSyntaxSentence(sentence, sentenceIndex, true);
  };
  const analyzeSyntaxSentence = async (sentence: string, sentenceIndex: number, openDialog = false) => {
    if (openDialog) setSyntaxDialog({ sentenceIndex, sentence });
    setAnalyzingSentenceIndex(sentenceIndex);
    try {
      const result = await sendChat(apiUrl, token, {
        agentId: "reading-syntax-analyzer",
        history: [],
        instructions: [
          "You are an English reading tutor for Korean middle and high school students.",
          "Analyze exactly one English sentence.",
          "Return only JSON with keys chunks, grammar.",
          "chunks: Korean explanations of meaningful chunks in reading order.",
          "grammar: Korean explanations of important grammar patterns.",
          "Keep each item short and useful for reading comprehension.",
        ].join("\n"),
        message: `Analyze this sentence for a Korean student:\n${sentence}`,
      });
      const analysis = parseSentenceAnalysis(result.content);
      const nextAnalyses = new Map(savedSentenceAnalyses);
      nextAnalyses.set(syntaxCacheKey(sentence, sentenceIndex), analysis);
      setSavedSentenceAnalyses(nextAnalyses);
      setSyntaxDialog({ sentenceIndex, sentence, analysis });
      if (selectedMaterial) {
        await updateReadingMaterial(apiUrl, token, selectedMaterial.id, {
          ...formFromMaterial(selectedMaterial),
          sentenceAnalysisText: serializeSentenceAnalysisMap(nextAnalyses),
        });
        await invalidateReadingMaterials();
      }
    } catch (caught) {
      setSyntaxDialog({
        sentenceIndex,
        sentence,
        error: caught instanceof Error ? caught.message : "문장 분석에 실패했습니다.",
      });
    } finally {
      setAnalyzingSentenceIndex(null);
    }
  };

  return (
    <section className="falcon-view">
      <div className="falcon-inner">
        <header className="falcon-page-head">
          <div>
            <h1>독해 학습</h1>
            <p>독해 자료에서 오늘 볼 학습 큐를 만들고 순서대로 진행합니다.</p>
          </div>
        </header>

        {error ? <div className="material-error">학습 자료를 불러오지 못했습니다.</div> : null}

        <div className="reading-study-layout">
          <section className="reading-study-list">
            <div className="reading-study-list-head">
              <div>
                <h2>오늘의 학습</h2>
                <p>독해 자료에서 지정한 항목입니다.</p>
              </div>
              <div className="reading-study-counts" aria-label="독해 학습 자료 개수">
                <span>
                  오늘
                  <strong>{queuedMaterials.length}</strong>
                </span>
              </div>
            </div>
            {isLoading ? <div className="material-empty">자료를 불러오는 중입니다.</div> : null}
            {!isLoading && queuedMaterials.length === 0 ? <div className="material-empty">독해 자료에서 자료를 선택해 오늘의 학습으로 지정하세요.</div> : null}
            {queuedMaterials.map((material, index) => (
              <div className={`reading-study-card ${selectedMaterial?.id === material.id ? "active" : ""}`} key={material.id}>
                <button type="button" onClick={() => setSelectedId(material.id)}>
                  <span className="reading-study-order">{index + 1}</span>
                  <strong>{material.title}</strong>
                  <small>{sourceTypeLabels[material.sourceType]} · {readingLevelLabel(material.level)} · {material.estimatedMinutes}분</small>
                </button>
                <Button type="button" variant="outline" size="sm" onClick={() => removeFromQueue(material.id)}>
                  제외
                </Button>
              </div>
            ))}
          </section>

          <section className="reading-study-stage">
            {selectedMaterial ? (
              <>
                <div className="editor-section-title">
                  <div>
                    <span>Study Session</span>
                    <h2>{selectedMaterial.title}</h2>
                    <p>{sourceTypeLabels[selectedMaterial.sourceType]} · {readingLevelLabel(selectedMaterial.level)} · {selectedMaterial.estimatedMinutes}분</p>
                  </div>
                  <Button type="button"><Play size={16} /> 학습 시작</Button>
                </div>
                <div className="reading-study-workspace">
                  <article className="reading-study-reader">
                    <div className="reading-study-reader-head">
                      <strong>본문 읽기</strong>
                      <StatusBadge status={selectedMaterial.status} />
                    </div>
                    <p>{selectedMaterial.originalText}</p>
                  </article>
                  <aside className="reading-study-assist" aria-label="독해 보조">
                    <Tabs defaultValue="translation">
                      <TabsList className="reading-study-assist-tabs" aria-label="독해 보조 탭">
                        <TabsTrigger value="translation"><Languages size={14} />전체 해석</TabsTrigger>
                        <TabsTrigger value="syntax"><BookOpenCheck size={14} />구문 분석</TabsTrigger>
                        <TabsTrigger value="phrases"><CheckSquare size={14} />단어 정리</TabsTrigger>
                      </TabsList>
                      <TabsContent value="translation">
                        <div className="reading-study-assist-panel">
                          <div className="reading-study-assist-head">
                            <strong>전체 해석</strong>
                            <Badge variant={selectedMaterial.translationText ? "success" : "secondary"}>
                              {selectedMaterial.translationText ? "연결됨" : "준비 중"}
                            </Badge>
                          </div>
                          {selectedMaterial.translationText ? (
                            <p className="translation-copy">{selectedMaterial.translationText}</p>
                          ) : (
                            <div className="translation-empty">
                              <strong>해석 데이터가 아직 없습니다.</strong>
                              <span>독해 자료에서 전체 해석을 생성하거나 입력하세요.</span>
                            </div>
                          )}
                        </div>
                      </TabsContent>
                      <TabsContent value="syntax">
                        <div className="reading-study-assist-panel">
                          {selectedMaterial.chunkAnalysisText || selectedMaterial.grammarAnalysisText ? (
                            <div className="stored-analysis-summary">
                              {selectedMaterial.chunkAnalysisText ? (
                                <section>
                                  <h3>청크 분석</h3>
                                  <p>{selectedMaterial.chunkAnalysisText}</p>
                                </section>
                              ) : null}
                              {selectedMaterial.grammarAnalysisText ? (
                                <section>
                                  <h3>문법 분석</h3>
                                  <p>{selectedMaterial.grammarAnalysisText}</p>
                                </section>
                              ) : null}
                            </div>
                          ) : null}
                          {syntaxSentences.length > 0 ? (
                            <ol className="syntax-sentence-list">
                              {syntaxSentences.map((sentence, index) => (
                                <li key={`${index}-${sentence}`}>
                                  <span>{index + 1}</span>
                                  <p>{sentence}</p>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => openSyntaxSentence(sentence, index)}
                                    disabled={analyzingSentenceIndex !== null}
                                  >
                                    {analyzingSentenceIndex === index ? <Loader2 size={14} className="spin" /> : <Search size={14} />}
                                    {savedSentenceAnalyses.has(syntaxCacheKey(sentence, index)) ? "보기" : "분석"}
                                  </Button>
                                </li>
                              ))}
                            </ol>
                          ) : (
                            <p className="assist-muted">분석할 문장이 없습니다.</p>
                          )}
                        </div>
                      </TabsContent>
                      <TabsContent value="phrases">
                        <div className="reading-study-assist-panel">
                          <div className="reading-study-assist-head">
                            <strong>단어 정리</strong>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => void generateSelectedVocabulary()}
                              disabled={generatingVocabulary || !selectedMaterial.originalText.trim()}
                            >
                              {generatingVocabulary ? <Loader2 size={14} className="spin" /> : <CheckSquare size={14} />}
                              {generatingVocabulary ? "정리 중" : "단어 정리 AI"}
                            </Button>
                          </div>
                          {vocabularyError ? <div className="folder-dialog-error">{vocabularyError}</div> : null}
                          {selectedVocabulary.length > 0 ? (
                            <VocabularyDisplay items={selectedVocabulary} />
                          ) : (
                            <div className="translation-empty">
                              <strong>저장된 단어 정리가 없습니다.</strong>
                              <span>단어 정리 AI를 실행하거나 독해 자료 수정에서 직접 입력하세요.</span>
                            </div>
                          )}
                        </div>
                      </TabsContent>
                    </Tabs>
                  </aside>
                </div>
              </>
            ) : (
              <div className="material-empty">독해 자료에서 학습할 자료를 오늘의 학습으로 지정하세요.</div>
            )}
          </section>
        </div>
        {syntaxDialog ? (
          <SyntaxAnalysisDialog
            state={syntaxDialog}
            loading={analyzingSentenceIndex === syntaxDialog.sentenceIndex}
            onReanalyze={() => void analyzeSyntaxSentence(syntaxDialog.sentence, syntaxDialog.sentenceIndex, true)}
            onClose={() => setSyntaxDialog(null)}
          />
        ) : null}
      </div>
    </section>
  );
}

function VocabularyEditor({
  disabled,
  loading,
  saving,
  items,
  onSave,
}: {
  disabled: boolean;
  loading: boolean;
  saving: boolean;
  items: ReadingVocabularyItem[];
  onSave: (items: ReadingVocabularyItemUpsertRequest[]) => Promise<void>;
}) {
  const [rows, setRows] = useState<VocabularyEntry[]>([]);
  const columnDefs = useMemo<ColDef<VocabularyEntry>[]>(() => [
    { field: "word", headerName: "단어", editable: !disabled, flex: 0.9, minWidth: 110 },
    { field: "meaning", headerName: "뜻", editable: !disabled, flex: 1, minWidth: 120 },
    { field: "note", headerName: "메모", editable: !disabled, flex: 1.4, minWidth: 160 },
  ], [disabled]);

  useEffect(() => {
    setRows(items.map((item) => ({
      id: item.id,
      word: item.word,
      meaning: item.meaning,
      note: item.note ?? "",
    })));
  }, [items]);

  const addEntry = () => setRows((prev) => [...prev, { word: "", meaning: "", note: "" }]);
  const removeEmptyRows = () => setRows((prev) => prev.filter((entry) => entry.word.trim() || entry.meaning.trim() || entry.note.trim()));
  const saveRows = () => onSave(rows.map((entry, index) => ({
    id: entry.id ?? null,
    word: entry.word,
    meaning: entry.meaning,
    note: entry.note,
    displayOrder: index,
  })));

  return (
    <div className="material-vocabulary-editor grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-bold text-slate-500">
          {disabled ? "자료를 저장한 뒤 단어 정리를 편집할 수 있습니다." : `${rows.length}개 단어`}
        </span>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={addEntry} disabled={disabled || loading}>+ 행 추가</Button>
          <Button type="button" variant="outline" size="sm" onClick={removeEmptyRows} disabled={disabled || loading}>빈 행 정리</Button>
          <Button type="button" size="sm" onClick={() => void saveRows()} disabled={disabled || loading || saving}>
            {saving ? <Loader2 size={14} className="spin" /> : <Save size={14} />}
            {saving ? "저장 중" : "단어 저장"}
          </Button>
        </div>
      </div>
      <div className="ag-theme-quartz material-vocabulary-grid">
        <AgGridReact<VocabularyEntry>
          theme="legacy"
          rowData={rows}
          columnDefs={columnDefs}
          defaultColDef={{ sortable: false, resizable: true, editable: !disabled }}
          stopEditingWhenCellsLoseFocus
          domLayout="normal"
          onCellValueChanged={(event) => {
            const nextRows = [...rows];
            if (event.rowIndex !== null && event.rowIndex >= 0) {
              nextRows[event.rowIndex] = event.data;
              setRows(nextRows);
            }
          }}
          overlayNoRowsTemplate={loading ? "단어를 불러오는 중입니다." : "단어 정리를 직접 추가하거나 AI로 생성하세요."}
        />
      </div>
    </div>
  );
}

function VocabularyDisplay({ items }: { items: Array<Pick<ReadingVocabularyItem, "word" | "meaning" | "note">> }) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200">
      <table className="w-full border-collapse text-left text-sm">
        <thead className="bg-slate-50 text-xs font-black text-slate-500">
          <tr>
            <th className="border-b border-slate-200 px-3 py-2">단어</th>
            <th className="border-b border-slate-200 px-3 py-2">뜻</th>
            <th className="border-b border-slate-200 px-3 py-2">메모</th>
          </tr>
        </thead>
        <tbody>
          {items.map((entry, index) => (
            <tr key={`${entry.word}-${index}`} className="align-top">
              <td className="border-b border-slate-100 px-3 py-2 font-extrabold text-slate-900">{entry.word}</td>
              <td className="border-b border-slate-100 px-3 py-2 text-slate-700">{entry.meaning}</td>
              <td className="border-b border-slate-100 px-3 py-2 text-slate-600">{entry.note ?? ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SyntaxAnalysisDialog({
  state,
  loading,
  onReanalyze,
  onClose,
}: {
  state: SyntaxDialogState;
  loading: boolean;
  onReanalyze: () => void;
  onClose: () => void;
}) {
  return (
    <Dialog className="material-dialog-backdrop z-[90] bg-slate-950/30 p-8" onClose={onClose}>
      <DialogContent className="syntax-analysis-dialog max-w-none">
        <div className="folder-dialog-head">
          <div>
            <span>Sentence Analysis</span>
            <h2>{state.sentenceIndex + 1}번 문장 분석</h2>
          </div>
          <div className="inline-flex items-center gap-2">
            <Button type="button" size="sm" variant="outline" onClick={onReanalyze} disabled={loading}>
              {loading ? <Loader2 size={14} className="spin" /> : <Search size={14} />}
              재분석
            </Button>
            <button type="button" className="icon-button" onClick={onClose} aria-label="닫기" title="닫기">
              <X size={18} />
            </button>
          </div>
        </div>

        <blockquote>{state.sentence}</blockquote>

        {loading ? (
          <div className="syntax-analysis-loading rounded-2xl border border-slate-200 bg-slate-50 p-8">
            <div className="relative h-20 w-32">
              <div className="absolute left-2 top-4 h-12 w-20 rounded-xl border border-slate-300 bg-white shadow-sm" />
              <div className="absolute left-10 top-1 h-14 w-20 rounded-xl border border-emerald-200 bg-emerald-50 shadow-sm" />
              <Search className="absolute bottom-0 right-3 text-slate-700" size={30} />
            </div>
            <Loader2 className="spin text-emerald-600" size={18} />
            <span>문장을 분석하는 중입니다.</span>
          </div>
        ) : state.error ? (
          <div className="folder-dialog-error">{state.error}</div>
        ) : state.analysis ? (
          <div className="syntax-analysis-grid">
            <SyntaxAnalysisSection title="청크 분석" items={state.analysis.chunks} emptyText="청크 분석 결과가 없습니다." />
            <SyntaxAnalysisSection title="문법 분석" items={state.analysis.grammar} emptyText="문법 분석 결과가 없습니다." />
            {state.analysis.raw ? <pre>{state.analysis.raw}</pre> : null}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function SyntaxAnalysisSection({ title, items, emptyText }: { title: string; items: string[]; emptyText: string }) {
  return (
    <section>
      <h3>{title}</h3>
      {items.length > 0 ? (
        <ul>
          {items.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}
        </ul>
      ) : (
        <p>{emptyText}</p>
      )}
    </section>
  );
}

function splitReadingSentences(text: string) {
  return text
    .replace(/\s+/g, " ")
    .match(/[^.!?]+[.!?]+(?:["')\]]+)?|[^.!?]+$/g)
    ?.map((sentence) => sentence.trim())
    .filter(Boolean) ?? [];
}

function parseSentenceAnalysis(content: string): SentenceAnalysis {
  const normalized = content.trim();
  const jsonText = normalized.match(/```json\s*([\s\S]*?)```/)?.[1]
    ?? normalized.match(/```\s*([\s\S]*?)```/)?.[1]
    ?? normalized;
  try {
    const parsed = JSON.parse(jsonText) as Partial<SentenceAnalysis>;
    return {
      chunks: normalizeAnalysisItems(parsed.chunks),
      grammar: normalizeAnalysisItems(parsed.grammar),
    };
  } catch {
    return {
      chunks: [],
      grammar: [],
      raw: normalized,
    };
  }
}

function parseStoredSentenceAnalysisMap(content?: string | null) {
  const map = new Map<string, SentenceAnalysis>();
  if (!content?.trim()) return map;
  try {
    const parsed = JSON.parse(content) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return map;
    Object.entries(parsed).forEach(([key, value]) => {
      if (!value || typeof value !== "object") return;
      const analysis = value as Partial<SentenceAnalysis>;
      map.set(key, {
        chunks: normalizeAnalysisItems(analysis.chunks),
        grammar: normalizeAnalysisItems(analysis.grammar),
        raw: typeof analysis.raw === "string" ? analysis.raw : undefined,
      });
    });
  } catch {
    return map;
  }
  return map;
}

function serializeSentenceAnalysisMap(map: Map<string, SentenceAnalysis>) {
  return JSON.stringify(Object.fromEntries(map));
}

async function requestVocabularyAnalysis(apiUrl: string, token: string, text: string) {
  const result = await sendChat(apiUrl, token, {
    agentId: "reading-vocabulary-analyzer",
    history: [],
    instructions: [
      "You are an English reading tutor for Korean middle and high school students.",
      "Create vocabulary notes for the full English passage.",
      "Return only JSON with key keyExpressionItems.",
      "keyExpressionItems must be an array of objects with word, meaning, note.",
      "word: English word or expression. meaning: Korean meaning. note: short Korean reading tip.",
      "Select only vocabulary that helps comprehension. Do not include every word.",
    ].join("\n"),
    message: `다음 독해 지문 전체에 대한 단어 정리를 만들어줘:\n${text}`,
  });
  return parseVocabularyAnalysis(result.content);
}

function parseVocabularyAnalysis(content: string): VocabularyEntry[] {
  const normalized = content.trim();
  const jsonText = normalized.match(/```json\s*([\s\S]*?)```/)?.[1]
    ?? normalized.match(/```\s*([\s\S]*?)```/)?.[1]
    ?? normalized;
  try {
    const parsed = JSON.parse(jsonText) as { keyExpressionItems?: unknown; keyExpressionText?: unknown };
    const entries = parseVocabularyEntries(parsed.keyExpressionItems);
    if (entries.length > 0) return entries;
    return parseVocabularyEntries(parsed.keyExpressionText);
  } catch {
    return parseLegacyVocabularyText(normalized);
  }
}

function parseVocabularyEntries(value: unknown): VocabularyEntry[] {
  if (!value) return [];
  if (typeof value === "string") {
    try {
      return parseVocabularyEntries(JSON.parse(value));
    } catch {
      return [];
    }
  }
  const rawItems = Array.isArray(value)
    ? value
    : typeof value === "object" && "items" in value
      ? (value as { items?: unknown }).items
      : [];
  if (!Array.isArray(rawItems)) return [];
  return rawItems
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const candidate = item as Partial<Record<keyof VocabularyEntry, unknown>>;
      return {
        word: typeof candidate.word === "string" ? candidate.word.trim() : "",
        meaning: typeof candidate.meaning === "string" ? candidate.meaning.trim() : "",
        note: typeof candidate.note === "string" ? candidate.note.trim() : "",
      };
    })
    .filter((entry): entry is VocabularyEntry => Boolean(entry && (entry.word || entry.meaning || entry.note)));
}

function parseLegacyVocabularyText(text: string): VocabularyEntry[] {
  return text
    .split("\n")
    .map((line) => line.replace(/^[-*\s]+/, "").trim())
    .filter(Boolean)
    .map((line) => {
      const [wordPart, rest = ""] = line.split(/[:：]|—|–|-/, 2).map((part) => part.trim());
      return { word: wordPart, meaning: rest, note: "" };
    })
    .filter((entry) => entry.word || entry.meaning);
}

function normalizeAnalysisItems(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .map((item) => typeof item === "string" ? item : JSON.stringify(item))
      .map((item) => item.trim())
      .filter(Boolean);
  }
  if (typeof value === "string" && value.trim()) return [value.trim()];
  return [];
}

function ProfileView({ userName, icon, appUpdate }: { userName: string; icon: WebMenu["icon"]; appUpdate: AppUpdateControls }) {
  return (
    <SimpleView
      title="프로필"
      description={`${userName} 계정으로 Falcon Reading에 로그인되어 있습니다.`}
      icon={icon}
      items={["학습 서버 연결", "계정 정보", "개인 자료 보관함", `앱 버전 v${appUpdate.state.currentVersion}`]}
    >
      <AppUpdatePanel
        updateState={appUpdate.state}
        busy={appUpdate.busy}
        onCheckUpdate={() => void appUpdate.checkForUpdate()}
        onInstallUpdate={() => void appUpdate.installUpdate()}
      />
    </SimpleView>
  );
}

function SimpleView({
  title,
  description,
  icon: Icon,
  items = ["학습 서버 연결", "계정 정보", "개인 자료 보관함", `앱 버전 v${appVersion}`],
  children,
}: {
  title: string;
  description: string;
  icon: WebMenu["icon"];
  items?: string[];
  children?: ReactNode;
}) {
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
              <Icon size={18} />
              <strong>{item}</strong>
            </article>
          ))}
        </div>
        {children}
      </div>
    </section>
  );
}

function StatusBadge({ status }: { status: ReadingMaterialStatus }) {
  return (
    <em className={`material-status ${status === "READY" ? "ready" : status === "ANALYSIS_PENDING" ? "pending" : "raw"}`}>
      {statusLabels[status]}
    </em>
  );
}

function buildTreeSections(folders: ReadingFolder[], tree?: { dates: Array<{ key: string; label: string; count: number }>; sourceTypes: Array<{ key: string; label: string; count: number }>; statuses: Array<{ key: string; label: string; count: number }> }): ReadingTreeSection[] {
  const folderNodes = buildFolderNodes(folders, null, 0);
  return [
    {
      id: "library",
      label: "내 폴더",
      nodes: folderNodes,
    },
    {
      id: "dates",
      label: "날짜별",
      nodes: (tree?.dates ?? []).map((date) => ({
        id: `date:${date.key}`,
        label: date.label,
        count: date.count,
        filter: { kind: "date", date: date.key },
      })),
    },
    {
      id: "sourceTypes",
      label: "유형별",
      nodes: (tree?.sourceTypes ?? []).map((sourceType) => ({
        id: `source:${sourceType.key}`,
        label: sourceType.label,
        count: sourceType.count,
        filter: { kind: "sourceType", sourceType: sourceType.key as ReadingSourceType },
      })),
    },
    {
      id: "statuses",
      label: "상태별",
      nodes: (tree?.statuses ?? []).map((status) => ({
        id: `status:${status.key}`,
        label: status.label,
        count: status.count,
        filter: { kind: "status", status: status.key as ReadingMaterialStatus },
      })),
    },
  ];
}

function buildFolderNodes(folders: ReadingFolder[], parentId: number | null, depth: number): ReadingTreeSection["nodes"] {
  return folders
    .filter((folder) => folder.parentId === parentId)
    .sort((a, b) => a.displayOrder - b.displayOrder || a.id - b.id)
    .flatMap((folder) => [
      {
        id: `folder:${folder.id}`,
        label: folder.name,
        count: folder.materialCount,
        depth,
        parentFolderId: folder.parentId,
        filter: { kind: "folder" as const, folderId: folder.id },
      },
      ...buildFolderNodes(folders, folder.id, depth + 1),
    ]);
}

function buildFolderOptions(folders: ReadingFolder[]) {
  return [
    { value: "", label: "폴더 선택", disabled: true },
    ...buildFolderNodes(folders, null, 0).map((node) => ({
      value: node.filter.kind === "folder" ? String(node.filter.folderId) : "",
      label: `${"  ".repeat(node.depth ?? 0)}${node.label}`,
    })),
  ];
}

function formFromMaterial(material: ReadingMaterial): ReadingMaterialUpsertRequest {
  return {
    folderId: material.folderId,
    title: material.title,
    sourceType: material.sourceType,
    level: material.level,
    status: material.status,
    sourceUrl: material.sourceUrl ?? "",
    originalText: material.originalText,
    translationText: material.translationText ?? "",
    chunkAnalysisText: material.chunkAnalysisText ?? "",
    grammarAnalysisText: material.grammarAnalysisText ?? "",
    keyExpressionText: material.keyExpressionText ?? "",
    sentenceAnalysisText: material.sentenceAnalysisText ?? "",
    collectedDate: material.collectedDate,
  };
}

function activeTreeTitle(activeTreeId: string, sections: ReadingTreeSection[]) {
  if (activeTreeId === "all") return "전체 자료";
  return sections.flatMap((section) => section.nodes).find((node) => node.id === activeTreeId)?.label ?? "전체 자료";
}

function buildVocabularyFilterSections(rows: VocabularyGridRow[], folders: ReadingFolder[]): VocabularyFilterSection[] {
  const countByFolder = new Map<number, number>();
  const countByDate = new Map<string, number>();
  const countBySourceType = new Map<ReadingSourceType, number>();
  let missingMeaningCount = 0;
  let hasNoteCount = 0;
  let duplicateCount = 0;

  rows.forEach((row) => {
    if (row.folderId !== null) countByFolder.set(row.folderId, (countByFolder.get(row.folderId) ?? 0) + 1);
    if (row.collectedDate) countByDate.set(row.collectedDate, (countByDate.get(row.collectedDate) ?? 0) + 1);
    if (row.sourceType) countBySourceType.set(row.sourceType, (countBySourceType.get(row.sourceType) ?? 0) + 1);
    if (!row.meaning.trim()) missingMeaningCount += 1;
    if (row.note?.trim()) hasNoteCount += 1;
    if (row.duplicateCount > 1) duplicateCount += 1;
  });

  return [
    {
      id: "library",
      label: "내 폴더",
      nodes: buildFolderNodes(folders, null, 0)
        .map((node) => ({
          id: node.id,
          label: node.label,
          depth: node.depth,
          parentFolderId: node.parentFolderId,
          count: node.filter.kind === "folder" ? countByFolder.get(node.filter.folderId) ?? 0 : 0,
          filter: node.filter.kind === "folder"
            ? { kind: "folder", folderId: node.filter.folderId } as VocabularyFilter
            : { kind: "all" } as VocabularyFilter,
        }))
    },
    {
      id: "dates",
      label: "날짜별",
      nodes: Array.from(countByDate.entries())
        .map(([date, count]) => ({
          id: `date:${date}`,
          label: date,
          count,
          filter: { kind: "date", date } as VocabularyFilter,
        }))
        .sort((a, b) => b.label.localeCompare(a.label)),
    },
    {
      id: "sourceTypes",
      label: "유형별",
      nodes: Object.entries(sourceTypeLabels).map(([sourceType, label]) => ({
        id: `source:${sourceType}`,
        label,
        count: countBySourceType.get(sourceType as ReadingSourceType) ?? 0,
        filter: { kind: "sourceType", sourceType: sourceType as ReadingSourceType } as VocabularyFilter,
      })),
    },
    {
      id: "statuses",
      label: "상태별",
      nodes: [
        { id: "status:missingMeaning", label: "뜻 없음", count: missingMeaningCount, filter: { kind: "status", status: "missingMeaning" } as VocabularyFilter },
        { id: "status:hasNote", label: "메모 있음", count: hasNoteCount, filter: { kind: "status", status: "hasNote" } as VocabularyFilter },
        { id: "status:duplicate", label: "중복 의심", count: duplicateCount, filter: { kind: "status", status: "duplicate" } as VocabularyFilter },
      ].filter((node) => node.count > 0),
    },
  ];
}

function matchesVocabularyFilter(row: VocabularyGridRow, filter: VocabularyFilter) {
  if (filter.kind === "all") return true;
  if (filter.kind === "material") return row.materialId === filter.materialId;
  if (filter.kind === "folder") return row.folderId === filter.folderId;
  if (filter.kind === "date") return row.collectedDate === filter.date;
  if (filter.kind === "sourceType") return row.sourceType === filter.sourceType;
  if (filter.status === "missingMeaning") return !row.meaning.trim();
  if (filter.status === "hasNote") return Boolean(row.note?.trim());
  return row.duplicateCount > 1;
}

function vocabularyFilterTitle(activeFilterId: string, sections: ReturnType<typeof buildVocabularyFilterSections>) {
  if (activeFilterId === "all") return "전체 단어";
  return sections.flatMap((section) => section.nodes).find((node) => node.id === activeFilterId)?.label ?? "전체 단어";
}

function toggleSetValue<T>(set: Set<T>, value: T) {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

function useLearningQueue() {
  const [queue, setQueueState] = useState<string[]>(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem(LEARNING_QUEUE_KEY) || "[]");
      return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
    } catch {
      return [];
    }
  });

  const setQueue = (updater: string[] | ((prev: string[]) => string[])) => {
    setQueueState((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      localStorage.setItem(LEARNING_QUEUE_KEY, JSON.stringify(next));
      return next;
    });
  };

  return [queue, setQueue] as const;
}
