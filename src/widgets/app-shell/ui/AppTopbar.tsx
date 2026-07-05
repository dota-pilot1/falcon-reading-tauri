import { getCurrentWindow } from "@tauri-apps/api/window";
import type { MouseEvent } from "react";
import type { WebMenu, WebMenuId } from "../../../app/model/navigation";
import { WindowControls } from "./WindowControls";

type AppTopbarProps = {
  activeWebMenu: WebMenu;
  activeMenu?: WebMenuId;
};

export function AppTopbar({ activeWebMenu }: AppTopbarProps) {
  const ActiveWebMenuIcon = activeWebMenu.icon;
  const win = getCurrentWindow();
  const handleDragStart = (event: MouseEvent<HTMLElement>) => {
    if (event.button !== 0) return;
    void win.startDragging();
  };

  return (
    <header className="topbar" onMouseDown={handleDragStart}>
      <div className="brand compact">
        <div className="brand-mark">
          <ActiveWebMenuIcon size={18} />
        </div>
        <div>
          <strong>{activeWebMenu.label}</strong>
        </div>
      </div>
      <WindowControls />
    </header>
  );
}
