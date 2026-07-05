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
  readingFolders,
  readingMaterials,
  type ReadingMaterial,
  type ReadingTreeFilter,
  type ReadingTreeSection,
} from "../entities/reading-material";

const appVersion = "0.1.15";

type ConnectionStatus = "checking" | "online" | "offline";

const materials = readingMaterials;

const sampleSentences = [
  "The fastest learners do not translate every word; they track the writer's purpose.",
  "When a document says should, it usually signals a recommendation rather than a hard rule.",
  "Listening improves when the script becomes a tool for checking, not a crutch for guessing.",
];

const sampleWords = ["track", "signal", "recommendation", "crutch", "rather than"];

const sourceTypes = ["공식 문서", "기사", "원서", "시험 지문"] as const;
const materialStatuses = ["원문 저장", "분석 대기", "학습 가능"] as const;

function countByFilter(filter: ReadingTreeFilter) {
  return materials.filter((material) => matchesTreeFilter(material, filter)).length;
}

function getFolderAndDescendantIds(folderId: string): string[] {
  const childIds = readingFolders.filter((folder) => folder.parentId === folderId).map((folder) => folder.id);
  return [folderId, ...childIds.flatMap((childId) => getFolderAndDescendantIds(childId))];
}

function matchesTreeFilter(material: ReadingMaterial, filter: ReadingTreeFilter) {
  if (filter.kind === "all") return true;
  if (filter.kind === "folder") return getFolderAndDescendantIds(filter.folderId).includes(material.folderId);
  if (filter.kind === "date") return material.collectedDate === filter.date;
  if (filter.kind === "status") return material.status === filter.status;
  return material.sourceType === filter.sourceType;
}

function buildFolderNodes(parentId: string | null, depth = 0): ReadingTreeSection["nodes"] {
  return readingFolders
    .filter((folder) => folder.parentId === parentId)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .flatMap((folder) => {
      const filter: ReadingTreeFilter = { kind: "folder", folderId: folder.id };
      return [
        {
          id: `folder:${folder.id}`,
          label: folder.name,
          count: countByFilter(filter),
          depth,
          filter,
        },
        ...buildFolderNodes(folder.id, depth + 1),
      ];
    });
}

function buildTreeSections(): ReadingTreeSection[] {
  const dates = Array.from(new Set(materials.map((material) => material.collectedDate))).sort((a, b) => b.localeCompare(a));

  return [
    {
      id: "library",
      label: "내 폴더",
      nodes: [
        { id: "all", label: "전체 자료", count: materials.length, filter: { kind: "all" } },
        ...buildFolderNodes(null),
      ],
    },
    {
      id: "dates",
      label: "날짜별",
      nodes: dates.map((date) => ({
        id: `date:${date}`,
        label: date,
        count: countByFilter({ kind: "date", date }),
        filter: { kind: "date", date },
      })),
    },
    {
      id: "types",
      label: "유형별",
      nodes: sourceTypes.map((sourceType) => ({
        id: `source:${sourceType}`,
        label: sourceType,
        count: countByFilter({ kind: "sourceType", sourceType }),
        filter: { kind: "sourceType", sourceType },
      })),
    },
    {
      id: "status",
      label: "상태별",
      nodes: materialStatuses.map((status) => ({
        id: `status:${status}`,
        label: status,
        count: countByFilter({ kind: "status", status }),
        filter: { kind: "status", status },
      })),
    },
  ];
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
        {canAccessActiveMenu ? <FalconWorkspace activeMenu={activeMenu} userName={user.username || user.email} /> : <ForbiddenView menu={activeWebMenu} />}
      </div>
    </main>
  );
}

function FalconWorkspace({ activeMenu, userName }: { activeMenu: WebMenuId; userName: string }) {
  if (activeMenu === "home") return <HomeView userName={userName} />;
  if (activeMenu === "readingMaterials") return <ReadingMaterialsView />;
  if (activeMenu === "profile") return <ProfileView userName={userName} />;
  if (activeMenu === "settings") return <SettingsView />;
  return <HomeView userName={userName} />;
}

function HomeView({ userName }: { userName: string }) {
  const readyCount = materials.filter((item) => item.status === "학습 가능").length;
  const pendingCount = materials.filter((item) => item.status !== "학습 가능").length;

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
              {materials.map((material) => (
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

function ReadingMaterialsView() {
  const treeSections = useMemo(() => buildTreeSections(), []);
  const [activeTreeId, setActiveTreeId] = useState("all");
  const activeNode = treeSections.flatMap((section) => section.nodes).find((node) => node.id === activeTreeId) ?? treeSections[0].nodes[0];
  const filteredMaterials = materials.filter((material) => matchesTreeFilter(material, activeNode.filter));
  const selectedMaterial = filteredMaterials[0] ?? materials[0];

  return (
    <section className="falcon-view">
      <div className="falcon-inner">
        <header className="falcon-page-head">
          <div>
            <h1>독해 자료</h1>
            <p>원문을 수집하고 출처, 난이도, 분석 결과를 함께 관리합니다.</p>
          </div>
          <div className="material-actions">
            <Button variant="outline" type="button"><Search size={16} /> 검색</Button>
            <Button type="button"><Save size={16} /> 저장</Button>
          </div>
        </header>

        <div className="material-workbench">
          <aside className="material-tree-panel">
            <div className="material-list-head">
              <strong>자료 트리</strong>
              <span>{materials.length}</span>
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
                  onSelect={setActiveTreeId}
                />
              ))}
            </div>
          </aside>

          <aside className="material-list-panel">
            <div className="material-list-head">
              <div>
                <strong>{activeNode.label}</strong>
                <small>필터 결과</small>
              </div>
              <span>{filteredMaterials.length}</span>
            </div>
            <div className="material-card-list">
              {filteredMaterials.map((material) => (
                <MaterialCard key={material.id} material={material} active={material.id === selectedMaterial.id} />
              ))}
            </div>
          </aside>

          <main className="material-editor-panel">
            <div className="editor-section-title">
              <div>
                <span>New Material</span>
                <h2>새 독해 자료 등록</h2>
              </div>
              <strong>초안</strong>
            </div>

            <div className="material-form-grid">
              <label>
                제목
                <input defaultValue={selectedMaterial.title} />
              </label>
              <label>
                자료 유형
                <select defaultValue={selectedMaterial.sourceType}>
                  <option value="공식 문서">공식 문서</option>
                  <option value="기사">기사</option>
                  <option value="원서">원서</option>
                  <option value="시험 지문">시험 지문</option>
                </select>
              </label>
              <label>
                난이도
                <select defaultValue={selectedMaterial.level}>
                  <option value="B1">B1</option>
                  <option value="B2">B2</option>
                  <option value="C1">C1</option>
                </select>
              </label>
              <label>
                저장 날짜
                <input defaultValue={selectedMaterial.collectedDate} />
              </label>
              <label>
                저장 폴더
                <select defaultValue={selectedMaterial.folderId}>
                  {readingFolders.map((folder) => (
                    <option key={folder.id} value={folder.id}>{folder.name}</option>
                  ))}
                </select>
              </label>
              <label className="wide">
                출처 URL
                <div className="url-input">
                  <Link size={16} />
                  <input defaultValue={selectedMaterial.sourceUrl} />
                </div>
              </label>
              <label className="wide">
                원문
                <textarea defaultValue={sampleSentences.join("\n\n")} />
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
              <PreviewMetric label="단어" value="5" />
              <PreviewMetric label="예상" value="8분" />
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
  onSelect: (nodeId: string) => void;
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
            onClick={() => onSelect(node.id)}
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
        <span>{material.sourceType} · {material.level} · {material.savedAt}</span>
      </div>
      <MaterialStatus status={material.status} />
    </article>
  );
}

function MaterialCard({ material, active }: { material: ReadingMaterial; active: boolean }) {
  return (
    <button className={`material-card ${active ? "active" : ""}`} type="button">
      <strong>{material.title}</strong>
      <span>{material.sourceType} · {material.level}</span>
      <small>{material.wordCount} words · {material.estimatedMinutes}분</small>
      <MaterialStatus status={material.status} />
    </button>
  );
}

function MaterialStatus({ status }: { status: ReadingMaterial["status"] }) {
  return <em className={`material-status ${status === "학습 가능" ? "ready" : status === "분석 대기" ? "pending" : "raw"}`}>{status}</em>;
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
