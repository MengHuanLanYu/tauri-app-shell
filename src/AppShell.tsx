/** Tauri 2.0 透明自定义标题栏 + 弹性多列布局。详见 README。 */

import { useState, useRef, useCallback } from 'react';
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
  /**
   * 受控：右侧面板展开状态。
   * 传入后进入受控模式，AppShell 不再维护内部开关状态。
   */
  rightPanelOpen?: boolean;
  /** 非受控：右侧面板初始展开状态，默认 true */
  defaultRightPanelOpen?: boolean;
  /** 受控模式下，面板开关变化时的回调 */
  onRightPanelOpenChange?: (open: boolean) => void;
  /** 侧边栏初始宽度 px，默认 220 */
  defaultSidebarWidth?: number;
  /** 侧边栏最小宽度 px，默认 140 */
  sidebarMinWidth?: number;
  /** 侧边栏最大宽度 px，默认 480 */
  sidebarMaxWidth?: number;
  /** 侧边栏吸附宽度点；传入后拖拽结束会吸附到指定宽度 */
  sidebarSnapPoints?: readonly number[];
  /**
   * 侧边栏吸附模式：
   * - nearest: 吸附到最近的 snap point
   * - threshold: <= sidebarSnapThreshold 吸到最小点，否则吸到最大点
   */
  sidebarSnapMode?: 'nearest' | 'threshold';
  /** threshold 模式阈值，默认使用最小吸附点 */
  sidebarSnapThreshold?: number;
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
  rightPanelOpen: rightPanelOpenProp,
  defaultRightPanelOpen = true,
  onRightPanelOpenChange,
  defaultSidebarWidth = 220,
  sidebarMinWidth = SIDEBAR_MIN,
  sidebarMaxWidth = SIDEBAR_MAX,
  sidebarSnapPoints,
  sidebarSnapMode = 'nearest',
  sidebarSnapThreshold,
  defaultRightPanelWidth = 260,
  rightPanelMinWidth = RIGHT_PANEL_MIN,
  rightPanelMaxWidth = RIGHT_PANEL_MAX,
}: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(defaultSidebarOpen);
  const [innerRightPanelOpen, setInnerRightPanelOpen] = useState(defaultRightPanelOpen);
  const [isMaximized, setIsMaximized] = useState(false);

  // ── 受控 / 非受控逻辑 ────────────────────────────────────
  const isRightPanelControlled = rightPanelOpenProp !== undefined;
  const actualRightPanelOpen = isRightPanelControlled ? rightPanelOpenProp : innerRightPanelOpen;

  function setRightPanelOpen(next: boolean) {
    if (!isRightPanelControlled) {
      setInnerRightPanelOpen(next);
    }
    onRightPanelOpenChange?.(next);
  }
  const [sidebarWidth, setSidebarWidth] = useState(defaultSidebarWidth);
  const [rightPanelWidth, setRightPanelWidth] = useState(defaultRightPanelWidth);

  // 直接操作 DOM 避免 mousemove 频繁触发 React 重渲染
  const shellRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    type: 'sidebar' | 'right';
    startX: number;
    startWidth: number;
    currentWidth: number;
    handleEl: HTMLDivElement;
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

  function resolveSidebarWidth(width: number) {
    const clampedWidth = Math.min(Math.max(width, sidebarMinWidth), sidebarMaxWidth);

    if (!sidebarSnapPoints?.length) {
      return clampedWidth;
    }

    const sortedSnapPoints = [...sidebarSnapPoints].sort((a, b) => a - b);

    if (sidebarSnapMode === 'threshold' && sortedSnapPoints.length >= 2) {
      return clampedWidth <= (sidebarSnapThreshold ?? sortedSnapPoints[0])
        ? sortedSnapPoints[0]
        : sortedSnapPoints[sortedSnapPoints.length - 1];
    }

    return sortedSnapPoints.reduce((nearest, point) => (
      Math.abs(point - clampedWidth) < Math.abs(nearest - clampedWidth) ? point : nearest
    ), sortedSnapPoints[0]);
  }

  // ── 拖拽逻辑 ──────────────────────────────────────────
  // 直接操作 CSS 变量，不触发 React 重渲染，消除卡顿
  const startDrag = useCallback((type: 'sidebar' | 'right', e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    const handleEl = e.currentTarget;
    // 只高亮当前被拖拽的 handle
    handleEl.setAttribute('data-active', 'true');
    // 拖拽期间禁用 transition，消除延迟感
    shellRef.current?.classList.add('app-shell--dragging');

    dragRef.current = {
      type,
      startX: e.clientX,
      startWidth: type === 'sidebar' ? sidebarWidth : rightPanelWidth,
      currentWidth: type === 'sidebar' ? sidebarWidth : rightPanelWidth,
      handleEl,
    };

    function onMove(e: MouseEvent) {
      if (!dragRef.current || !shellRef.current) return;
      const delta = e.clientX - dragRef.current.startX;
      let w: number;
      if (dragRef.current.type === 'sidebar') {
        w = Math.min(Math.max(dragRef.current.startWidth + delta, sidebarMinWidth), sidebarMaxWidth);
        shellRef.current.style.setProperty('--shell-sidebar-width', `${w}px`);
      } else {
        w = Math.min(Math.max(dragRef.current.startWidth - delta, rightPanelMinWidth), rightPanelMaxWidth);
        shellRef.current.style.setProperty('--shell-right-panel-width', `${w}px`);
      }
      dragRef.current.currentWidth = w;
    }

    function onUp() {
      const shellEl = shellRef.current;

      if (dragRef.current) {
        dragRef.current.handleEl.removeAttribute('data-active');
        // mouseup 时才同步回 React state（触发一次重渲染）
        if (dragRef.current.type === 'sidebar') {
          const nextWidth = resolveSidebarWidth(dragRef.current.currentWidth);
          shellEl?.style.setProperty('--shell-sidebar-width', `${nextWidth}px`);
          // Apply the snapped width while transitions are still disabled.
          void shellEl?.offsetWidth;
          setSidebarWidth(nextWidth);
        } else {
          setRightPanelWidth(dragRef.current.currentWidth);
        }
      }
      dragRef.current = null;
      requestAnimationFrame(() => {
        shellEl?.classList.remove('app-shell--dragging');
      });
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    }

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [
    sidebarWidth,
    rightPanelWidth,
    sidebarMinWidth,
    sidebarMaxWidth,
    sidebarSnapPoints,
    sidebarSnapMode,
    sidebarSnapThreshold,
    rightPanelMinWidth,
    rightPanelMaxWidth,
  ]);

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
      title={actualRightPanelOpen ? '收起右侧面板' : '展开右侧面板'}
      onClick={() => setRightPanelOpen(!actualRightPanelOpen)}
    >
      <PanelRight size={16} />
    </button>,
  );

  const showTbLeft = isMac || !!resolvedSidebarToggle || !!titlebarLeft;
  const showTbRight = !isMac || !!resolvedRightPanelToggle || !!titlebarRight;

  return (
    <div
      ref={shellRef}
      className="app-shell"
      style={
        {
          '--shell-sidebar-width': hasSidebar ? `${sidebarWidth}px` : '0px',
          '--shell-right-panel-width': `${rightPanelWidth}px`,
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
            className="app-shell__resize-handle app-shell__resize-handle--sidebar"
            onMouseDown={(e) => startDrag('sidebar', e)}
          />
        )}

        {/* 主内容区（始终存在，flex:1，无固定宽度，无右侧把手） */}
        <main className="app-shell__main">{children}</main>

        {/* 把手：main 不是最后一个面板（rightPanel 存在时）；collapsed 时隐藏 */}
        {hasRightPanel && actualRightPanelOpen && (
          <div
            className="app-shell__resize-handle app-shell__resize-handle--main"
            onMouseDown={(e) => startDrag('right', e)}
          />
        )}
        {/* 右面板（若存在）：最后一个面板，右侧无把手 */}
        {hasRightPanel && (
          <aside className={`app-shell__right-panel ${actualRightPanelOpen ? '' : 'app-shell__right-panel--collapsed'}`}>
            {rightPanel}
          </aside>
        )}

      </div>
    </div>
  );
}
