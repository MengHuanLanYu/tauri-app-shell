/** Tauri 2.0 透明自定义标题栏 + 弹性多列布局。详见 README。 */

import { useState, useRef, useCallback } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { PanelLeft, PanelRight, PanelBottom, Minus, Square, Minimize2, X } from 'lucide-react';
import './AppShell.css';

// ── 拖拽约束默认值 ────────────────────────────────────────
const SIDEBAR_MIN = 140;
const SIDEBAR_MAX = 480;
const RIGHT_PANEL_MIN = 160;
const RIGHT_PANEL_MAX = 520;
const BOTTOM_PANEL_MIN = 100;
const BOTTOM_PANEL_MAX = 600;

// ── Props ────────────────────────────────────────────────

export interface AppShellProps {
  // ── 内容插槽 ──────────────────────────────────────────
  /** 主内容区（必填） */
  children: React.ReactNode;
  /** 左侧边栏内容；不传则不渲染侧边栏 */
  sidebar?: React.ReactNode;
  /** 右侧面板内容；不传则不渲染右侧面板 */
  rightPanel?: React.ReactNode;
  /** 底部面板内容；不传则不渲染底部面板 */
  bottomPanel?: React.ReactNode;
  /** 状态栏插槽内容；不传则不渲染状态栏 */
  statusBar?: React.ReactNode;

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
  /**
   * 底部面板切换按钮插槽（位于标题栏右侧区域）
   * - undefined（默认）: 有 bottomPanel 时自动显示默认 PanelBottom 切换按钮
   * - false           : 完全隐藏切换按钮
   * - ReactNode       : 用自定义内容替换默认按钮
   */
  bottomPanelToggle?: React.ReactNode | false;
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
  /**
   * 受控：底部面板展开状态。
   * 传入后进入受控模式，AppShell 不再维护内部开关状态。
   */
  bottomPanelOpen?: boolean;
  /** 非受控：底部面板初始展开状态，默认 true */
  defaultBottomPanelOpen?: boolean;
  /** 受控模式下，底部面板开关变化时的回调 */
  onBottomPanelOpenChange?: (open: boolean) => void;
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
   * - direction: 向左拖吸到最小点，向右拖吸到最大点
   */
  sidebarSnapMode?: 'nearest' | 'threshold' | 'direction';
  /** threshold 模式阈值，默认使用最小吸附点 */
  sidebarSnapThreshold?: number;
  /** 右侧面板初始宽度 px，默认 260 */
  defaultRightPanelWidth?: number;
  /** 右侧面板最小宽度 px，默认 160 */
  rightPanelMinWidth?: number;
  /** 右侧面板最大宽度 px，默认 520 */
  rightPanelMaxWidth?: number;
  /** 底部面板初始高度 px，默认 200 */
  defaultBottomPanelHeight?: number;
  /** 底部面板最小高度 px，默认 100 */
  bottomPanelMinHeight?: number;
  /** 底部面板最大高度 px，默认 600 */
  bottomPanelMaxHeight?: number;
  /**
   * 底部面板布局模式。
   * - 'wide'（默认）: 底部面板横跨 Main + RightPanel 完整宽度。
   * - 'center': 底部面板仅在 Main 下方，RightPanel 全高贯穿。
   */
  bottomPanelLayout?: 'wide' | 'center';
  /**
   * 状态栏布局模式。
   * - 'full'（默认）: 横跨窗口 100% 宽度，位于 Sidebar 下方。
   * - 'workbench': 仅覆盖 Main + RightPanel 宽度，Sidebar 全高贯穿。
   */
  statusBarLayout?: 'full' | 'workbench';
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
  bottomPanel,
  statusBar,
  sidebarToggle,
  rightPanelToggle,
  bottomPanelToggle,
  titlebarLeft,
  titlebarCenter,
  titlebarRight,
  defaultSidebarOpen = true,
  rightPanelOpen: rightPanelOpenProp,
  defaultRightPanelOpen = true,
  onRightPanelOpenChange,
  bottomPanelOpen: bottomPanelOpenProp,
  defaultBottomPanelOpen = true,
  onBottomPanelOpenChange,
  defaultSidebarWidth = 220,
  sidebarMinWidth = SIDEBAR_MIN,
  sidebarMaxWidth = SIDEBAR_MAX,
  sidebarSnapPoints,
  sidebarSnapMode = 'nearest',
  sidebarSnapThreshold,
  defaultRightPanelWidth = 260,
  rightPanelMinWidth = RIGHT_PANEL_MIN,
  rightPanelMaxWidth = RIGHT_PANEL_MAX,
  defaultBottomPanelHeight = 200,
  bottomPanelMinHeight = BOTTOM_PANEL_MIN,
  bottomPanelMaxHeight = BOTTOM_PANEL_MAX,
  bottomPanelLayout = 'wide',
  statusBarLayout = 'full',
}: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(defaultSidebarOpen);
  const [innerRightPanelOpen, setInnerRightPanelOpen] = useState(defaultRightPanelOpen);
  const [innerBottomPanelOpen, setInnerBottomPanelOpen] = useState(defaultBottomPanelOpen);
  const [isMaximized, setIsMaximized] = useState(false);

  // ── 右侧面板 受控 / 非受控逻辑 ──────────────────────────────
  const isRightPanelControlled = rightPanelOpenProp !== undefined;
  const actualRightPanelOpen = isRightPanelControlled ? rightPanelOpenProp : innerRightPanelOpen;

  function setRightPanelOpen(next: boolean) {
    if (!isRightPanelControlled) {
      setInnerRightPanelOpen(next);
    }
    onRightPanelOpenChange?.(next);
  }

  // ── 底部面板 受控 / 非受控逻辑 ──────────────────────────────
  const isBottomPanelControlled = bottomPanelOpenProp !== undefined;
  const actualBottomPanelOpen = isBottomPanelControlled ? bottomPanelOpenProp : innerBottomPanelOpen;

  function setBottomPanelOpen(next: boolean) {
    if (!isBottomPanelControlled) {
      setInnerBottomPanelOpen(next);
    }
    onBottomPanelOpenChange?.(next);
  }

  const [sidebarWidth, setSidebarWidth] = useState(defaultSidebarWidth);
  const [rightPanelWidth, setRightPanelWidth] = useState(defaultRightPanelWidth);
  const [bottomPanelHeight, setBottomPanelHeight] = useState(defaultBottomPanelHeight);

  // 直接操作 DOM 避免 mousemove 频繁触发 React 重渲染
  const shellRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    type: 'sidebar' | 'right' | 'bottom-panel';
    startX: number;
    startY: number;
    startWidth: number;
    startHeight: number;
    currentWidth: number;
    currentHeight: number;
    handleEl: HTMLDivElement;
  } | null>(null);

  const isMac = /mac/i.test(navigator.userAgent);
  const hasSidebar = sidebar !== undefined;
  const hasRightPanel = rightPanel !== undefined;
  const hasBottomPanel = bottomPanel !== undefined;
  const hasStatusBar = statusBar !== undefined;
  const isCenterPanel = bottomPanelLayout === 'center';

  async function minimize() { await getCurrentWindow().minimize(); }
  async function toggleMaximize() {
    const win = getCurrentWindow();
    await win.toggleMaximize();
    setIsMaximized(await win.isMaximized());
  }
  async function close() { await getCurrentWindow().close(); }

  function getSidebarSnapPoints() {
    return sidebarSnapPoints?.length
      ? [...sidebarSnapPoints].sort((a, b) => a - b)
      : [];
  }

  function resolveSidebarWidth(width: number) {
    const clampedWidth = Math.min(Math.max(width, sidebarMinWidth), sidebarMaxWidth);

    if (!sidebarSnapPoints?.length) {
      return clampedWidth;
    }

    const sortedSnapPoints = getSidebarSnapPoints();

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
  const startDrag = useCallback((type: 'sidebar' | 'right' | 'bottom-panel', e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    const handleEl = e.currentTarget;
    // 只高亮当前被拖拽的 handle
    handleEl.setAttribute('data-active', 'true');
    // 拖拽期间禁用 transition，消除延迟感
    shellRef.current?.classList.add('app-shell--dragging');
    // 垂直拖拽时，追加 row-resize cursor 类
    if (type === 'bottom-panel') {
      shellRef.current?.classList.add('app-shell--dragging-v');
    }

    dragRef.current = {
      type,
      startX: e.clientX,
      startY: e.clientY,
      startWidth: type === 'sidebar' ? sidebarWidth : rightPanelWidth,
      startHeight: bottomPanelHeight,
      currentWidth: type === 'sidebar' ? sidebarWidth : rightPanelWidth,
      currentHeight: bottomPanelHeight,
      handleEl,
    };

    function onMove(e: MouseEvent) {
      if (!dragRef.current || !shellRef.current) return;

      if (dragRef.current.type === 'bottom-panel') {
        // ── 垂直拖拽：向上 = 增大高度 ──
        const delta = dragRef.current.startY - e.clientY;
        const h = Math.min(Math.max(
          dragRef.current.startHeight + delta,
          bottomPanelMinHeight
        ), bottomPanelMaxHeight);
        shellRef.current.style.setProperty('--shell-bottom-panel-height', `${h}px`);
        dragRef.current.currentHeight = h;
      } else {
        // ── 水平拖拽：现有逻辑保持不变 ──
        const delta = e.clientX - dragRef.current.startX;
        let w: number;
        if (dragRef.current.type === 'sidebar') {
          const sortedSnapPoints = getSidebarSnapPoints();
          if (sidebarSnapMode === 'direction' && sortedSnapPoints.length >= 2 && delta !== 0) {
            w = delta > 0
              ? sortedSnapPoints[sortedSnapPoints.length - 1]
              : sortedSnapPoints[0];
          } else {
            w = Math.min(Math.max(dragRef.current.startWidth + delta, sidebarMinWidth), sidebarMaxWidth);
          }
          shellRef.current.style.setProperty('--shell-sidebar-width', `${w}px`);
        } else {
          w = Math.min(Math.max(dragRef.current.startWidth - delta, rightPanelMinWidth), rightPanelMaxWidth);
          shellRef.current.style.setProperty('--shell-right-panel-width', `${w}px`);
        }
        dragRef.current.currentWidth = w;
      }
    }

    function onUp() {
      const shellEl = shellRef.current;

      if (dragRef.current) {
        dragRef.current.handleEl.removeAttribute('data-active');
        // mouseup 时才同步回 React state（触发一次重渲染）
        if (dragRef.current.type === 'bottom-panel') {
          setBottomPanelHeight(dragRef.current.currentHeight);
        } else if (dragRef.current.type === 'sidebar') {
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
        shellEl?.classList.remove('app-shell--dragging', 'app-shell--dragging-v');
      });
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    }

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [
    sidebarWidth,
    rightPanelWidth,
    bottomPanelHeight,
    sidebarMinWidth,
    sidebarMaxWidth,
    sidebarSnapPoints,
    sidebarSnapMode,
    sidebarSnapThreshold,
    rightPanelMinWidth,
    rightPanelMaxWidth,
    bottomPanelMinHeight,
    bottomPanelMaxHeight,
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

  const resolvedBottomPanelToggle = resolveToggle(
    bottomPanelToggle,
    hasBottomPanel,
    <button
      type="button"
      className="app-shell__icon-btn"
      title={actualBottomPanelOpen ? '收起底部面板' : '展开底部面板'}
      onClick={() => setBottomPanelOpen(!actualBottomPanelOpen)}
    >
      <PanelBottom size={16} />
    </button>,
  );

  const showTbLeft = isMac || !!resolvedSidebarToggle || !!titlebarLeft;
  const showTbRight = !isMac || !!resolvedRightPanelToggle || !!titlebarRight;

  // ── Bottom Panel + Handle 提取为变量，center/wide 两种模式复用 ──
  const bottomPanelElements = hasBottomPanel && (
    <>
      {actualBottomPanelOpen && (
        <div
          className="app-shell__resize-handle app-shell__resize-handle--bottom"
          onMouseDown={(e) => startDrag('bottom-panel', e)}
        />
      )}
      <section className={`app-shell__bottom-panel ${actualBottomPanelOpen ? '' : 'app-shell__bottom-panel--collapsed'}`}>
        {bottomPanel}
      </section>
    </>
  );

  return (
    <div
      ref={shellRef}
      className="app-shell"
      style={
        {
          '--shell-sidebar-width': hasSidebar ? `${sidebarWidth}px` : '0px',
          '--shell-right-panel-width': `${rightPanelWidth}px`,
          '--shell-bottom-panel-height': `${bottomPanelHeight}px`,
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
            {resolvedBottomPanelToggle}
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

        {/* 侧边栏（若存在） + 右侧拖拽把手 */}
        {hasSidebar && (
          <aside className={`app-shell__sidebar ${sidebarOpen ? '' : 'app-shell__sidebar--collapsed'}`}>
            {sidebar}
          </aside>
        )}
        {hasSidebar && sidebarOpen && (
          <div
            className="app-shell__resize-handle app-shell__resize-handle--sidebar"
            onMouseDown={(e) => startDrag('sidebar', e)}
          />
        )}

        {/* ── 工作台容器 ── */}
        <div className="app-shell__workbench">

          {/* 工作台内容：main + rightPanel */}
          <div className="app-shell__workbench-content">

            {isCenterPanel ? (
              /* ── center 模式：main + bottomPanel 包在 main-area 中 ── */
              <div className="app-shell__main-area">
                <main className="app-shell__main">{children}</main>
                {bottomPanelElements}
              </div>
            ) : (
              /* ── wide 模式 / 无面板：main 直接渲染 ── */
              <main className="app-shell__main">{children}</main>
            )}

            {/* 把手：main 不是最后一个面板（rightPanel 存在时）；collapsed 时隐藏 */}
            {hasRightPanel && actualRightPanelOpen && (
              <div
                className="app-shell__resize-handle app-shell__resize-handle--main"
                onMouseDown={(e) => startDrag('right', e)}
              />
            )}
            {/* 右面板（若存在） */}
            {hasRightPanel && (
              <aside className={`app-shell__right-panel ${actualRightPanelOpen ? '' : 'app-shell__right-panel--collapsed'}`}>
                {rightPanel}
              </aside>
            )}
          </div>

          {/* ── wide 模式：Bottom Panel 在 workbench 级别 ── */}
          {!isCenterPanel && bottomPanelElements}

          {/* Workbench 模式下的 Status Bar */}
          {hasStatusBar && statusBarLayout === 'workbench' && (
            <footer className="app-shell__status-bar">
              {statusBar}
            </footer>
          )}
        </div>

      </div>

      {/* Full 模式下的 Status Bar */}
      {hasStatusBar && statusBarLayout === 'full' && (
        <footer className="app-shell__status-bar">
          {statusBar}
        </footer>
      )}
    </div>
  );
}
