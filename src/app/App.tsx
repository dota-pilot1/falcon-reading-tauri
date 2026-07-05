import { useEffect, useMemo, useState } from "react";
import {
  BookOpenText,
  CheckCircle2,
  CircleAlert,
  Clock,
  Headphones,
  ListChecks,
  Mic2,
  PlayCircle,
  RefreshCw,
  Search,
  Target,
  Volume2,
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

const dailySentences = [
  {
    text: "The fastest learners do not translate every word; they track the writer's purpose.",
    ko: "가장 빠르게 배우는 사람은 모든 단어를 번역하지 않고, 글쓴이의 목적을 따라갑니다.",
    focus: "세미콜론 뒤 문장이 앞 문장을 보충합니다.",
  },
  {
    text: "When a document says should, it usually signals a recommendation rather than a hard rule.",
    ko: "문서에서 should는 보통 강제 규칙이 아니라 권장 사항을 뜻합니다.",
    focus: "rather than은 대비되는 개념을 정리합니다.",
  },
  {
    text: "Listening improves when the script becomes a tool for checking, not a crutch for guessing.",
    ko: "스크립트를 추측용 보조물이 아니라 확인 도구로 쓸 때 듣기가 향상됩니다.",
    focus: "not A but B 구조로 학습 태도를 대비합니다.",
  },
];

const savedWords = [
  { word: "track", meaning: "따라가다, 추적하다", source: "독해" },
  { word: "signal", meaning: "나타내다, 신호를 주다", source: "독해" },
  { word: "crutch", meaning: "의지하는 보조 수단", source: "듣기" },
  { word: "recommendation", meaning: "권장 사항", source: "문서 영어" },
];

export function App() {
  const apiUrl = defaultApiUrl;
  const { token, user, setToken, setRefreshToken, setUser } = useAuthSession();
  const [activeMenu, setActiveMenu] = useState<WebMenuId>("today");
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
      setActiveMenu("today");
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
    setActiveMenu("today");
  };

  const handleSignup = async (email: string, username: string, password: string) => {
    await signup(apiUrl, email, username, password);
  };

  const handleLogout = async () => {
    await logout(apiUrl, token);
    setToken("");
    setRefreshToken("");
    setUser(null);
    setActiveMenu("today");
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
  if (activeMenu === "today") return <TodayLearningView userName={userName} />;
  if (activeMenu === "reading") return <ReadingView />;
  if (activeMenu === "listening") return <ListeningView />;
  if (activeMenu === "vocabulary") return <VocabularyView />;
  if (activeMenu === "review") return <ReviewView />;
  if (activeMenu === "records") return <RecordsView />;
  if (activeMenu === "profile") return <ProfileView userName={userName} />;
  if (activeMenu === "settings") return <SettingsView />;
  return <TodayLearningView userName={userName} />;
}

function TodayLearningView({ userName }: { userName: string }) {
  return (
    <section className="falcon-view">
      <div className="falcon-inner">
        <header className="falcon-hero">
          <div>
            <span className="falcon-kicker"><Zap size={15} /> Falcon English</span>
            <h1>오늘 잡을 영어 입력 루틴</h1>
            <p>{userName}님의 독해와 듣기를 한 세션 안에서 연결합니다.</p>
          </div>
          <div className="falcon-stats">
            <FalconStat icon={BookOpenText} label="독해" value="12분" />
            <FalconStat icon={Headphones} label="듣기" value="8분" />
            <FalconStat icon={Target} label="완료율" value="0%" />
          </div>
        </header>

        <div className="falcon-dashboard">
          <section className="falcon-main-panel">
            <div className="falcon-section-head">
              <div>
                <h2>오늘의 통합 학습</h2>
                <p>먼저 듣고, 스크립트를 확인한 뒤 문장별 독해로 마무리합니다.</p>
              </div>
              <Button type="button"><PlayCircle size={16} /> 시작</Button>
            </div>
            <div className="daily-flow">
              <FlowStep icon={Headphones} title="1. 먼저 듣기" body="스크립트를 숨긴 상태로 핵심 내용을 잡습니다." />
              <FlowStep icon={BookOpenText} title="2. 문장 독해" body="문장 구조, 해석, 핵심 단어를 문단 단위로 확인합니다." />
              <FlowStep icon={Mic2} title="3. 받아쓰기" body="짧은 문장 3개를 듣고 직접 입력합니다." />
              <FlowStep icon={ListChecks} title="4. 이해 확인" body="내용 이해 문제와 놓친 단어를 복습합니다." />
            </div>
          </section>

          <aside className="falcon-side-panel">
            <div className="panel-title">
              <strong>오늘의 타깃</strong>
              <Clock size={16} />
            </div>
            <div className="target-list">
              <span>기술 문서 독해 1개</span>
              <span>문장 반복 듣기 5회</span>
              <span>받아쓰기 3문장</span>
              <span>단어 4개 저장</span>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}

function ReadingView() {
  return (
    <section className="falcon-view">
      <div className="falcon-inner">
        <header className="falcon-page-head">
          <div>
            <h1>독해</h1>
            <p>문장을 쪼개서 읽고, 해석보다 먼저 글의 목적을 잡습니다.</p>
          </div>
          <Button variant="outline" type="button"><Search size={16} /> 자료 찾기</Button>
        </header>
        <div className="reading-layout">
          <aside className="lesson-list">
            <LessonCard active title="Why docs use should" meta="문서 영어 · 8분" />
            <LessonCard title="How readers infer intent" meta="독해 전략 · 10분" />
            <LessonCard title="API warnings and notes" meta="개발 문서 · 12분" />
          </aside>
          <main className="reader-panel">
            <div className="reader-title">
              <span>Technical Reading</span>
              <h2>Why docs use should</h2>
            </div>
            <div className="sentence-stack">
              {dailySentences.map((sentence) => (
                <article className="sentence-card" key={sentence.text}>
                  <p>{sentence.text}</p>
                  <strong>{sentence.ko}</strong>
                  <span>{sentence.focus}</span>
                </article>
              ))}
            </div>
          </main>
          <aside className="study-panel">
            <h2>핵심 단어</h2>
            {savedWords.slice(0, 3).map((item) => (
              <div className="word-chip" key={item.word}>
                <strong>{item.word}</strong>
                <span>{item.meaning}</span>
              </div>
            ))}
          </aside>
        </div>
      </div>
    </section>
  );
}

function ListeningView() {
  return (
    <section className="falcon-view">
      <div className="falcon-inner">
        <header className="falcon-page-head">
          <div>
            <h1>듣기</h1>
            <p>오디오를 먼저 듣고, 스크립트는 확인과 반복 훈련에 사용합니다.</p>
          </div>
          <Button type="button"><Volume2 size={16} /> 재생</Button>
        </header>
        <div className="listening-layout">
          <section className="audio-panel">
            <div className="audio-orbit">
              <Headphones size={42} />
            </div>
            <h2>Script Hidden Round</h2>
            <p>첫 라운드는 스크립트를 보지 않고 핵심 주제와 흐름만 잡습니다.</p>
            <div className="audio-progress"><span /></div>
            <div className="audio-actions">
              <Button variant="outline" type="button"><RefreshCw size={16} /> 5초 전</Button>
              <Button type="button"><PlayCircle size={16} /> 재생</Button>
            </div>
          </section>
          <section className="dictation-panel">
            <h2>받아쓰기</h2>
            <div className="dictation-box">Listening improves when the script becomes a tool for checking.</div>
            <div className="dictation-input">들은 문장을 여기에 입력하는 영역</div>
          </section>
          <aside className="script-panel">
            <h2>스크립트</h2>
            {dailySentences.map((sentence) => (
              <p key={sentence.text}>{sentence.text}</p>
            ))}
          </aside>
        </div>
      </div>
    </section>
  );
}

function VocabularyView() {
  return <SimpleGridView title="단어장" description="독해와 듣기에서 저장한 단어를 한곳에서 복습합니다." items={savedWords.map((item) => `${item.word} · ${item.meaning}`)} />;
}

function ReviewView() {
  return <SimpleGridView title="복습" description="놓친 문장, 틀린 이해 문제, 받아쓰기 실패 문장을 다시 잡습니다." items={["놓친 문장 2개", "받아쓰기 재도전 3개", "이해 문제 오답 1개", "오늘 저장 단어 4개"]} />;
}

function RecordsView() {
  return <SimpleGridView title="기록" description="읽은 시간, 들은 횟수, 연속 학습일을 확인합니다." items={["연속 학습 1일", "이번 주 독해 0개", "이번 주 듣기 0개", "평균 이해도 -"]} />;
}

function ProfileView({ userName }: { userName: string }) {
  return <SimpleGridView title="프로필" description={`${userName} 계정으로 Falcon English에 로그인되어 있습니다.`} items={["학습 서버 연결", "계정 정보", "개인 학습 기록", "앱 버전 v0.1.15"]} />;
}

function SettingsView() {
  return <SimpleGridView title="설정" description="오디오 반복, 스크립트 표시, 학습 난이도 같은 앱 환경을 배치할 영역입니다." items={["스크립트 자동 표시 OFF", "문장 반복 3회", "난이도 B1-B2", "알림 준비 중"]} />;
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

function FlowStep({ icon: Icon, title, body }: { icon: typeof BookOpenText; title: string; body: string }) {
  return (
    <article className="flow-step">
      <Icon size={20} />
      <h3>{title}</h3>
      <p>{body}</p>
    </article>
  );
}

function LessonCard({ title, meta, active = false }: { title: string; meta: string; active?: boolean }) {
  return (
    <button type="button" className={`lesson-card ${active ? "active" : ""}`}>
      <strong>{title}</strong>
      <span>{meta}</span>
    </button>
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
