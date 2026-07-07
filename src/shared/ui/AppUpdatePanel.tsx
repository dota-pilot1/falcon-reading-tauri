import { CheckCircle2, CircleAlert, Download, Loader2, RefreshCw } from "lucide-react";
import type { AppUpdateState } from "../lib/useAppUpdate";

type AppUpdatePanelProps = {
  updateState: AppUpdateState;
  busy: boolean;
  onCheckUpdate: () => void;
  onInstallUpdate: () => void;
};

export function AppUpdatePanel({ updateState, busy, onCheckUpdate, onInstallUpdate }: AppUpdatePanelProps) {
  const checking = updateState.status === "checking";
  const downloading = updateState.status === "downloading";
  const available = updateState.status === "available" || downloading;

  return (
    <section className="app-update-panel">
      <div className="app-update-panel-head">
        <div>
          <strong>앱 업데이트</strong>
          <span>현재 버전 v{updateState.currentVersion}</span>
        </div>
        <button type="button" onClick={onCheckUpdate} disabled={busy}>
          {checking ? <Loader2 className="spin" size={16} /> : <RefreshCw size={16} />}
          {checking ? "확인 중" : "업데이트 확인"}
        </button>
      </div>

      {updateState.status === "uptodate" && (
        <div className="app-update-message success">
          <CheckCircle2 size={17} />
          최신 버전을 사용 중입니다.
        </div>
      )}

      {updateState.status === "error" && (
        <div className="app-update-message error">
          <CircleAlert size={17} />
          {updateState.message || "업데이트를 확인하지 못했습니다."}
        </div>
      )}

      {available && (
        <div className="app-update-available">
          <div>
            <strong>새 버전 v{updateState.availableVersion}</strong>
            <span>설치 후 앱이 재시작됩니다.</span>
          </div>
          {updateState.notes && <p>{updateState.notes}</p>}
          {downloading && (
            <div className="app-update-progress">
              <div style={{ width: `${updateState.progress}%` }} />
            </div>
          )}
          <button type="button" onClick={onInstallUpdate} disabled={busy && !downloading}>
            {downloading ? <Loader2 className="spin" size={16} /> : <Download size={16} />}
            {downloading ? `다운로드 ${updateState.progress}%` : "지금 업데이트"}
          </button>
        </div>
      )}
    </section>
  );
}
