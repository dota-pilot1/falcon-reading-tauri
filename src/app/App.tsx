import { getVersion } from "@tauri-apps/api/app";
import { useMemo, useState, useEffect } from "react";
import {
  BookOpenCheck,
  CheckSquare,
  FileText,
  Languages,
  Link,
  Loader2,
  Play,
  Plus,
  Save,
  X,
} from "lucide-react";
import { defaultApiUrl, unauthorizedEventName } from "../shared/api/client";
import { Button } from "../shared/ui/Button";
import { Select } from "../shared/ui/Select";
import { Dialog, DialogContent } from "../shared/ui/Dialog";
import { Badge } from "../shared/ui/Badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../shared/ui/Tabs";
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
} from "../entities/reading-material";
import { translateToKorean } from "../entities/chat/api/chatApi";
import { WEB_HEADER_MENUS, PROFILE_MENU, SETTINGS_MENU, canAccessMenu, type WebMenu, type WebMenuId } from "./model/navigation";
import {
  useInvalidateReadingMaterials,
  useReadingMaterialsQuery,
  useReadingTreeQuery,
} from "../features/reading-materials/model/useReadingMaterialQueries";

type ConnectionStatus = "checking" | "online" | "offline";

const LEARNING_QUEUE_KEY = "falcon-reading:learning-queue";
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
  const [activeMenu, setActiveMenu] = useState<WebMenuId>("readingMaterials");
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("checking");
  const [appVersion, setAppVersion] = useState("0.1.16");

  useEffect(() => {
    void getVersion().then(setAppVersion).catch(() => undefined);
  }, []);

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
        appVersion={appVersion}
        onOpenMenu={openMenu}
        onLogout={() => void handleLogout()}
      />
      <div className="app-main">
        <AppTopbar activeWebMenu={activeWebMenu} activeMenu={activeMenu} />
        <FalconWorkspace activeMenu={activeMenu} activeWebMenu={activeWebMenu} apiUrl={apiUrl} token={token} userName={user.username || user.email} />
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
}: {
  activeMenu: WebMenuId;
  activeWebMenu: WebMenu;
  apiUrl: string;
  token: string;
  userName: string;
}) {
  if (activeMenu === "readingMaterials") return <ReadingMaterialsView apiUrl={apiUrl} token={token} />;
  if (activeMenu === "readingStudy") return <ReadingStudyView apiUrl={apiUrl} token={token} />;
  if (activeMenu === "profile") {
    return <SimpleView title="프로필" description={`${userName} 계정으로 Falcon Reading에 로그인되어 있습니다.`} icon={activeWebMenu.icon} />;
  }
  return <SimpleView title="설정" description="자료 저장, AI 해석, 서버 연결 같은 앱 환경을 관리합니다." icon={activeWebMenu.icon} />;
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
            onSave={() => void saveMaterial()}
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
  onSave: () => void;
}) {
  return (
    <Dialog className="material-dialog-backdrop z-[80] bg-slate-950/30 p-8" onClose={onClose}>
      <DialogContent className="material-dialog grid max-h-[calc(100vh-96px)] w-[min(1120px,calc(100vw-96px))] max-w-none overflow-auto rounded-[10px] border border-zinc-200 bg-white p-[18px] shadow-2xl">
        <div className="editor-section-title">
          <div>
            <span>{selectedMaterialId ? "Saved Material" : "New Material"}</span>
            <h2>{selectedMaterialId ? "독해 자료 수정" : "새 독해 자료 등록"}</h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="닫기" title="닫기">
            <X size={18} />
          </button>
        </div>

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
            <input value={form.collectedDate} onChange={(event) => onChange((prev) => ({ ...prev, collectedDate: event.target.value }))} />
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

function ReadingStudyView({ apiUrl, token }: { apiUrl: string; token: string }) {
  const [queue, setQueue] = useLearningQueue();
  const [selectedId, setSelectedId] = useState<string | null>(queue[0] ?? null);
  const { data: allMaterials = [], isLoading, error } = useReadingMaterialsQuery(apiUrl, token, { kind: "all" });
  const materialMap = useMemo(() => new Map(allMaterials.map((material) => [material.id, material])), [allMaterials]);
  const queuedMaterials = queue.map((id) => materialMap.get(id)).filter(Boolean) as ReadingMaterial[];
  const selectedMaterial = selectedId ? materialMap.get(selectedId) ?? queuedMaterials[0] ?? null : queuedMaterials[0] ?? null;

  useEffect(() => {
    if (!selectedMaterial && queuedMaterials[0]) setSelectedId(queuedMaterials[0].id);
  }, [queuedMaterials, selectedMaterial]);

  const removeFromQueue = (id: string) => {
    setQueue((prev) => prev.filter((item) => item !== id));
    if (selectedId === id) setSelectedId(null);
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
                  전체
                  <strong>{allMaterials.length}</strong>
                </span>
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
                        <TabsTrigger value="phrases"><CheckSquare size={14} />핵심 표현</TabsTrigger>
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
                          <p className="assist-muted">구문 분석 데이터가 연결되면 이 영역에 표시됩니다.</p>
                        </div>
                      </TabsContent>
                      <TabsContent value="phrases">
                        <div className="reading-study-assist-panel">
                          <div className="phrase-grid">
                            {extractKeywords(selectedMaterial.originalText).map((keyword) => <span key={keyword}>{keyword}</span>)}
                          </div>
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
      </div>
    </section>
  );
}

function SimpleView({ title, description, icon: Icon }: { title: string; description: string; icon: WebMenu["icon"] }) {
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
          {["학습 서버 연결", "계정 정보", "개인 자료 보관함", "앱 버전 v0.1.16"].map((item) => (
            <article className="simple-card" key={item}>
              <Icon size={18} />
              <strong>{item}</strong>
            </article>
          ))}
        </div>
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
    collectedDate: material.collectedDate,
  };
}

function activeTreeTitle(activeTreeId: string, sections: ReadingTreeSection[]) {
  if (activeTreeId === "all") return "전체 자료";
  return sections.flatMap((section) => section.nodes).find((node) => node.id === activeTreeId)?.label ?? "전체 자료";
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

function extractKeywords(text: string) {
  return Array.from(new Set(text.match(/\b[A-Za-z][A-Za-z-]{5,}\b/g) ?? [])).slice(0, 12);
}
