import { getCurrentWindow } from "@tauri-apps/api/window";

export function WindowControls() {
  const win = getCurrentWindow();

  return (
    <div className="window-controls" onMouseDown={(event) => event.stopPropagation()}>
      <button type="button" onClick={() => void win.minimize()} title="최소화" aria-label="최소화">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
          <line x1="2.5" y1="6" x2="9.5" y2="6" strokeLinecap="round" />
        </svg>
      </button>
      <button type="button" onClick={() => void win.toggleMaximize()} title="최대화" aria-label="최대화">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="2.7" y="2.7" width="6.6" height="6.6" rx="1.4" />
        </svg>
      </button>
      <button type="button" className="danger" onClick={() => void win.close()} title="닫기" aria-label="닫기">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
          <line x1="3" y1="3" x2="9" y2="9" strokeLinecap="round" />
          <line x1="9" y1="3" x2="3" y2="9" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}
