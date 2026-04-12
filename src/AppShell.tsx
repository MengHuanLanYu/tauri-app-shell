/** Tauri 2.0 透明自定义标题栏 + 弹性多列布局。详见 README。 */

import { useState, useRef } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { PanelLeft, PanelRight, Minus, Square, Minimize2, X } from 'lucide-react';
import './AppShell.css';

// ── 拖拽约束默认值 ────────────────────────────────────────
const SIDEBAR_MIN = 140;
const SIDEBAR_MAX = 480;
const RIGHT_PANEL_MIN = 160;
const RIGHT_PANEL_MAX = 520;

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
  /** 侧边栏初始宽度 px，默认 220 */
  defaultSidebarWidth?: number;
  /** 侧边栏最小宽度 px，默认 140 */
  sidebarMinWidth?: number;
  /** 侧边栏最大宽度 px，默认 480 */
  sidebarMaxWidth?: number;
  /** 右侧面板初始宽度 px，默认 260 */
  defaultRightPanelWidth?: number;
  /** 右侧面板最小宽度 px，默认 160 */
  rightPanelMinWidth?: number;
  /** 右侧面板最大宽度 px，默认 520 */
  rightPanelMaxWidth?: number;
}

// ── 辅助：解析 toggle 插槽值 ─────────────────────────────
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
  defaultSidebarWidth = 220,
  sidebarMinWidth = SIDEBAR_MIN,
  sidebarMaxWidth = SIDEBAR_MAX,
  defaultRightPanelWidth = 260,
  rightPanelMinWidth = RIGHT_PANEL_MIN,
  rightPanelMaxWidth = RIGHT_PANEL_MAX,
}: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(defaultSidebarOpen);
  const [rightPanelOpen, setRightPanelOpen] = useState(defaultRightPanelOpen);
  const [isMaximized, setIsMaximized] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(defaultSidebarWidth);
  const [rightPanelWidth, setRightPanelWidth] = useState(defaultRightPanelWidth);
  const [isDragging, setIsDragging] = useState(false);

  const dragRef = useRef<{
    type: 'sidebar' | 'right';
    startX: number;
    startWidth: number;
  } | null>(null);

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

  // ── 拖拽逻辑 ──────────────────────────────────────────
  function startDrag(type: 'sidebar' | 'right', e: React.MouseEvent) {
    e.preventDefault();
    dragRef.current = {
      type,
      startX: e.clientX,
      startWidth: type === 'sidebar' ? sidebarWidth : rightPanelWidth,
    };
    setIsDragging(true);

    function onMove(e: MouseEvent) {
      if (!dragRef.current) return;
      const delta = e.clientX - dragRef.current.startX;
      if (dragRef.current.type === 'sidebar') {
        const w = Math.min(Math.max(dragRef.current.startWidth + delta, sidebarMinWidth), sidebarMaxWidth);
        setSidebarWidth(w);
      } else {
        // 右面板：往左拖 delta 为负，宽度应增加
        const w = Math.min(Math.max(dragRef.current.startWidth - delta, rightPanelMinWidth), rightPanelMaxWidth);
        setRightPanelWidth(w);
      }
    }

    function onUp() {
      dragRef.current = null;
      setIsDragging(false);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    }

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

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

  const showTbLeft = isMac || !!resolvedSidebarToggle || !!titlebarLeft;
  const showTbRight = !isMac || !!resolvedRightPanelToggle || !!titlebarRight;

  return (
    <div
      className={['app-shell', isDragging ? 'app-shell--dragging' : ''].join(' ')}
      style={
        {
          '--shell-sidebar-width': hasSidebar ? `${sidebarWidth}px` : '0px',
          '--shell-right-panel-width': `${rightPanelWidth}px`,
          '--shell-radius': 'var(--shell-radius, 0px)',
          '--shell-shadow': 'var(--shell-shadow, none)',
        } as React.CSSProperties
      }
    >
      {/* ── 标题栏 ── */}
      <header
        className={['app-shell__titlebar', isMac ? 'app-shell__titlebar--mac' : ''].join(' ')}
        data-tauri-drag-region
      >
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

        <div className="app-shell__tb-center" data-tauri-drag-region>
          {titlebarCenter}
        </div>

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

      {/* ── 工作区 ──
           规则：每个面板（除最后一个可见面板）的右侧都有拖拽把手。
           可见顺序：[sidebar?] → [main] → [rightPanel?]
           main 始终 flex:1 吸收剩余空间，只需为两侧固定宽度面板提供把手。
      ── */}
      <div className="app-shell__workspace">

        {/* 侧边栏（若存在） + 右侧拖拽把手 */}
        {hasSidebar && (
          <aside className={`app-shell__sidebar ${sidebarOpen ? '' : 'app-shell__sidebar--collapsed'}`}>
            {sidebar}
          </aside>
        )}
        {/* 把手：sidebar 不是最后一个面板，始终渲染；collapsed 时隐藏 */}
        {hasSidebar && sidebarOpen && (
          <div
            className="app-shell__resize-handle"
            onMouseDown={(e) => startDrag('sidebar', e)}
          />
        )}

        {/* 主内容区（始终存在，flex:1，无固定宽度，无右侧把手） */}
        <main className="app-shell__main">{children}</main>

        {/* 把手：main 不是最后一个面板（rightPanel 存在时）；collapsed 时隐藏 */}
        {hasRightPanel && rightPanelOpen && (
          <div
            className="app-shell__resize-handle"
            onMouseDown={(e) => startDrag('right', e)}
          />
        )}
        {/* 右面板（若存在）：最后一个面板，右侧无把手 */}
        {hasRightPanel && (
          <aside className={`app-shell__right-panel ${rightPanelOpen ? '' : 'app-shell__right-panel--collapsed'}`}>
            {rightPanel}
          </aside>
        )}

      </div>
    </div>
  );
}
