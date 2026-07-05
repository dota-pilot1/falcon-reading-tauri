import { useEffect, useMemo, useState } from "react";
import {
  BookOpenText,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  Clock,
  FileText,
  Folder,
  FolderOpen,
  Link,
  Plus,
  Save,
  Search,
  Sparkles,
  Zap,
} from "lucide-react";
import { WEB_HEADER_MENUS, PROFILE_MENU, canAccessMenu, type WebMenu, type WebMenuId } from "./model/navigation";
import { LoginScreen } from "../features/auth/login/LoginScreen";
import { login, logout, signup } from "../features/auth/api/authApi";
import { useAuthSession } from "../features/auth/model/useAuthSession";
import { defaultApiUrl, unauthorizedEventName } from "../shared/api/client";
import { AppSidebar } from "../widgets/app-shell/ui/AppSidebar";
import { AppTopbar } from "../widgets/app-shell/ui/AppTopbar";
import { Button } from "../shared/ui/Button";
import {
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
import {
  createReadingMaterial,
  fetchReadingMaterials,
  fetchReadingTree,
  updateReadingMaterial,
} from "../entities/reading-material/api/readingMaterialApi";

const appVersion = "0.1.15";

type ConnectionStatus = "checking" | "online" | "offline";

const sampleSentences = [
  "The fastest learners do not translate every word; they track the writer's purpose.",
  "When a document says should, it usually signals a recommendation rather than a hard rule.",
  "Listening improves when the script becomes a tool for checking, not a crutch for guessing.",
];

const sampleWords = ["track", "signal", "recommendation", "crutch", "rather than"];

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
          filter,
        },
        ...buildFolderNodes(tree, folder.id, depth + 1),
      ];
    });
}

function buildTreeSections(tree: ReadingTreeResponse, totalCount: number): ReadingTreeSection[] {
  return [
    {
      id: "library",
      label: "내 폴더",
      nodes: [
        { id: "all", label: "전체 자료", count: totalCount, filter: { kind: "all" } },
        ...buildFolderNodes(tree, null),
      ],
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

function formatSavedAt(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function App() {
  const apiUrl = defaultApiUrl;
  const { token, user, setToken, setRefreshToken, setUser } = useAuthSession();
  const [activeMenu, setActiveMenu] = useState<WebMenuId>("home");
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("checking");
  const isLoggedIn = token.trim().length > 0 && user !== null;
  const activeWebMenu = useMemo(
    () => [...WEB_HEADER_MENUS, PROFILE_MENU].find((menu) => menu.id === activeMenu) ?? WEB_HEADER_MENUS[0],
    [activeMenu]
  );
  const canAccessActiveMenu = canAccessMenu(user, activeMenu);

  useEffect(() => {
    const clearExpiredSession = () => {
      setToken("");
      setRefreshToken("");
      setUser(null);
      setActiveMenu("home");
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
    setActiveMenu("home");
  };

  const handleSignup = async (email: string, username: string, password: string) => {
    await signup(apiUrl, email, username, password);
  };

  const handleLogout = async () => {
    await logout(apiUrl, token);
    setToken("");
    setRefreshToken("");
    setUser(null);
    setActiveMenu("home");
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
  if (activeMenu === "home") return <HomeView userName={userName} apiUrl={apiUrl} token={token} />;
  if (activeMenu === "readingMaterials") return <ReadingMaterialsView apiUrl={apiUrl} token={token} />;
  if (activeMenu === "profile") return <ProfileView userName={userName} />;
  if (activeMenu === "settings") return <SettingsView />;
  return <HomeView userName={userName} apiUrl={apiUrl} token={token} />;
}

function HomeView({ userName, apiUrl, token }: { userName: string; apiUrl: string; token: string }) {
  const [materials, setMaterials] = useState<ReadingMaterial[]>([]);
  const [error, setError] = useState("");
  const readyCount = materials.filter((item) => item.status === "READY").length;
  const pendingCount = materials.filter((item) => item.status !== "READY").length;

  useEffect(() => {
    let cancelled = false;
    void fetchReadingMaterials(apiUrl, token)
      .then((items) => {
        if (!cancelled) setMaterials(items);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "독해 자료를 불러오지 못했습니다.");
      });
    return () => {
      cancelled = true;
    };
  }, [apiUrl, token]);

  return (
    <section className="falcon-view">
      <div className="falcon-inner">
        <header className="falcon-hero">
          <div>
            <span className="falcon-kicker"><Zap size={15} /> Falcon English</span>
            <h1>독해 자료를 학습 가능한 형태로 정리합니다</h1>
            <p>{userName}님의 영어 독해 자료를 모으고, 문장·단어·퀴즈 단위로 분석할 준비를 합니다.</p>
          </div>
          <div className="falcon-stats">
            <FalconStat icon={FileText} label="저장 자료" value={String(materials.length)} />
            <FalconStat icon={Sparkles} label="분석 대기" value={String(pendingCount)} />
            <FalconStat icon={CheckCircle2} label="학습 가능" value={String(readyCount)} />
          </div>
        </header>

        <div className="material-home-layout">
          <section className="material-home-main">
            <div className="falcon-section-head">
              <div>
                <h2>최근 저장한 자료</h2>
                <p>자료를 먼저 쌓아야 오늘 학습, 복습, 단어장이 의미 있게 작동합니다.</p>
              </div>
              <Button type="button"><Plus size={16} /> 새 자료 추가</Button>
            </div>
            <div className="recent-material-list">
              {error ? <div className="material-empty">{error}</div> : null}
              {!error && materials.length === 0 ? <div className="material-empty">아직 저장된 독해 자료가 없습니다.</div> : null}
              {materials.slice(0, 5).map((material) => (
                <MaterialRow key={material.id} material={material} />
              ))}
            </div>
          </section>

          <aside className="material-home-side">
            <div className="panel-title">
              <strong>자료화 파이프라인</strong>
              <Clock size={16} />
            </div>
            <div className="pipeline-list">
              <PipelineStep title="1. 원문 저장" body="출처 URL과 본문을 함께 저장합니다." />
              <PipelineStep title="2. 문장 분리" body="학습 가능한 문장 단위로 쪼갭니다." />
              <PipelineStep title="3. 단어 추출" body="반복 학습할 핵심 어휘를 선별합니다." />
              <PipelineStep title="4. 퀴즈 생성" body="내용 이해 문제로 학습 가능 상태를 만듭니다." />
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
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
  const [selectedMaterialId, setSelectedMaterialId] = useState<string | null>(null);
  const [form, setForm] = useState<ReadingMaterialUpsertRequest>(emptyForm);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const totalMaterialCount = tree?.sourceTypes.reduce((sum, item) => sum + item.count, 0) ?? materials.length;
  const treeSections = useMemo(() => (tree ? buildTreeSections(tree, totalMaterialCount) : []), [tree, totalMaterialCount]);
  const activeNode = treeSections.flatMap((section) => section.nodes).find((node) => node.id === activeTreeId) ?? treeSections[0]?.nodes[0];
  const selectedMaterial = materials.find((material) => material.id === selectedMaterialId) ?? materials[0] ?? null;

  const reloadTree = async () => {
    const nextTree = await fetchReadingTree(apiUrl, token);
    setTree(nextTree);
  };

  const reloadMaterials = async (filter: ReadingTreeFilter = activeNode?.filter ?? { kind: "all" }) => {
    const items = await fetchReadingMaterials(apiUrl, token, paramsFromFilter(filter));
    setMaterials(items);
    setSelectedMaterialId(items[0]?.id ?? null);
    setForm(items[0] ? formFromMaterial(items[0]) : emptyForm);
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

  const selectMaterial = (material: ReadingMaterial) => {
    setSelectedMaterialId(material.id);
    setForm(formFromMaterial(material));
  };

  const startNewMaterial = () => {
    setSelectedMaterialId(null);
    setForm({
      ...emptyForm,
      folderId: tree?.folders[0]?.id ?? null,
      originalText: sampleSentences.join("\n\n"),
    });
  };

  const saveMaterial = async () => {
    setSaving(true);
    setError("");
    try {
      const saved = selectedMaterialId
        ? await updateReadingMaterial(apiUrl, token, selectedMaterialId, form)
        : await createReadingMaterial(apiUrl, token, form);
      await reloadTree();
      await reloadMaterials(activeNode?.filter ?? { kind: "all" });
      setSelectedMaterialId(saved.id);
      setForm(formFromMaterial(saved));
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
          <div className="material-actions">
            <Button variant="outline" type="button" onClick={startNewMaterial}><Plus size={16} /> 새 자료</Button>
            <Button variant="outline" type="button"><Search size={16} /> 검색</Button>
            <Button type="button" onClick={() => void saveMaterial()} disabled={saving}>
              <Save size={16} /> {saving ? "저장 중" : "저장"}
            </Button>
          </div>
        </header>

        {error ? <div className="material-error">{error}</div> : null}

        <div className="material-workbench">
          <aside className="material-tree-panel">
            <div className="material-list-head">
              <strong>자료 트리</strong>
              <span>{tree?.folders.length ?? 0}</span>
            </div>
            <div className="material-tree-search">
              <Search size={15} />
              <span>폴더, 날짜, 상태 검색</span>
            </div>
            <div className="material-tree-sections">
              {treeSections.map((section) => (
                <TreeSection
                  key={section.id}
                  section={section}
                  activeTreeId={activeTreeId}
                  onSelect={selectTreeNode}
                />
              ))}
            </div>
          </aside>

          <aside className="material-list-panel">
            <div className="material-list-head">
              <div>
                <strong>{activeNode?.label ?? "전체 자료"}</strong>
                <small>필터 결과</small>
              </div>
              <span>{materials.length}</span>
            </div>
            <div className="material-card-list">
              {materials.length === 0 ? <div className="material-empty">이 필터에 해당하는 자료가 없습니다.</div> : null}
              {materials.map((material) => (
                <MaterialCard key={material.id} material={material} active={material.id === selectedMaterialId} onSelect={() => selectMaterial(material)} />
              ))}
            </div>
          </aside>

          <main className="material-editor-panel">
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
              <label>
                자료 유형
                <select value={form.sourceType} onChange={(event) => setForm((prev) => ({ ...prev, sourceType: event.target.value as ReadingSourceType }))}>
                  <option value="OFFICIAL_DOCS">공식 문서</option>
                  <option value="ARTICLE">기사</option>
                  <option value="BOOK">원서</option>
                  <option value="EXAM_PASSAGE">시험 지문</option>
                </select>
              </label>
              <label>
                난이도
                <select value={form.level} onChange={(event) => setForm((prev) => ({ ...prev, level: event.target.value as ReadingMaterialUpsertRequest["level"] }))}>
                  <option value="B1">B1</option>
                  <option value="B2">B2</option>
                  <option value="C1">C1</option>
                </select>
              </label>
              <label>
                저장 날짜
                <input value={form.collectedDate} onChange={(event) => setForm((prev) => ({ ...prev, collectedDate: event.target.value }))} />
              </label>
              <label>
                저장 폴더
                <select
                  value={form.folderId ?? ""}
                  onChange={(event) => setForm((prev) => ({ ...prev, folderId: event.target.value ? Number(event.target.value) : null }))}
                >
                  <option value="">미분류</option>
                  {(tree?.folders ?? []).map((folder) => (
                    <option key={folder.id} value={folder.id}>{folder.name}</option>
                  ))}
                </select>
              </label>
              <label>
                상태
                <select value={form.status} onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value as ReadingMaterialStatus }))}>
                  <option value="RAW">원문 저장</option>
                  <option value="ANALYSIS_PENDING">분석 대기</option>
                  <option value="READY">학습 가능</option>
                </select>
              </label>
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
          </main>

          <aside className="analysis-preview-panel">
            <div className="panel-title">
              <strong>분석 미리보기</strong>
              <Sparkles size={16} />
            </div>
            <div className="analysis-summary-grid">
              <PreviewMetric label="문장" value="3" />
              <PreviewMetric label="단어" value={String(selectedMaterial?.wordCount ?? 0)} />
              <PreviewMetric label="예상" value={`${selectedMaterial?.estimatedMinutes ?? 0}분`} />
            </div>
            <section className="preview-block">
              <h3>문장 분리</h3>
              {sampleSentences.map((sentence, index) => (
                <p key={sentence}><span>{index + 1}</span>{sentence}</p>
              ))}
            </section>
            <section className="preview-block">
              <h3>핵심 단어</h3>
              <div className="preview-word-list">
                {sampleWords.map((word) => <span key={word}>{word}</span>)}
              </div>
            </section>
            <section className="preview-block">
              <h3>독해 포인트</h3>
              <p><span>1</span>should와 must의 뉘앙스 차이를 구분합니다.</p>
              <p><span>2</span>세미콜론 뒤 보충 설명을 앞 문장과 연결합니다.</p>
            </section>
          </aside>
        </div>
      </div>
    </section>
  );
}

function TreeSection({
  section,
  activeTreeId,
  onSelect,
}: {
  section: ReadingTreeSection;
  activeTreeId: string;
  onSelect: (nodeId: string, filter: ReadingTreeFilter) => void;
}) {
  return (
    <section className="material-tree-section">
      <div className="material-tree-section-title">
        <ChevronDown size={15} />
        <strong>{section.label}</strong>
      </div>
      <div className="material-tree-node-list">
        {section.nodes.map((node) => (
          <button
            key={node.id}
            className={`material-tree-node depth-${node.depth ?? 0} ${node.id === activeTreeId ? "active" : ""}`}
            type="button"
            onClick={() => onSelect(node.id, node.filter)}
          >
            {section.id === "dates" ? <CalendarDays size={15} /> : node.id === activeTreeId ? <FolderOpen size={15} /> : <Folder size={15} />}
            <span>{node.label}</span>
            <em>{node.count}</em>
          </button>
        ))}
      </div>
    </section>
  );
}

function MaterialRow({ material }: { material: ReadingMaterial }) {
  return (
    <article className="material-row">
      <div>
        <strong>{material.title}</strong>
        <span>{sourceTypeLabels[material.sourceType]} · {material.level} · {formatSavedAt(material.createdAt)}</span>
      </div>
      <MaterialStatus status={material.status} />
    </article>
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

function PipelineStep({ title, body }: { title: string; body: string }) {
  return (
    <article className="pipeline-step">
      <strong>{title}</strong>
      <span>{body}</span>
    </article>
  );
}

function PreviewMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="preview-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ProfileView({ userName }: { userName: string }) {
  return (
    <SimpleGridView
      title="프로필"
      description={`${userName} 계정으로 Falcon English에 로그인되어 있습니다.`}
      items={["학습 서버 연결", "계정 정보", "개인 자료 보관함", "앱 버전 v0.1.15"]}
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

function FalconStat({ icon: Icon, label, value }: { icon: typeof BookOpenText; label: string; value: string }) {
  return (
    <div className="falcon-stat">
      <span><Icon size={14} /> {label}</span>
      <strong>{value}</strong>
    </div>
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
