# Tauri App Shell — Bottom Panel + Status Bar 完整设计与架构方案

本方案旨在为通用组件库 `tauri-app-shell` 同时新增两类底部区域组件：

- **Bottom Panel**（底部面板）：可拖拽调整高度的富内容面板（终端、日志、命令输入等）
- **Status Bar**（状态栏）：固定高度的单行信息展示栏（git 分支、编码、连接状态等）

基于现有 **Flex 布局架构**增量扩展，与现有 Resize Handle 拖拽逻辑完全兼容。

---

## 📐 概念区分：Bottom Panel vs Status Bar

```
┌─────────────────────────────────────────────────┐
│  Titlebar                                        │
├──────┬──────────────────────────┬───────────────┤
│      │                          │               │
│ Side │      Main / Editor       │  Right Panel  │
│ Bar  │                          │  (AI Copilot) │
│      ├ ─ ─ [handle ↕ 拖拽] ─ ─ ┤               │
│      │  Bottom Panel            │               │  ← 可拖拽高度, ≈200px
│      │  (Terminal / Output)     │               │     富内容，可开关
├──────┴──────────────────────────┴───────────────┤
│ main ⚡ | UTF-8 | Ln 42, Col 8 | Sidecar: OK    │  ← 固定 24px
└─────────────────────────────────────────────────┘     纯信息展示
```

| 特征 | Bottom Panel (底部面板) | Status Bar (状态栏) |
|------|------------------------|---------------------|
| **高度** | 可拖拽调整，100–600px | 固定 24px |
| **内容** | 富交互（终端、日志、输出面板） | 单行信息条目 |
| **Resize** | ✅ 有垂直 resize handle | ❌ 不可拖拽 |
| **开关** | ✅ 可展开/折叠 | 有/无（通过 prop 控制） |
| **受控模式** | ✅ 支持 controlled/uncontrolled | ❌ 纯展示，无需状态管理 |

---

## 🧭 架构设计思想与模式划分

### Status Bar 布局模式

1. **`'full'`（默认）**：状态栏横跨 100% 窗口宽度（含 Sidebar），位于 `.app-shell` 最底部。
   - *场景*：VS Code / Cursor 风格。
2. **`'workbench'`**：状态栏仅覆盖 Main + RightPanel 区域，Sidebar 全高贯穿。
   - *场景*：Sidebar 需要最大化树结构展示高度。

### Bottom Panel 布局模式

1. **`'wide'`（默认）**：底部面板横跨 Main + RightPanel 完整宽度。
   - *场景*：终端 / 日志输出，内容与左右面板均相关。
   - *DOM 位置*：`.workbench` 的直接子元素，位于 `.workbench-content` 之下。
2. **`'center'`**：底部面板仅在 Main 下方，RightPanel 全高贯穿。
   - *场景*：VS Code 默认风格。AI Copilot / Secondary Sidebar 需要全高以最大化对话/内容展示。
   - *DOM 位置*：嵌入 `.main-area` 包装层内部（包裹 main + bottom-panel），RightPanel 在包装层外部自然全高。

```
【wide（默认）】                      【center】

sidebar | main       | right-panel   sidebar | main         | right-panel
sidebar | ═══handle ↕═══════════════   sidebar | ══handle ↕══ | right-panel
sidebar | bottom-panel              | sidebar | bottom-panel | right-panel
```

两种模式都不侵入 Sidebar 区域，Bottom Panel 的拖拽高度调整不会触发 Sidebar 重渲染。

### Canvas-Nested 模式（Mode 3，不变）

对于 CAD 图纸级高频坐标刷新场景，仍然推荐在 `children` 内部自行嵌套专属状态栏/命令栏，AppShell 完全无感知。

---

## 🏗️ DOM 结构总览

```
【bottomPanelLayout='wide'（默认）, statusBarLayout='full'】

.app-shell (flex column)
  ├── header.titlebar
  ├── div.workspace (flex: 1, flex row)
  │     ├── aside.sidebar
  │     ├── [handle ↔]                              ← 现有：水平拖拽
  │     └── div.workbench (flex: 1, flex column)
  │           ├── div.workbench-content (flex: 1, flex row)
  │           │     ├── main (flex: 1)
  │           │     ├── [handle ↔]                   ← 现有：水平拖拽
  │           │     └── aside.right-panel
  │           ├── [handle ↕]                         ← 新增：垂直拖拽
  │           └── section.bottom-panel               ← 横跨 main + rightPanel
  └── footer.status-bar                              ← 100% 宽度


【bottomPanelLayout='center', statusBarLayout='full'】

.app-shell (flex column)
  ├── header.titlebar
  ├── div.workspace (flex: 1, flex row)
  │     ├── aside.sidebar
  │     ├── [handle ↔]
  │     └── div.workbench (flex: 1, flex column)
  │           ├── div.workbench-content (flex: 1, flex row)
  │           │     ├── div.main-area (flex: 1, flex column)  ← 新增包装层
  │           │     │     ├── main (flex: 1)
  │           │     │     ├── [handle ↕]                      ← 在 main-area 内部
  │           │     │     └── section.bottom-panel             ← 仅在 main 下方
  │           │     ├── [handle ↔]
  │           │     └── aside.right-panel                     ← 全高贯穿
  └── footer.status-bar


【bottomPanelLayout='wide', statusBarLayout='workbench'】

.app-shell (flex column)
  ├── header.titlebar
  └── div.workspace (flex: 1, flex row)
        ├── aside.sidebar                            ← 全高贯穿
        ├── [handle ↔]
        └── div.workbench (flex: 1, flex column)
              ├── div.workbench-content (flex: 1, flex row)
              │     ├── main (flex: 1)
              │     ├── [handle ↔]
              │     └── aside.right-panel
              ├── [handle ↕]
              ├── section.bottom-panel
              └── footer.status-bar                  ← 仅 workbench 宽度


【仅 Status Bar, 无 Bottom Panel】

.app-shell (flex column)
  ├── header.titlebar
  ├── div.workspace (flex: 1, flex row)
  │     ├── aside.sidebar
  │     ├── [handle ↔]
  │     └── div.workbench (flex: 1, flex column)
  │           └── div.workbench-content (flex: 1, flex row)
  │                 ├── main (flex: 1)
  │                 ├── [handle ↔]
  │                 └── aside.right-panel
  └── footer.status-bar
```

### Resize Handle 兼容性

| Handle | 位置 | 方向 | 影响 |
|--------|------|------|------|
| Sidebar Handle | `.workspace` 内，sidebar 与 workbench 之间 | 水平 ↔ | **零改动** |
| Right-Panel Handle | `.workbench-content` 内，main 与 right-panel 之间 | 水平 ↔ | **零改动** |
| Bottom-Panel Handle (wide) | `.workbench` 内，workbench-content 与 bottom-panel 之间 | 垂直 ↕ | 复用现有拖拽基础设施 |
| Bottom-Panel Handle (center) | `.main-area` 内，main 与 bottom-panel 之间 | 垂直 ↕ | 复用现有拖拽基础设施 |

---

## 🛠️ 第一部分：Props API 设计

### 新增属性

```typescript
export interface AppShellProps {
  // ── 现有属性完整保留 ─────────────────────────────────

  children: React.ReactNode;
  sidebar?: React.ReactNode;
  rightPanel?: React.ReactNode;
  sidebarToggle?: React.ReactNode | false;
  rightPanelToggle?: React.ReactNode | false;
  titlebarLeft?: React.ReactNode;
  titlebarCenter?: React.ReactNode;
  titlebarRight?: React.ReactNode;
  defaultSidebarOpen?: boolean;
  rightPanelOpen?: boolean;
  defaultRightPanelOpen?: boolean;
  onRightPanelOpenChange?: (open: boolean) => void;
  defaultSidebarWidth?: number;
  sidebarMinWidth?: number;
  sidebarMaxWidth?: number;
  sidebarSnapPoints?: readonly number[];
  sidebarSnapMode?: 'nearest' | 'threshold' | 'direction';
  sidebarSnapThreshold?: number;
  defaultRightPanelWidth?: number;
  rightPanelMinWidth?: number;
  rightPanelMaxWidth?: number;

  // ── Bottom Panel（新增）─────────────────────────────

  /** 底部面板内容插槽。不传则不渲染底部面板。 */
  bottomPanel?: React.ReactNode;

  /**
   * 底部面板切换按钮插槽（位于标题栏右侧区域）。
   * - undefined（默认）: 有 bottomPanel 时自动显示默认 PanelBottom 切换按钮
   * - false: 完全隐藏切换按钮
   * - ReactNode: 用自定义内容替换默认按钮
   */
  bottomPanelToggle?: React.ReactNode | false;

  /**
   * 受控：底部面板展开状态。
   * 传入后进入受控模式，AppShell 不再维护内部开关状态。
   */
  bottomPanelOpen?: boolean;

  /** 非受控：底部面板初始展开状态，默认 true */
  defaultBottomPanelOpen?: boolean;

  /** 受控模式下，面板开关变化时的回调 */
  onBottomPanelOpenChange?: (open: boolean) => void;

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

  // ── Status Bar（新增）──────────────────────────────

  /** 状态栏插槽内容。不传则不渲染状态栏。 */
  statusBar?: React.ReactNode;

  /**
   * 状态栏布局模式。
   * - 'full'（默认）: 横跨窗口 100% 宽度，位于 Sidebar 下方。
   * - 'workbench': 仅覆盖 Main + RightPanel 宽度，Sidebar 全高贯穿。
   */
  statusBarLayout?: 'full' | 'workbench';
}
```

### API 设计原则

| 原则 | 体现 |
|------|------|
| **与 rightPanel 对称** | `bottomPanel` 的受控/非受控、toggle、min/max 模式与 `rightPanel` 完全对称 |
| **增量扩展** | 所有新 prop 均可选，不传时行为与现版本 100% 一致 |
| **关注点分离** | `bottomPanel`（交互面板）与 `statusBar`（信息展示）通过独立 prop 传入 |

---

## 🧩 第二部分：TSX 实现

以下基于现有 `AppShell.tsx` 展示关键变更部分。

### 默认值常量新增

```typescript
// ── 拖拽约束默认值 ────────────────────────────────────────
const SIDEBAR_MIN = 140;
const SIDEBAR_MAX = 480;
const RIGHT_PANEL_MIN = 160;
const RIGHT_PANEL_MAX = 520;
const BOTTOM_PANEL_MIN = 100;   // ← 新增
const BOTTOM_PANEL_MAX = 600;   // ← 新增
```

### dragRef 类型扩展

```typescript
const dragRef = useRef<{
  type: 'sidebar' | 'right' | 'bottom-panel';  // ← 新增 'bottom-panel'
  startX: number;
  startY: number;           // ← 新增：垂直拖拽起始 Y
  startWidth: number;
  startHeight: number;      // ← 新增：垂直拖拽起始高度
  currentWidth: number;
  currentHeight: number;    // ← 新增：垂直拖拽当前高度
  handleEl: HTMLDivElement;
} | null>(null);
```

### 受控/非受控逻辑（与 rightPanel 对称）

```typescript
// ── Bottom Panel 受控/非受控 ─────────────────────────────
const [innerBottomPanelOpen, setInnerBottomPanelOpen] = useState(defaultBottomPanelOpen);
const isBottomPanelControlled = bottomPanelOpenProp !== undefined;
const actualBottomPanelOpen = isBottomPanelControlled ? bottomPanelOpenProp : innerBottomPanelOpen;

function setBottomPanelOpen(next: boolean) {
  if (!isBottomPanelControlled) {
    setInnerBottomPanelOpen(next);
  }
  onBottomPanelOpenChange?.(next);
}

const [bottomPanelHeight, setBottomPanelHeight] = useState(defaultBottomPanelHeight);
```

### startDrag 扩展（垂直拖拽支持）

```typescript
const startDrag = useCallback((
  type: 'sidebar' | 'right' | 'bottom-panel',
  e: React.MouseEvent<HTMLDivElement>
) => {
  e.preventDefault();
  const handleEl = e.currentTarget;
  handleEl.setAttribute('data-active', 'true');
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

  function onMove(ev: MouseEvent) {
    if (!dragRef.current || !shellRef.current) return;

    if (dragRef.current.type === 'bottom-panel') {
      // ── 垂直拖拽：向上 = 增大高度 ──
      const delta = dragRef.current.startY - ev.clientY;
      const h = Math.min(Math.max(
        dragRef.current.startHeight + delta,
        bottomPanelMinHeight
      ), bottomPanelMaxHeight);
      shellRef.current.style.setProperty('--shell-bottom-panel-height', `${h}px`);
      dragRef.current.currentHeight = h;
    } else {
      // ── 水平拖拽：现有逻辑保持不变 ──
      const delta = ev.clientX - dragRef.current.startX;
      let w: number;
      if (dragRef.current.type === 'sidebar') {
        // ... 现有 sidebar 逻辑 ...
        w = Math.min(Math.max(dragRef.current.startWidth + delta, sidebarMinWidth), sidebarMaxWidth);
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
      if (dragRef.current.type === 'bottom-panel') {
        setBottomPanelHeight(dragRef.current.currentHeight);
      } else if (dragRef.current.type === 'sidebar') {
        const nextWidth = resolveSidebarWidth(dragRef.current.currentWidth);
        shellEl?.style.setProperty('--shell-sidebar-width', `${nextWidth}px`);
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
  sidebarWidth, rightPanelWidth, bottomPanelHeight,  // ← 新增 bottomPanelHeight
  sidebarMinWidth, sidebarMaxWidth,
  sidebarSnapPoints, sidebarSnapMode, sidebarSnapThreshold,
  rightPanelMinWidth, rightPanelMaxWidth,
  bottomPanelMinHeight, bottomPanelMaxHeight,         // ← 新增
]);
```

### 核心 JSX 结构

```tsx
// ── 提取 Bottom Panel + Handle 片段，避免两种模式重复书写 ──
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

const isCenterPanel = bottomPanelLayout === 'center';

return (
  <div
    ref={shellRef}
    className="app-shell"
    style={
      {
        '--shell-sidebar-width': hasSidebar ? `${sidebarWidth}px` : '0px',
        '--shell-right-panel-width': `${rightPanelWidth}px`,
        '--shell-bottom-panel-height': `${bottomPanelHeight}px`,  // ← 新增
      } as React.CSSProperties
    }
  >
    {/* ── 标题栏（完整保留，仅新增 bottomPanelToggle 按钮） ── */}
    <header ...>
      {/* ... 现有标题栏，在 tb-right 中增加 bottomPanelToggle ... */}
    </header>

    {/* ── 工作区 ── */}
    <div className="app-shell__workspace">

      {/* 侧边栏 + 把手（完整保留） */}
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

          {hasRightPanel && actualRightPanelOpen && (
            <div
              className="app-shell__resize-handle app-shell__resize-handle--main"
              onMouseDown={(e) => startDrag('right', e)}
            />
          )}
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
```

**关键设计决策**：通过 `bottomPanelElements` 变量提取 Bottom Panel + Handle 的 JSX 片段，在 `center` 模式下渲染到 `.main-area` 内部，在 `wide` 模式下渲染到 `.workbench` 级别，避免代码重复。

---

## 🎨 第三部分：增量 CSS 样式

以下样式为**纯增量新增**，追加到现有 `AppShell.css` 末尾。

```css
/* ─────────────────────────────────────────────────────────────
   AppShell — Bottom Panel + Status Bar 增量样式
   ───────────────────────────────────────────────────────────── */

/* ── 新增 CSS 变量 ── */
.app-shell {
  --shell-bottom-panel-height: 200px;
  --shell-bottom-panel-bg: var(--shell-main-bg);
  --shell-bottom-panel-color: var(--shell-main-color);
  --shell-statusbar-height: 24px;
  --shell-statusbar-bg: #f3f3f3;
  --shell-statusbar-color: #5a5a5a;
  --shell-statusbar-border-color: rgba(0, 0, 0, 0.08);
}

/* ── 工作台容器 ── */
.app-shell__workbench {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

.app-shell__workbench-content {
  flex: 1;
  display: flex;
  min-height: 0;
  overflow: hidden;
}

/* center 模式下：包裹 main + bottomPanel 的纵向容器 */
.app-shell__main-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

/* center 模式下 main 不再需要外层设置的 padding-top，由 main-area 继承 */
.app-shell__main-area > .app-shell__main {
  /* main 在 main-area 内部：flex: 1 纵向填满，保留原有横向 flex: 1 行为 */
  flex: 1;
  display: flex;
  min-height: 0;
  overflow: hidden;
}

/* ── Bottom Panel ── */
.app-shell__bottom-panel {
  height: var(--shell-bottom-panel-height);
  flex-shrink: 0;
  background: var(--shell-bottom-panel-bg);
  color: var(--shell-bottom-panel-color);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: height var(--shell-transition);
}

.app-shell__bottom-panel--collapsed {
  height: 0;
}

/* ── Bottom Panel 垂直拖拽把手 ── */
.app-shell__resize-handle--bottom {
  width: 100%;          /* 覆盖基类的 5px */
  height: 5px;
  cursor: row-resize;   /* 覆盖基类的 col-resize */
}

.app-shell__resize-handle--bottom::after {
  /* 覆盖基类的竖线为横线 */
  top: 2px;
  bottom: auto;
  left: 0;
  right: 0;
  width: auto;
  height: 1px;
  background: var(--shell-border-color);
}

.app-shell__resize-handle--bottom:hover::after {
  background: rgba(100, 130, 255, 0.45);
}

.app-shell__resize-handle--bottom[data-active]::after {
  top: 1px;
  height: 3px;
  background: rgba(100, 130, 255, 0.6);
}

/* ── Status Bar ── */
.app-shell__status-bar {
  height: var(--shell-statusbar-height);
  flex-shrink: 0;
  background-color: var(--shell-statusbar-bg);
  color: var(--shell-statusbar-color);
  border-top: 1px solid var(--shell-statusbar-border-color);
  font-size: 11px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  user-select: none;
  width: 100%;
  box-sizing: border-box;
}

/* ── 拖拽状态扩展 ── */

/* 垂直拖拽时覆盖 cursor */
.app-shell--dragging-v {
  cursor: row-resize;
}

/* 拖拽期间禁用 bottom-panel transition */
.app-shell--dragging .app-shell__bottom-panel {
  transition: none;
}

/* ── 深色模式 ── */

@media (prefers-color-scheme: dark) {
  .app-shell {
    --shell-bottom-panel-bg: var(--shell-main-bg);
    --shell-bottom-panel-color: var(--shell-main-color);
    --shell-statusbar-bg: #18181b;
    --shell-statusbar-color: #a1a1aa;
    --shell-statusbar-border-color: rgba(255, 255, 255, 0.08);
  }
}

html[data-theme="dark"] .app-shell {
  --shell-bottom-panel-bg: var(--shell-main-bg);
  --shell-bottom-panel-color: var(--shell-main-color);
  --shell-statusbar-bg: #18181b;
  --shell-statusbar-color: #a1a1aa;
  --shell-statusbar-border-color: rgba(255, 255, 255, 0.08);
}

html[data-theme="light"] .app-shell {
  --shell-bottom-panel-bg: var(--shell-main-bg);
  --shell-bottom-panel-color: var(--shell-main-color);
  --shell-statusbar-bg: #f3f3f3;
  --shell-statusbar-color: #5a5a5a;
  --shell-statusbar-border-color: rgba(0, 0, 0, 0.08);
}
```

### 现有 CSS 兼容性

| 现有规则 | 影响 |
|----------|------|
| `.app-shell` (flex column) | **无需修改** |
| `.app-shell__workspace` (flex row) | **无需修改** |
| `.app-shell__main` (flex: 1) | **无需修改**，wide 模式为 workbench-content 子元素，center 模式为 main-area 子元素 |
| `.app-shell__right-panel` | **无需修改** |
| `.app-shell__resize-handle` | **无需修改**，底部把手通过 `--bottom` 修饰符覆盖方向 |
| `.app-shell--dragging` | **无需修改**，新增 `--dragging-v` 覆盖 cursor |

---

## 🚀 第四部分：接入端实战指南

### 场景 A：经典 IDE — wide 模式（终端横跨 Main + RightPanel）

```tsx
import { AppShell } from '@try-ui/tauri-app-shell';

function MyIDE() {
  return (
    <AppShell
      sidebar={<FileTree />}
      rightPanel={<AICopilot />}
      bottomPanel={<TerminalPanel />}
      // bottomPanelLayout="wide"  ← 默认值，可省略
      statusBar={
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
          <div>git: main</div>
          <div>TypeScript | UTF-8 | Ln 42, Col 8</div>
        </div>
      }
    >
      <EditorArea />
    </AppShell>
  );
}
```

---

### 场景 A2：VS Code 风格 — center 模式（终端仅在 Main 下方，AI Copilot 全高）

```tsx
function MyVSCodeStyleIDE() {
  return (
    <AppShell
      sidebar={<FileTree />}
      rightPanel={<AICopilot />}  // 全高贯穿，不被 bottom panel 挤压
      bottomPanel={<TerminalPanel />}
      bottomPanelLayout="center"  // ← 关键：面板仅在 main 下方
      statusBar={
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
          <div>git: main</div>
          <div>TypeScript | UTF-8 | Ln 42, Col 8</div>
        </div>
      }
    >
      <EditorArea />
    </AppShell>
  );
}
```

---

### 场景 B：CAD 审图工具（受控 Bottom Panel + Workbench Status Bar）

```tsx
import { useState } from 'react';
import { AppShell } from '@try-ui/tauri-app-shell';

function MyCADReviewApp() {
  const [showOutput, setShowOutput] = useState(false);

  return (
    <AppShell
      sidebar={<LayerTree />}
      rightPanel={<AICopilot />}
      // 受控模式：由业务状态决定面板开关
      bottomPanel={<CommandOutput />}
      bottomPanelOpen={showOutput}
      onBottomPanelOpenChange={setShowOutput}
      bottomPanelToggle={false}  // 自定义触发，不需要默认按钮
      defaultBottomPanelHeight={160}
      // Sidebar 全高贯穿，状态栏仅覆盖工作台
      statusBarLayout="workbench"
      statusBar={
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
          <div>Sidecar: Connected</div>
          <div>Token: 2.3k / 4k</div>
        </div>
      }
    >
      <CADCanvas onCommandExecute={() => setShowOutput(true)} />
    </AppShell>
  );
}
```

---

### 场景 C：仅 Status Bar（无 Bottom Panel）

```tsx
function MySimpleApp() {
  return (
    <AppShell
      sidebar={<Nav />}
      statusBar={
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
          <div>v1.2.0</div>
          <div>Ready</div>
        </div>
      }
    >
      <Dashboard />
    </AppShell>
  );
}
```

---

### 场景 D：混合模式（Shell 级面板 + Canvas 嵌套坐标栏）

```tsx
function MyCombinedApp() {
  return (
    <AppShell
      sidebar={<FileTree />}
      rightPanel={<AICopilot />}
      bottomPanel={<Terminal />}        // Shell 级别：可拖拽终端
      statusBarLayout="workbench"
      statusBar={<GlobalStatusInfo />}  // Shell 级别：全局信息
    >
      {/* children 内部：嵌套 CAD 专属坐标栏，Shell 零感知 */}
      <CADWorkspace />
    </AppShell>
  );
}

// CADWorkspace 内部自行管理高频坐标刷新
function CADWorkspace() {
  const [coords, setCoords] = useState({ x: 0, y: 0 });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ flex: 1 }} onMouseMove={(e) => setCoords({ x: e.clientX, y: e.clientY })}>
        <canvas style={{ width: '100%', height: '100%' }} />
      </div>
      <div style={{
        height: '24px', background: '#121214', borderTop: '1px solid #222',
        color: '#888', fontSize: '11px', display: 'flex',
        alignItems: 'center', padding: '0 10px', gap: '12px',
      }}>
        <span>坐标: {coords.x.toFixed(2)}, {coords.y.toFixed(2)}</span>
        <span>比例: 1:100</span>
        <span>单位: mm</span>
      </div>
    </div>
  );
}
```

---

## 💎 方案优势总结

1. **零破坏性变更**：所有现有 CSS 和拖拽逻辑完整保留。`.workbench` / `.workbench-content` 在无新功能时为透明 Flex 包装，对布局零影响。
2. **API 对称一致**：`bottomPanel` 的受控/非受控/toggle 模式与 `rightPanel` 完全对称，学习成本为零。
3. **灵活的面板布局**：`bottomPanelLayout` 支持 `'wide'`（横跨 Main + RightPanel）和 `'center'`（仅 Main 下方）两种模式，覆盖主流桌面应用的布局需求。
4. **Flex 原生兼容**：垂直把手复用现有 `startDrag` 基础设施，仅扩展方向维度。无需引入 Grid 或命令式布局引擎。
5. **性能隔离**：Bottom Panel 在 `.workbench` 内部，高度变化不影响 Sidebar 渲染。Canvas 嵌套模式下，高频坐标刷新不穿透 Shell。
6. **向下兼容**：不传 `bottomPanel` / `statusBar` 时与原版体验 100% 兼容。
