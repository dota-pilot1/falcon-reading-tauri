import { getCurrentWindow } from "@tauri-apps/api/window";
import { MouseEvent } from "react";
import type { WebMenu } from "../../../app/model/navigation";
import { WindowControls } from "./WindowControls";

type AppTopbarProps = {
  activeWebMenu: WebMenu;
};

export function AppTopbar({ activeWebMenu }: AppTopbarProps) {
  const ActiveWebMenuIcon = activeWebMenu.icon;
  const win = getCurrentWindow();

  const handleDragStart = (event: MouseEvent<HTMLElement>) => {
    if ((event.target as HTMLElement).closest("button")) return;
    if (event.button !== 0) return;
    void win.startDragging();
  };
  const handleDoubleClick = (event: MouseEvent<HTMLElement>) => {
    if ((event.target as HTMLElement).closest(".window-controls")) return;
    void win.toggleMaximize();
  };

  return (
    <header className="topbar" onMouseDown={handleDragStart} onDoubleClick={handleDoubleClick}>
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
