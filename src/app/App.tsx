import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  CircleAlert,
  Link,
  Plus,
  Save,
} from "lucide-react";
import { WEB_HEADER_MENUS, PROFILE_MENU, SETTINGS_MENU, canAccessMenu, type WebMenu, type WebMenuId } from "./model/navigation";
import { LoginScreen } from "../features/auth/login/LoginScreen";
import { login, logout, signup } from "../features/auth/api/authApi";
import { useAuthSession } from "../features/auth/model/useAuthSession";
import { defaultApiUrl, unauthorizedEventName } from "../shared/api/client";
import { AppSidebar } from "../widgets/app-shell/ui/AppSidebar";
import { AppTopbar } from "../widgets/app-shell/ui/AppTopbar";
import { Button } from "../shared/ui/Button";
import { Select } from "../shared/ui/Select";
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
  fetchReadingTree,
  renameReadingFolder,
  reorderReadingFolders,
  updateReadingMaterial,
} from "../entities/reading-material/api/readingMaterialApi";

const appVersion = "0.1.16";

type ConnectionStatus = "checking" | "online" | "offline";

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

function paramsFromFilter(filter: ReadingTreeFilter) {
  if (filter.kind === "folder") return { folderId: filter.folderId };
  if (filter.kind === "date") return { date: filter.date };
  if (filter.kind === "sourceType") return { sourceType: filter.sourceType };
  if (filter.kind === "status") return { status: filter.status };
  return {};
}

function ReadingMaterialsView({ apiUrl, token }: { apiUrl: string; token: string }) {
  const [tree, setTree] = useState<ReadingTreeResponse | null>(null);
  const [materials, setMaterials] = useState<ReadingMaterial[]>([]);
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
  const treeSections = useMemo(() => (tree ? buildTreeSections(tree) : []), [tree]);
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

  const reloadTree = async () => {
    const nextTree = await fetchReadingTree(apiUrl, token);
    setTree(nextTree);
  };

  const reloadMaterials = async (filter: ReadingTreeFilter = activeFilter) => {
    const items = await fetchReadingMaterials(apiUrl, token, paramsFromFilter(filter));
    setMaterials(items);
    setSelectedMaterialId(items[0]?.id ?? null);
    setForm(items[0] ? formFromMaterial(items[0]) : emptyForm);
  };

  const refreshReadingWorkspace = async () => {
    setRefreshingTree(true);
    setError("");
    try {
      await Promise.all([reloadTree(), reloadMaterials(activeFilter)]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "자료 트리를 새로고침하지 못했습니다.");
    } finally {
      setRefreshingTree(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    void Promise.all([fetchReadingTree(apiUrl, token), fetchReadingMaterials(apiUrl, token)])
      .then(([nextTree, items]) => {
        if (cancelled) return;
        setTree(nextTree);
        setMaterials(items);
        setSelectedMaterialId(items[0]?.id ?? null);
        setForm(items[0] ? formFromMaterial(items[0]) : emptyForm);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "독해 자료를 불러오지 못했습니다.");
      });
    return () => {
      cancelled = true;
    };
  }, [apiUrl, token]);

  const selectTreeNode = (nodeId: string, filter: ReadingTreeFilter) => {
    setActiveTreeId(nodeId);
    setError("");
    void reloadMaterials(filter).catch((err: unknown) => {
      setError(err instanceof Error ? err.message : "자료 목록을 불러오지 못했습니다.");
    });
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
        const nextTree = await fetchReadingTree(apiUrl, token);
        setTree(nextTree);
        closeFolderDialog();
        setActiveTreeId(`folder:${folder.id}`);
        await reloadMaterials({ kind: "folder", folderId: folder.id });
        setForm((prev) => ({ ...prev, folderId: folder.id }));
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
      const renamedFolder = await renameReadingFolder(apiUrl, token, folderDialog.folderId, { name });
      setTree((prev) =>
        prev
          ? {
              ...prev,
              folders: prev.folders.map((folder) => (folder.id === renamedFolder.id ? renamedFolder : folder)),
            }
          : prev
      );
      await reloadTree();
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
      await reloadTree();
      if (activeTreeId === `folder:${folderId}`) {
        setActiveTreeId("all");
        await reloadMaterials({ kind: "all" });
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
      await reloadTree();
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
      await reloadTree();
      await reloadMaterials(activeFilter);
      setSelectedMaterialId(saved.id);
      setForm(formFromMaterial(saved));
      setMaterialDialogOpen(false);
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

        {error ? <div className="material-error">{error}</div> : null}

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
                <span>Reading Materials</span>
                <h2>{activeTreeLabel}</h2>
              </div>
              <Button type="button" onClick={startNewMaterial}><Plus size={16} /> 자료 추가</Button>
            </div>

            <div className="material-inline-list">
              <div className="material-inline-head">
                <strong>독해 자료</strong>
                <span>{materials.length}</span>
              </div>
              {materials.length === 0 ? <div className="material-empty">선택한 트리에 저장된 자료가 없습니다.</div> : null}
              {materials.map((material) => (
                <MaterialCard key={material.id} material={material} active={material.id === selectedMaterialId} onSelect={() => selectMaterial(material)} />
              ))}
            </div>
          </main>
        </div>
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

function MaterialCard({ material, active, onSelect }: { material: ReadingMaterial; active: boolean; onSelect: () => void }) {
  return (
    <button className={`material-card ${active ? "active" : ""}`} type="button" onClick={onSelect}>
      <strong>{material.title}</strong>
      <span>{sourceTypeLabels[material.sourceType]} · {material.level}</span>
      <small>{material.wordCount} words · {material.estimatedMinutes}분</small>
      <MaterialStatus status={material.status} />
    </button>
  );
}

function MaterialStatus({ status }: { status: ReadingMaterial["status"] }) {
  return <em className={`material-status ${status === "READY" ? "ready" : status === "ANALYSIS_PENDING" ? "pending" : "raw"}`}>{statusLabels[status]}</em>;
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
