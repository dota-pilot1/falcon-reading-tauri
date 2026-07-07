import { useEffect, useRef, useState } from "react";
import { CheckCircle2, CircleAlert, Loader2, LogOut, Settings, UserCircle, Zap } from "lucide-react";
import type { UserSummary } from "../../../entities/user/model/types";
import type { WebMenu, WebMenuId } from "../../../app/model/navigation";

type ConnectionStatus = "checking" | "online" | "offline";

type AppSidebarProps = {
  menus: WebMenu[];
  activeMenu: WebMenuId;
  activeWebMenu: WebMenu;
  user: UserSummary;
  connectionStatus: ConnectionStatus;
  appVersion: string;
  onOpenMenu: (menu: WebMenuId) => void;
  onLogout: () => void;
};

export function AppSidebar({
  menus,
  activeMenu,
  user,
  connectionStatus,
  appVersion,
  onOpenMenu,
  onLogout,
}: AppSidebarProps) {
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);
  const displayName = user.username || user.email;
  const roleName = user.role.name || user.role.code.replace("ROLE_", "");
  const statusLabel = {
    checking: "연결 확인 중",
    online: "서버 연결됨",
    offline: "서버 연결 안 됨",
  } satisfies Record<ConnectionStatus, string>;

  useEffect(() => {
    if (!accountOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!accountRef.current?.contains(event.target as Node)) {
        setAccountOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setAccountOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [accountOpen]);

  return (
    <aside className="app-sidebar">
      <div className="sidebar-brand">
        <button className="sidebar-brand-mark" onClick={() => onOpenMenu("readingVocabulary")} title="Falcon Reading">
          <Zap size={19} />
        </button>
      </div>

      <div className="sidebar-section">
        <nav className="sidebar-menu">
          {menus.map((menu) => {
            const Icon = menu.icon;
            return (
              <button
                key={menu.id}
                className={activeMenu === menu.id ? "active" : ""}
                onClick={() => onOpenMenu(menu.id)}
                title={`${menu.label} · ${menu.subtitle}`}
              >
                <Icon size={18} />
                <span>
                  <strong>{menu.label}</strong>
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="sidebar-footer">
        <div className="sidebar-app-meta">
          <strong>v{appVersion}</strong>
        </div>
        <div className="account-panel" ref={accountRef}>
          <button
            type="button"
            className={`account-trigger ${accountOpen ? "active" : ""}`}
            onClick={() => setAccountOpen((open) => !open)}
            aria-expanded={accountOpen}
            title={`${displayName} · ${roleName}`}
          >
            <div className="account-card">
              <div className="account-avatar">{displayName.slice(0, 2).toUpperCase()}</div>
              <div className={`account-status ${connectionStatus}`} aria-label={statusLabel[connectionStatus]}>
                {connectionStatus === "checking" && <Loader2 className="spin" size={13} />}
                {connectionStatus === "online" && <CheckCircle2 size={13} />}
                {connectionStatus === "offline" && <CircleAlert size={13} />}
              </div>
            </div>
            <span>{roleName}</span>
          </button>

          {accountOpen && (
            <div className="account-popover">
              <div className="account-popover-head">
                <div className="account-card large">
                  <div className="account-avatar">{displayName.slice(0, 2).toUpperCase()}</div>
                  <div className={`account-status ${connectionStatus}`} aria-label={statusLabel[connectionStatus]}>
                    {connectionStatus === "checking" && <Loader2 className="spin" size={13} />}
                    {connectionStatus === "online" && <CheckCircle2 size={13} />}
                    {connectionStatus === "offline" && <CircleAlert size={13} />}
                  </div>
                </div>
                <div className="account-copy">
                  <strong>{displayName}</strong>
                  <span>{user.email}</span>
                </div>
              </div>
              <div className="account-popover-meta">
                <span>{roleName}</span>
                <span className={connectionStatus}>{statusLabel[connectionStatus]}</span>
              </div>
              <button
                type="button"
                className="account-action"
                onClick={() => {
                  setAccountOpen(false);
                  onOpenMenu("profile");
                }}
              >
                <UserCircle size={16} />
                <span>프로필</span>
              </button>
              <button
                type="button"
                className="account-action danger"
                onClick={() => {
                  setAccountOpen(false);
                  onLogout();
                }}
              >
                <LogOut size={16} />
                <span>로그아웃</span>
              </button>
            </div>
          )}
        </div>
        <button className="auth-button" onClick={() => onOpenMenu("settings")} title="설정">
          <Settings size={15} />
          <span>설정</span>
        </button>
      </div>
    </aside>
  );
}
