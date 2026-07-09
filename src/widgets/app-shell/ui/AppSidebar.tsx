import { useEffect, useRef, useState } from "react";
import { CheckCircle2, CircleAlert, Loader2, LogOut, Settings, UserCircle, Zap } from "lucide-react";
import type { UserSummary } from "../../../entities/user/model/types";
import type { WebMenu, WebMenuId } from "../../../app/model/navigation";
import type { AppUpdateState } from "../../../shared/lib/useAppUpdate";

type ConnectionStatus = "checking" | "online" | "offline";

type AppSidebarProps = {
  menus: WebMenu[];
  activeMenu: WebMenuId;
  activeWebMenu: WebMenu;
  user: UserSummary | null;
  connectionStatus: ConnectionStatus;
  appVersion: string;
  updateState?: AppUpdateState;
  updateBusy?: boolean;
  onOpenMenu: (menu: WebMenuId) => void;
  onInstallUpdate?: () => void;
  onLogout: () => void;
};

export function AppSidebar({
  menus,
  activeMenu,
  user,
  connectionStatus,
  appVersion,
  updateState,
  updateBusy = false,
  onOpenMenu,
  onInstallUpdate,
  onLogout,
}: AppSidebarProps) {
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);
  const displayName = user?.username || user?.email || "Guest";
  const roleName = user ? user.role.name || user.role.code.replace("ROLE_", "") : "비로그인";
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
            const labelLines = menu.id === "readingVocabulary" ? ["독해", "단어장"] : [menu.label];
            return (
              <button
                key={menu.id}
                className={activeMenu === menu.id ? "active" : ""}
                onClick={() => onOpenMenu(menu.id)}
                title={`${menu.label} · ${menu.subtitle}`}
              >
                <Icon size={18} />
                <span>
                  <strong>
                    {labelLines.map((line) => (
                      <span key={line}>{line}</span>
                    ))}
                  </strong>
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="grid justify-items-center gap-2 border-t border-[#d7e2dc] bg-[#edf5f1] px-1.5 pb-3 pt-2.5">
        <button
          type="button"
          className={
            "grid h-[22px] w-[58px] place-items-center rounded-lg border text-[9px] font-black leading-none transition-colors " +
            (updateState?.status === "available"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-100"
              : "cursor-default border-zinc-200 bg-white text-zinc-400")
          }
          onClick={onInstallUpdate}
          disabled={updateState?.status !== "available" || updateBusy || !onInstallUpdate}
          title={
            updateState?.status === "available"
              ? `새 버전 v${updateState.availableVersion || ""} 설치`
              : updateState?.status === "checking"
                ? "업데이트 확인 중"
                : "업데이트 없음"
          }
        >
          <span>
            {updateState?.status === "checking"
              ? "확인"
              : updateState?.status === "downloading"
                ? `${updateState.progress}%`
                : updateState?.status === "available"
                  ? "업데이트"
                  : "update"}
          </span>
        </button>
        <div className="grid min-w-[58px] justify-items-center rounded-xl border border-zinc-200 bg-white px-2 py-1.5 text-zinc-500 shadow-[0_6px_14px_rgba(15,23,42,0.04)]">
          <strong className="text-[11px] font-black leading-3.5 text-zinc-900">v{appVersion}</strong>
        </div>
        {user ? (
        <div className="relative grid w-full justify-items-center" ref={accountRef}>
          <button
            type="button"
            className={
              "grid min-h-14 w-full justify-items-center gap-1 rounded-[13px] border px-1 py-1.5 text-zinc-500 transition-all " +
              (accountOpen
                ? "border-[#d7e2dc] bg-white text-zinc-900 shadow-[0_8px_16px_rgba(15,23,42,0.07)]"
                : "border-transparent bg-transparent hover:border-[#d7e2dc] hover:bg-white hover:text-zinc-900 hover:shadow-[0_8px_16px_rgba(15,23,42,0.07)]")
            }
            onClick={() => setAccountOpen((open) => !open)}
            aria-expanded={accountOpen}
            title={`${displayName} · ${roleName}`}
          >
            <div className="relative grid h-[38px] w-[38px] place-items-center rounded-full border border-zinc-200 bg-white">
              <div className="grid h-8 w-8 place-items-center rounded-full bg-zinc-100 text-[11px] font-black text-zinc-700">{displayName.slice(0, 2).toUpperCase()}</div>
              <div className={`absolute bottom-0 right-[-1px] grid h-4 w-4 place-items-center rounded-full border-2 border-[#fafafa] ${connectionStatus === "online" ? "bg-emerald-50 text-emerald-700" : connectionStatus === "checking" ? "bg-sky-100 text-sky-700" : "bg-slate-100 text-zinc-500"}`} aria-label={statusLabel[connectionStatus]}>
                {connectionStatus === "checking" && <Loader2 className="spin" size={13} />}
                {connectionStatus === "online" && <CheckCircle2 size={13} />}
                {connectionStatus === "offline" && <CircleAlert size={13} />}
              </div>
            </div>
            <span className="max-w-[54px] overflow-hidden text-ellipsis whitespace-nowrap text-[9px] font-extrabold leading-3 text-zinc-500">{roleName}</span>
          </button>

          {accountOpen && (
            <div className="absolute bottom-[-2px] left-[calc(100%+12px)] z-30 w-[248px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_18px_42px_rgba(15,23,42,0.14)]">
              <div className="flex items-center gap-2.5 border-b border-slate-100 p-3">
                <div className="relative grid h-11 w-11 place-items-center rounded-full border border-[#d7e2dc] bg-white shadow-[0_8px_16px_rgba(15,23,42,0.08)]">
                  <div className="grid h-[38px] w-[38px] place-items-center rounded-full bg-emerald-50 text-[11px] font-black text-emerald-700">{displayName.slice(0, 2).toUpperCase()}</div>
                  <div className={`absolute bottom-0 right-[-1px] grid h-4 w-4 place-items-center rounded-full border-2 border-[#fafafa] ${connectionStatus === "online" ? "bg-emerald-50 text-emerald-700" : connectionStatus === "checking" ? "bg-sky-100 text-sky-700" : "bg-slate-100 text-zinc-500"}`} aria-label={statusLabel[connectionStatus]}>
                    {connectionStatus === "checking" && <Loader2 className="spin" size={13} />}
                    {connectionStatus === "online" && <CheckCircle2 size={13} />}
                    {connectionStatus === "offline" && <CircleAlert size={13} />}
                  </div>
                </div>
              <div className="min-w-0 flex-1">
                <strong className="block overflow-hidden text-ellipsis whitespace-nowrap text-[13px] leading-[18px] text-slate-900">{displayName}</strong>
                  <span className="block overflow-hidden text-ellipsis whitespace-nowrap text-xs font-bold text-slate-400">{user.email}</span>
                </div>
              </div>
              <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-3 py-2">
                <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-extrabold leading-4 text-zinc-600">{roleName}</span>
                <span className={`min-w-0 overflow-hidden text-ellipsis whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-extrabold leading-4 ${connectionStatus === "online" ? "bg-emerald-50 text-emerald-700" : connectionStatus === "checking" ? "bg-sky-100 text-sky-700" : "bg-slate-100 text-zinc-500"}`}>{statusLabel[connectionStatus]}</span>
              </div>
              <button
                type="button"
                className="flex min-h-10 w-full items-center gap-2 bg-white px-3 text-left text-[13px] font-extrabold text-zinc-600 transition-colors hover:bg-slate-50 hover:text-zinc-900"
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
                className="flex min-h-10 w-full items-center gap-2 bg-white px-3 text-left text-[13px] font-extrabold text-zinc-600 transition-colors hover:bg-red-50 hover:text-red-700"
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
        ) : (
          <div className="grid w-full justify-items-center gap-1 rounded-[13px] px-1 py-1.5 text-zinc-500">
            <div className="relative grid h-[38px] w-[38px] place-items-center rounded-full border border-zinc-200 bg-white">
              <div className="grid h-8 w-8 place-items-center rounded-full bg-zinc-100 text-[11px] font-black text-zinc-700">G</div>
              <div className="absolute bottom-0 right-[-1px] grid h-4 w-4 place-items-center rounded-full border-2 border-[#fafafa] bg-slate-100 text-zinc-500" aria-label={statusLabel.offline}>
                <CircleAlert size={13} />
              </div>
            </div>
            <span className="max-w-[54px] overflow-hidden text-ellipsis whitespace-nowrap text-[9px] font-extrabold leading-3">로그인 필요</span>
          </div>
        )}
        <button className="grid min-h-[38px] w-full place-items-center gap-[3px] rounded-xl border border-transparent bg-transparent text-[10px] font-extrabold text-zinc-500 hover:border-zinc-200 hover:bg-white hover:text-zinc-900" onClick={() => onOpenMenu("settings")} title="설정">
          <Settings size={15} />
          <span className="leading-3">설정</span>
        </button>
      </div>
    </aside>
  );
}
