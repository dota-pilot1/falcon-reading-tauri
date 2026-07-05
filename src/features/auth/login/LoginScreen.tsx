import { getCurrentWindow } from "@tauri-apps/api/window";
import { getVersion } from "@tauri-apps/api/app";
import { relaunch } from "@tauri-apps/plugin-process";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { FormEvent, MouseEvent, useCallback, useEffect, useRef, useState } from "react";
import {
  BookOpenCheck,
  CheckCircle2,
  CircleAlert,
  Download,
  Eye,
  EyeOff,
  GraduationCap,
  Loader2,
  LogIn,
  MessageCircle,
  RefreshCw,
  UserPlus,
  Zap,
} from "lucide-react";
import { WindowControls } from "../../../widgets/app-shell/ui/WindowControls";
import { Button } from "../../../shared/ui/Button";
import { Input } from "../../../shared/ui/Input";

type LoginScreenProps = {
  onLogin: (email: string, password: string) => Promise<void>;
  onSignup: (email: string, username: string, password: string) => Promise<void>;
};

const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d).{8,100}$/;
const REMEMBER_EMAIL_KEY = "falcon:login-email";
const REMEMBER_PASSWORD_KEY = "falcon:login-password";
const FALLBACK_APP_VERSION = "0.1.15";
const LOGIN_UPDATE_CHECK_INTERVAL_MS = 10 * 60 * 1000;

export function LoginScreen({ onLogin, onSignup }: LoginScreenProps) {
  const win = getCurrentWindow();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [formMessage, setFormMessage] = useState("");

  const isSignup = mode === "signup";

  const resetFeedback = () => {
    setFormError("");
    setFormMessage("");
  };

  const switchMode = (nextMode: "login" | "signup") => {
    setMode(nextMode);
    if (nextMode === "signup") setPassword("");
    setPasswordConfirm("");
    resetFeedback();
  };

  const saveRememberedLogin = (nextEmail: string, nextPassword: string) => {
    if (!remember) {
      localStorage.removeItem(REMEMBER_EMAIL_KEY);
      localStorage.removeItem(REMEMBER_PASSWORD_KEY);
      return;
    }
    localStorage.setItem(REMEMBER_EMAIL_KEY, nextEmail);
    localStorage.setItem(REMEMBER_PASSWORD_KEY, nextPassword);
  };

  const validateSignup = () => {
    if (!email.trim()) return "이메일을 입력해주세요.";
    if (!username.trim()) return "사용자명을 입력해주세요.";
    if (username.trim().length < 2 || username.trim().length > 50) return "사용자명은 2~50자여야 합니다.";
    if (!PASSWORD_PATTERN.test(password)) return "비밀번호는 영문과 숫자를 포함한 8자 이상이어야 합니다.";
    if (password !== passwordConfirm) return "비밀번호 확인이 일치하지 않습니다.";
    return "";
  };

  const submitLogin = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    if (isSignup) {
      const validationError = validateSignup();
      if (validationError) {
        setFormError(validationError);
        return;
      }
    } else if (!email.trim() || !password) {
      return;
    }
    setSubmitting(true);
    resetFeedback();
    try {
      if (isSignup) {
        await onSignup(email.trim(), username.trim(), password);
        saveRememberedLogin(email.trim(), password);
        setFormMessage("회원가입이 완료되었습니다. 같은 계정으로 로그인하세요.");
        setMode("login");
        setPasswordConfirm("");
      } else {
        await onLogin(email.trim(), password);
        saveRememberedLogin(email.trim(), password);
      }
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : isSignup ? "회원가입에 실패했습니다." : "로그인에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    const rememberedEmail = localStorage.getItem(REMEMBER_EMAIL_KEY) || "";
    const rememberedPassword = localStorage.getItem(REMEMBER_PASSWORD_KEY) || "";
    setEmail(rememberedEmail);
    setPassword(rememberedPassword);
    setRemember(Boolean(rememberedEmail || rememberedPassword));
  }, []);

  const handleDragStart = (event: MouseEvent<HTMLElement>) => {
    if (event.button !== 0) return;
    void win.startDragging();
  };

  return (
    <main className="login-screen">
      <header className="login-topbar" onMouseDown={handleDragStart}>
        <div className="brand compact">
          <div className="brand-mark">
            <Zap size={18} />
          </div>
          <div>
            <strong>Falcon English</strong>
          </div>
        </div>
        <WindowControls />
      </header>

      <div className="login-stage">
        <section className="login-shell">
          <div className="login-panel">
            <div className="login-card-header">
              <div className="login-mark">
                {isSignup ? <UserPlus size={24} /> : <Zap size={24} />}
              </div>
              <div>
                <p className="login-kicker">{isSignup ? "Create Account" : "Welcome Back"}</p>
                <h1>{isSignup ? "계정 만들기" : "로그인"}</h1>
                <p>{isSignup ? "새 계정을 만들고 독해·듣기 루틴을 시작하세요." : "읽고 듣던 학습 흐름으로 바로 돌아갑니다."}</p>
              </div>
            </div>

            <div className={`auth-mode-switch ${isSignup ? "signup" : "login"}`} role="tablist" aria-label="인증 방식">
              <span className="auth-mode-thumb" aria-hidden="true" />
              <button
                aria-selected={!isSignup}
                className={!isSignup ? "active" : ""}
                onClick={() => switchMode("login")}
                role="tab"
                type="button"
              >
                로그인
              </button>
              <button
                aria-selected={isSignup}
                className={isSignup ? "active" : ""}
                onClick={() => switchMode("signup")}
                role="tab"
                type="button"
              >
                회원가입
              </button>
            </div>

            <div className="auth-form-stage">
              <form className={`login-form auth-form-pane ${!isSignup ? "active" : ""}`} onSubmit={submitLogin}>
                <label>
                  이메일
                  <Input
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="terecal@daum.net"
                    type="email"
                    autoComplete="email"
                  />
                </label>

                <label>
                  비밀번호
                  <span className="password-field">
                    <Input
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="비밀번호"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                    />
                    <button type="button" onClick={() => setShowPassword((value) => !value)} title="비밀번호 표시 전환">
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </span>
                </label>

                <div className="login-options">
                  <label className="remember-row">
                    <input
                      checked={remember}
                      onChange={(event) => setRemember(event.target.checked)}
                      type="checkbox"
                    />
                    이메일/비밀번호 기억하기
                  </label>
                </div>

                {formMessage && <div className="login-message">{formMessage}</div>}
                {!isSignup && formError && <div className="login-error">{formError}</div>}

                <Button
                  className="login-primary-action h-12 w-full text-base"
                  disabled={submitting || !email.trim() || !password}
                  type="submit"
                >
                  {submitting && !isSignup ? <Loader2 className="spin" size={18} /> : <LogIn size={18} />}
                  로그인
                </Button>
              </form>

              <form className={`login-form auth-form-pane signup ${isSignup ? "active" : ""}`} onSubmit={submitLogin}>
                <label>
                  이메일
                  <Input
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="terecal@daum.net"
                    type="email"
                    autoComplete="email"
                  />
                </label>

                <label>
                  사용자명
                  <Input
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    placeholder="홍길동"
                    type="text"
                    autoComplete="name"
                  />
                </label>

                <label>
                  비밀번호
                  <span className="password-field">
                    <Input
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="비밀번호"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                    />
                    <button type="button" onClick={() => setShowPassword((value) => !value)} title="비밀번호 표시 전환">
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </span>
                </label>

                <label>
                  비밀번호 확인
                  <Input
                    value={passwordConfirm}
                    onChange={(event) => setPasswordConfirm(event.target.value)}
                    placeholder="비밀번호 재입력"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                  />
                </label>

                {isSignup && formError && <div className="login-error">{formError}</div>}

                <Button
                  className="login-primary-action h-12 w-full text-base"
                  disabled={submitting || !email.trim() || !password || !username.trim() || !passwordConfirm}
                  type="submit"
                >
                  {submitting && isSignup ? <Loader2 className="spin" size={18} /> : <UserPlus size={18} />}
                  회원가입
                </Button>
              </form>
            </div>
          </div>

          <aside className="login-product-panel">
            <div className="app-preview" aria-hidden="true">
              <div className="app-preview-sidebar">
                <span className="active"><Zap size={16} /></span>
                <span><MessageCircle size={15} /></span>
                <span><GraduationCap size={15} /></span>
                <span><BookOpenCheck size={15} /></span>
              </div>
              <div className="app-preview-main">
                <div className="app-preview-top">
                  <div>
                    <strong>오늘의 학습</strong>
                    <span>Falcon English</span>
                  </div>
                  <i />
                </div>
                <div className="app-preview-card">
                  <div>
                    <span>독해</span>
                    <strong>문장 구조 잡기</strong>
                  </div>
                  <CheckCircle2 size={18} />
                </div>
                <div className="app-preview-grid">
                  <div>
                    <span>듣기</span>
                    <strong>8분</strong>
                  </div>
                  <div>
                    <span>정답률</span>
                    <strong>86%</strong>
                  </div>
                </div>
                <div className="app-preview-progress">
                  <span />
                </div>
              </div>
            </div>
            <div className="login-product-copy">
              <h2>{isSignup ? "독해와 듣기 루틴을 준비하세요." : "오늘의 영어 입력을 이어가세요."}</h2>
              <p>로그인 후 오늘 학습, 독해, 듣기 화면으로 곧바로 전환됩니다.</p>
            </div>
            <button className="login-panel-switch" type="button" onClick={() => switchMode(isSignup ? "login" : "signup")}>
              {isSignup ? "이미 계정이 있어요" : "새 계정 만들기"}
            </button>
            <LoginUpdateStatus />
          </aside>
        </section>
      </div>
    </main>
  );
}

type UpdateCheckStatus = "idle" | "checking" | "uptodate" | "available" | "downloading" | "error";

function LoginUpdateStatus() {
  const [version, setVersion] = useState(FALLBACK_APP_VERSION);
  const [status, setStatus] = useState<UpdateCheckStatus>("idle");
  const [newVersion, setNewVersion] = useState("");
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");
  const updateRef = useRef<Update | null>(null);
  const checkingRef = useRef(false);
  const statusRef = useRef<UpdateCheckStatus>("idle");

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const checkForUpdate = useCallback(async () => {
    if (checkingRef.current || statusRef.current === "downloading") return;
    checkingRef.current = true;
    setStatus("checking");
    setMessage("");
    try {
      const update = await check();
      updateRef.current = update;
      if (update) {
        setNewVersion(update.version);
        setStatus("available");
      } else {
        setNewVersion("");
        setStatus("uptodate");
      }
    } catch (caught) {
      setStatus("error");
      setMessage(caught instanceof Error ? caught.message : "업데이트 확인 실패");
    } finally {
      checkingRef.current = false;
    }
  }, []);

  const installUpdate = async () => {
    const update = updateRef.current;
    if (!update) return;
    setStatus("downloading");
    setProgress(0);
    setMessage("");
    try {
      let total = 0;
      let downloaded = 0;
      await update.downloadAndInstall((event) => {
        if (event.event === "Started") {
          total = event.data.contentLength ?? 0;
        } else if (event.event === "Progress") {
          downloaded += event.data.chunkLength;
          if (total > 0) setProgress(Math.min(100, Math.round((downloaded / total) * 100)));
        }
      });
      await relaunch();
    } catch (caught) {
      setStatus("error");
      setMessage(caught instanceof Error ? caught.message : "업데이트 설치 실패");
    }
  };

  useEffect(() => {
    getVersion().then(setVersion).catch(() => {});
  }, []);

  useEffect(() => {
    void checkForUpdate();
    const interval = window.setInterval(() => void checkForUpdate(), LOGIN_UPDATE_CHECK_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [checkForUpdate]);

  const label =
    status === "checking"
      ? "업데이트 확인 중"
      : status === "available"
        ? `새 버전 v${newVersion}`
        : status === "downloading"
          ? `다운로드 ${progress}%`
          : status === "error"
            ? "확인 실패"
            : status === "uptodate"
              ? "최신 버전"
              : "업데이트 대기";

  return (
    <div className={`login-update-status ${status}`}>
      <div className="login-update-summary">
        <span>v{version}</span>
        <strong>{label}</strong>
      </div>
      {status === "downloading" && (
        <div className="login-update-progress">
          <span style={{ width: `${progress}%` }} />
        </div>
      )}
      {status === "error" && message && <p>{message}</p>}
      <div className="login-update-actions">
        {status === "available" ? (
          <button type="button" onClick={() => void installUpdate()}>
            <Download size={13} />
            업데이트
          </button>
        ) : (
          <button type="button" disabled={status === "checking" || status === "downloading"} onClick={() => void checkForUpdate()}>
            {status === "checking" ? <Loader2 className="spin" size={13} /> : status === "error" ? <CircleAlert size={13} /> : <RefreshCw size={13} />}
            다시 확인
          </button>
        )}
      </div>
    </div>
  );
}
