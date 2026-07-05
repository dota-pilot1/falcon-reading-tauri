import { useEffect, useMemo, useState } from "react";
import {
  BookOpenText,
  CheckCircle2,
  CircleAlert,
  Clock,
  FileText,
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

const appVersion = "0.1.15";

type ConnectionStatus = "checking" | "online" | "offline";

type ReadingMaterial = {
  id: number;
  title: string;
  sourceType: "공식 문서" | "기사" | "원서" | "시험 지문";
  level: "B1" | "B2" | "C1";
  status: "원문 저장" | "분석 대기" | "학습 가능";
  sourceUrl: string;
  savedAt: string;
  wordCount: number;
  estimatedMinutes: number;
};

const materials: ReadingMaterial[] = [
  {
    id: 1,
    title: "Why docs use should",
    sourceType: "공식 문서",
    level: "B2",
    status: "학습 가능",
    sourceUrl: "https://example.com/docs/should",
    savedAt: "오늘 오전 12:08",
    wordCount: 420,
    estimatedMinutes: 8,
  },
  {
    id: 2,
    title: "How readers infer intent",
    sourceType: "기사",
    level: "B1",
    status: "분석 대기",
    sourceUrl: "https://example.com/articles/intent",
    savedAt: "어제 오후 11:42",
    wordCount: 680,
    estimatedMinutes: 12,
  },
  {
    id: 3,
    title: "API warnings and notes",
    sourceType: "공식 문서",
    level: "C1",
    status: "원문 저장",
    sourceUrl: "https://example.com/api/warnings",
    savedAt: "어제 오후 10:13",
    wordCount: 350,
    estimatedMinutes: 7,
  },
];

const sampleSentences = [
  "The fastest learners do not translate every word; they track the writer's purpose.",
  "When a document says should, it usually signals a recommendation rather than a hard rule.",
  "Listening improves when the script becomes a tool for checking, not a crutch for guessing.",
];

const sampleWords = ["track", "signal", "recommendation", "crutch", "rather than"];

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
          <aside className="material-list-panel">
            <div className="material-list-head">
              <strong>보관함</strong>
              <span>{materials.length}</span>
            </div>
            <div className="material-filter-row">
              <button className="active" type="button">전체</button>
              <button type="button">공식 문서</button>
              <button type="button">기사</button>
            </div>
            <div className="material-card-list">
              {materials.map((material) => (
                <MaterialCard key={material.id} material={material} />
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
                <input defaultValue="Why docs use should" />
              </label>
              <label>
                자료 유형
                <select defaultValue="official">
                  <option value="official">공식 문서</option>
                  <option value="article">기사</option>
                  <option value="book">원서</option>
                  <option value="exam">시험 지문</option>
                </select>
              </label>
              <label>
                난이도
                <select defaultValue="b2">
                  <option value="b1">B1</option>
                  <option value="b2">B2</option>
                  <option value="c1">C1</option>
                </select>
              </label>
              <label className="wide">
                출처 URL
                <div className="url-input">
                  <Link size={16} />
                  <input defaultValue="https://example.com/docs/should" />
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

function MaterialCard({ material }: { material: ReadingMaterial }) {
  return (
    <button className={`material-card ${material.id === 1 ? "active" : ""}`} type="button">
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
