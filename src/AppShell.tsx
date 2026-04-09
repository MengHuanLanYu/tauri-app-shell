/**
 * AppShell — Tauri 2.0 透明自定义标题栏 + 弹性多列布局
 *
 * ── Tauri 侧必要配置 ────────────────────────────────────
 *
 * tauri.macos.conf.json:
 *   { "app": { "windows": [{
 *       "titleBarStyle": "Overlay",
 *       "hiddenTitle": true,
 *       "transparent": true,
 *       "trafficLightPosition": { "x": 14, "y": 17 }
 *   }]}}
 *
 * tauri.windows.conf.json / tauri.linux.conf.json:
 *   { "app": { "windows": [{ "decorations": false, "transparent": true }] }}
 *
 * capabilities/default.json — permissions:
 *   "core:window:allow-start-dragging"
 *
 * ── 插槽总览 ────────────────────────────────────────────
 *
 *  标题栏（左 → 右）：
 *  [traffic-spacer][sidebarToggle][titlebarLeft][←─titlebarCenter(拖拽)─→][titlebarRight][rightPanelToggle][win-btns?]
 *
 *  内容区（有什么渲染什么，自动 flex）：
 *  [sidebar?][children][rightPanel?]
 *
 * ── 用法示例 ────────────────────────────────────────────
 *
 *  // 两栏，默认切换按钮
 *  <AppShell sidebar={<Nav />}><Content /></AppShell>
 *
 *  // 三栏
 *  <AppShell sidebar={<Nav />} rightPanel={<Detail />}><Content /></AppShell>
 *
 *  // 隐藏切换按钮
 *  <AppShell sidebar={<Nav />} sidebarToggle={false}><Content /></AppShell>
 *
 *  // 自定义切换按钮（完全替换）
 *  <AppShell sidebar={<Nav />} sidebarToggle={<MyToggle />}><Content /></AppShell>
 *
 *  // 红绿灯右侧放其他按钮（无折叠按钮）
 *  <AppShell sidebarToggle={false} titlebarLeft={<BackBtn /><NewBtn />}>
 *    <Content />
 *  </AppShell>
 *
 *  // 单栏，标题栏完全自定义
 *  <AppShell titlebarCenter={<AppTitle />} titlebarRight={<Toolbar />}>
 *    <Content />
 *  </AppShell>
 */

import { useState } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { PanelLeft, PanelRight, Minus, Square, Minimize2, X } from 'lucide-react';
import './AppShell.css';

// ── Props ────────────────────────────────────────────────

export interface AppShellProps {
  // ── 内容插槽 ──────────────────────────────────────────
  /** 主内容区（必填） */
  children: React.ReactNode;
  /** 左侧边栏内容；不传则不渲染侧边栏 */
  sidebar?: React.ReactNode;
  /** 右侧面板内容；不传则不渲染右侧面板 */
  rightPanel?: React.ReactNode;

  // ── 标题栏插槽 ────────────────────────────────────────
  /**
   * 侧边栏切换按钮插槽（位于红绿灯/traffic-spacer 右侧）
   * - undefined（默认）: 有 sidebar 时自动显示默认 PanelLeft 切换按钮
   * - false           : 完全隐藏切换按钮
   * - ReactNode       : 用自定义内容替换默认按钮
   */
  sidebarToggle?: React.ReactNode | false;
  /**
   * 右侧面板切换按钮插槽（位于窗口控制按钮左侧）
   * - undefined（默认）: 有 rightPanel 时自动显示默认 PanelRight 切换按钮
   * - false           : 完全隐藏切换按钮
   * - ReactNode       : 用自定义内容替换默认按钮
   */
  rightPanelToggle?: React.ReactNode | false;
  /** 标题栏左侧额外内容（在 sidebarToggle 之后，拖拽区之前） */
  titlebarLeft?: React.ReactNode;
  /** 标题栏中间内容（可拖拽区域内，不阻断拖拽） */
  titlebarCenter?: React.ReactNode;
  /** 标题栏右侧额外内容（在 rightPanelToggle 之前） */
  titlebarRight?: React.ReactNode;

  // ── 行为控制 ──────────────────────────────────────────
  /** 侧边栏初始展开状态，默认 true */
  defaultSidebarOpen?: boolean;
  /** 右侧面板初始展开状态，默认 true */
  defaultRightPanelOpen?: boolean;
}

// ── 辅助：解析 toggle 插槽值 ─────────────────────────────
// undefined + hasPannel → 渲染默认按钮
// false                 → 不渲染
// ReactNode             → 渲染自定义内容
function resolveToggle(
  prop: React.ReactNode | false | undefined,
  hasPanel: boolean,
  defaultBtn: React.ReactNode,
): React.ReactNode {
  if (prop === false) return null;
  if (prop !== undefined) return prop;
  return hasPanel ? defaultBtn : null;
}

// ── Component ────────────────────────────────────────────

export function AppShell({
  children,
  sidebar,
  rightPanel,
  sidebarToggle,
  rightPanelToggle,
  titlebarLeft,
  titlebarCenter,
  titlebarRight,
  defaultSidebarOpen = true,
  defaultRightPanelOpen = true,
}: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(defaultSidebarOpen);
  const [rightPanelOpen, setRightPanelOpen] = useState(defaultRightPanelOpen);
  const [isMaximized, setIsMaximized] = useState(false);
  const isMac = /mac/i.test(navigator.userAgent);

  const hasSidebar = sidebar !== undefined;
  const hasRightPanel = rightPanel !== undefined;

  async function minimize() { await getCurrentWindow().minimize(); }
  async function toggleMaximize() {
    const win = getCurrentWindow();
    await win.toggleMaximize();
    setIsMaximized(await win.isMaximized());
  }
  async function close() { await getCurrentWindow().close(); }

  // 解析两个 toggle 插槽
  const resolvedSidebarToggle = resolveToggle(
    sidebarToggle,
    hasSidebar,
    <button
      type="button"
      className="app-shell__icon-btn"
      title={sidebarOpen ? '收起侧边栏' : '展开侧边栏'}
      onClick={() => setSidebarOpen((v) => !v)}
    >
      <PanelLeft size={16} />
    </button>,
  );

  const resolvedRightPanelToggle = resolveToggle(
    rightPanelToggle,
    hasRightPanel,
    <button
      type="button"
      className="app-shell__icon-btn"
      title={rightPanelOpen ? '收起右侧面板' : '展开右侧面板'}
      onClick={() => setRightPanelOpen((v) => !v)}
    >
      <PanelRight size={16} />
    </button>,
  );

  // 左区是否需要渲染
  const showTbLeft = isMac || !!resolvedSidebarToggle || !!titlebarLeft;
  // 右区是否需要渲染
  const showTbRight = !isMac || !!resolvedRightPanelToggle || !!titlebarRight;

  return (
    <div
      className="app-shell"
      style={hasSidebar ? undefined : { '--shell-sidebar-width': '0px' } as React.CSSProperties}
    >
      {/* ── 标题栏 ── */}
      <header
        className={['app-shell__titlebar', isMac ? 'app-shell__titlebar--mac' : ''].join(' ')}
        data-tauri-drag-region
      >
        {/* 左区 */}
        {showTbLeft && (
          <div
            className={[
              'app-shell__tb-left',
              hasSidebar && !sidebarOpen ? 'app-shell__tb-left--collapsed' : '',
            ].join(' ')}
            data-tauri-drag-region
          >
            {isMac && <div className="app-shell__traffic-spacer" data-tauri-drag-region />}
            {resolvedSidebarToggle}
            {titlebarLeft}
          </div>
        )}

        {/* 中间拖拽区 */}
        <div className="app-shell__tb-center" data-tauri-drag-region>
          {titlebarCenter}
        </div>

        {/* 右区 */}
        {showTbRight && (
          <div className="app-shell__tb-right">
            {titlebarRight}
            {resolvedRightPanelToggle}
            {!isMac && (
              <div className="app-shell__win-actions">
                <button type="button" className="app-shell__win-btn" onClick={minimize}>
                  <Minus size={13} />
                </button>
                <button type="button" className="app-shell__win-btn" onClick={toggleMaximize}>
                  {isMaximized ? <Minimize2 size={13} /> : <Square size={13} />}
                </button>
                <button type="button" className="app-shell__win-btn app-shell__win-btn--close" onClick={close}>
                  <X size={13} />
                </button>
              </div>
            )}
          </div>
        )}
      </header>

      {/* ── 工作区 ── */}
      <div className="app-shell__workspace">
        {hasSidebar && (
          <aside className={`app-shell__sidebar ${sidebarOpen ? '' : 'app-shell__sidebar--collapsed'}`}>
            {sidebar}
          </aside>
        )}
        <main className="app-shell__main">{children}</main>
        {hasRightPanel && (
          <aside className={`app-shell__right-panel ${rightPanelOpen ? '' : 'app-shell__right-panel--collapsed'}`}>
            {rightPanel}
          </aside>
        )}
      </div>
    </div>
  );
}
