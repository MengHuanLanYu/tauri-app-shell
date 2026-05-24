# tauri-app-shell

Tauri 2.0 + React 透明自定义标题栏 + 弹性多列布局组件。

- 透明窗口，标题栏颜色与下方内容列自然连续
- macOS 保留原生红绿灯，Windows / Linux 自绘窗口控制按钮
- 支持单栏 / 两栏 / 三栏，侧边栏和右侧面板均可折叠、可拖拽调整宽度
- 支持侧边栏拖拽吸附：就近吸附、阈值吸附、方向吸附三种模式
- 底部面板（Bottom Panel）：可拖拽调整高度，支持 wide/center 两种布局模式
- 状态栏（Status Bar）：固定高度信息展示栏，支持 full/workbench 两种布局模式
- 所有标题栏区域均为插槽，完全自定义
- 内置浅色 / 深色主题，支持跟随系统或手动切换

---

## 安装

```bash
pnpm add tauri-app-shell
```

或使用 npm：

```bash
npm install tauri-app-shell
```

锁定版本（推荐生产环境）：

```bash
pnpm add tauri-app-shell@<version>
```

将 `<version>` 替换为你要使用的发布版本。

---

## Tauri 侧配置（必须）

### 1. 基础窗口配置

`src-tauri/tauri.conf.json`

```json
{
  "app": {
    "windows": [{
      "title": "app",
      "width": 1200,
      "height": 800,
      "center": true,
      "minWidth": 600,
      "minHeight": 400
    }]
  }
}
```

将公共配置保留在基础文件里，把透明窗口、标题栏样式等平台差异放到各平台配置文件中。

### 2. 平台配置文件

`**src-tauri/tauri.macos.conf.json**`

```json
{
  "app": {
    "windows": [{
      "titleBarStyle": "Overlay",
      "hiddenTitle": true,
      "transparent": true,
      "trafficLightPosition": { "x": 14, "y": 16 }
    }]
  }
}
```

`**src-tauri/tauri.windows.conf.json**`

```json
{
  "app": {
    "windows": [{ "decorations": false, "transparent": true }]
  }
}
```

`**src-tauri/tauri.linux.conf.json**`

```json
{
  "app": {
    "windows": [{ "decorations": false, "transparent": false }]
  }
}
```

Tauri 不会自动发现这些平台配置文件。请在 `package.json` 里显式传入 `--config`：

```json
{
  "scripts": {
    "tauri:dev:mac": "tauri dev --config src-tauri/tauri.macos.conf.json",
    "tauri:dev:win": "tauri dev --config src-tauri/tauri.windows.conf.json",
    "tauri:dev:linux": "tauri dev --config src-tauri/tauri.linux.conf.json"
  }
}
```

### 3. 开启拖拽权限

`**src-tauri/capabilities/default.json**`

```json
{
  "permissions": [
    "core:default",
    "core:window:allow-start-dragging"
  ]
}
```

---

## 重要约束

`AppShell` 必须作为应用的**最外层根组件**直接渲染，外层不允许再包裹任何其他组件或 DOM 元素。

```tsx
// ✅ 正确
export default function App() {
  return (
    <AppShell>
      ...
    </AppShell>
  );
}

// ❌ 错误 —— AppShell 外层有包裹元素
export default function App() {
  return (
    <div className="wrapper">
      <AppShell>
        ...
      </AppShell>
    </div>
  );
}
```

> 外层包裹元素会破坏 `width: 100% / height: 100%` 的铺满逻辑，导致白边、布局错位或透明窗口失效。

---

## 使用

### 1. 全局基础样式（必须）

在全局 CSS 文件（如 `src/index.css`）中添加，确保组件能铺满整个透明窗口：

```css
html, body, #root {
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
  overflow: hidden;
  background: transparent;
}
```

> 缺少这段样式会导致窗口无法铺满、出现白边或滚动条。

### 2. 引入组件样式（只需一次）

在入口文件（如 `src/main.tsx`）中引入：

```tsx
import 'tauri-app-shell/style';
```

---

## Demo

### 单栏

```tsx
import { AppShell } from 'tauri-app-shell';

export default function App() {
  return (
    <AppShell>
      <div>主内容</div>
    </AppShell>
  );
}
```

### 两栏（左侧边栏 + 主内容）

```tsx
import { AppShell } from 'tauri-app-shell';

export default function App() {
  return (
    <AppShell sidebar={<Sidebar />}>
      <main>主内容</main>
    </AppShell>
  );
}
```

### 三栏

```tsx
import { AppShell } from 'tauri-app-shell';

export default function App() {
  return (
    <AppShell
      sidebar={<LeftSidebar />}
      rightPanel={<RightPanel />}
    >
      <main>主内容</main>
    </AppShell>
  );
}
```

### 自定义标题栏内容

```tsx
<AppShell
  sidebar={<Sidebar />}
  titlebarCenter={<span>My App</span>}
  titlebarRight={<SearchButton />}
>
  <main>主内容</main>
</AppShell>
```

### 隐藏折叠按钮

```tsx
// 不显示侧边栏折叠按钮
<AppShell sidebar={<Sidebar />} sidebarToggle={false}>
  <main>主内容</main>
</AppShell>
```

### 替换折叠按钮为自定义内容

```tsx
<AppShell
  sidebar={<Sidebar />}
  sidebarToggle={<button onClick={...}><MyIcon /></button>}
>
  <main>主内容</main>
</AppShell>
```

### 红绿灯右侧放自定义按钮（无折叠按钮）

```tsx
<AppShell
  sidebarToggle={false}
  titlebarLeft={
    <>
      <BackButton />
      <NewButton />
    </>
  }
>
  <main>主内容</main>
</AppShell>
```

### 侧边栏宽度吸附

默认拖拽是连续宽度。传入 `sidebarSnapPoints` 后，侧边栏会在拖拽过程中或拖拽结束时吸附到指定宽度。

#### 就近吸附（nearest，默认）

拖拽结束时吸附到距离当前位置最近的宽度点，适合一般工具面板。

```tsx
<AppShell
  sidebar={<Sidebar />}
  defaultSidebarWidth={200}
  sidebarMinWidth={80}
  sidebarMaxWidth={200}
  sidebarSnapPoints={[80, 200]}
  sidebarSnapMode="nearest"
>
  <main>主内容</main>
</AppShell>
```

#### 阈值吸附（threshold）

拖拽结束时按阈值判断。以下示例中，`<= 80` 吸到 `80`，`> 80` 吸到 `200`。

```tsx
<AppShell
  sidebar={<Sidebar />}
  defaultSidebarWidth={200}
  sidebarMinWidth={80}
  sidebarMaxWidth={200}
  sidebarSnapPoints={[80, 200]}
  sidebarSnapMode="threshold"
  sidebarSnapThreshold={80}
>
  <main>主内容</main>
</AppShell>
```

#### 方向吸附（direction）

拖拽过程中立即按方向切换：向右拖吸到最大点，向左拖吸到最小点。适合企业微信式“窄栏 / 展开栏”两态导航。

```tsx
<AppShell
  sidebar={<Sidebar />}
  defaultSidebarWidth={200}
  sidebarMinWidth={80}
  sidebarMaxWidth={200}
  sidebarSnapPoints={[80, 200]}
  sidebarSnapMode="direction"
>
  <main>主内容</main>
</AppShell>
```

### 底部面板（Bottom Panel）

可拖拽调整高度的富内容面板（终端、日志、输出等）。

#### wide 模式（默认）—— 面板横跨 Main + RightPanel

```tsx
<AppShell
  sidebar={<FileTree />}
  rightPanel={<AICopilot />}
  bottomPanel={<Terminal />}
>
  <EditorArea />
</AppShell>
```

#### center 模式 —— 面板仅在 Main 下方，RightPanel 全高

```tsx
<AppShell
  sidebar={<FileTree />}
  rightPanel={<AICopilot />}
  bottomPanel={<Terminal />}
  bottomPanelLayout="center"
>
  <EditorArea />
</AppShell>
```

#### 受控模式

```tsx
const [panelOpen, setPanelOpen] = useState(false);

<AppShell
  bottomPanel={<CommandOutput />}
  bottomPanelOpen={panelOpen}
  onBottomPanelOpenChange={setPanelOpen}
  bottomPanelToggle={false}
  defaultBottomPanelHeight={160}
>
  <Canvas />
</AppShell>
```

### 状态栏（Status Bar）

固定 24px 的信息展示栏。

#### full 模式（默认）—— 横跨窗口 100% 宽度

```tsx
<AppShell
  sidebar={<Nav />}
  statusBar={
    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
      <div>git: main</div>
      <div>Ln 42, Col 8</div>
    </div>
  }
>
  <Editor />
</AppShell>
```

#### workbench 模式 —— 仅覆盖 Main + RightPanel，Sidebar 全高

```tsx
<AppShell
  sidebar={<FileTree />}
  rightPanel={<AICopilot />}
  statusBarLayout="workbench"
  statusBar={<StatusInfo />}
>
  <Canvas />
</AppShell>
```

---

## Props


| Prop                     | 类型                  | 默认值         | 说明                                              |
| ------------------------ | ------------------- | ----------- | ----------------------------------------------- |
| `children`               | `ReactNode`         | 必填          | 主内容区                                            |
| `sidebar`                | `ReactNode`         | —           | 左侧边栏；不传则不渲染                                     |
| `rightPanel`             | `ReactNode`         | —           | 右侧面板；不传则不渲染                                     |
| `bottomPanel`            | `ReactNode`         | —           | 底部面板；不传则不渲染                                     |
| `statusBar`              | `ReactNode`         | —           | 状态栏；不传则不渲染                                       |
| `sidebarToggle`          | `ReactNode \| false` | `undefined` | `undefined` 有 sidebar 时显示默认按钮；`false` 隐藏；传节点则替换 |
| `rightPanelToggle`       | `ReactNode \| false` | `undefined` | 同上，控制右侧面板切换按钮                                   |
| `bottomPanelToggle`      | `ReactNode \| false` | `undefined` | 同上，控制底部面板切换按钮                                   |
| `titlebarLeft`           | `ReactNode`         | —           | 标题栏左侧额外内容（sidebarToggle 之后）                     |
| `titlebarCenter`         | `ReactNode`         | —           | 标题栏中间（可拖拽区域内）                                   |
| `titlebarRight`          | `ReactNode`         | —           | 标题栏右侧额外内容（rightPanelToggle 之前）                  |
| `defaultSidebarOpen`        | `boolean`                | `true`      | 侧边栏初始展开状态                                                  |
| `rightPanelOpen`            | `boolean`                | —           | **受控**：右侧面板展开状态；传入后由调用方管理               |
| `defaultRightPanelOpen`     | `boolean`                | `true`      | **非受控**：右侧面板初始展开状态                |
| `onRightPanelOpenChange`    | `(open: boolean) => void` | —           | 右侧面板开关变化时的回调 |
| `bottomPanelOpen`           | `boolean`                | —           | **受控**：底部面板展开状态；传入后由调用方管理               |
| `defaultBottomPanelOpen`    | `boolean`                | `true`      | **非受控**：底部面板初始展开状态                |
| `onBottomPanelOpenChange`   | `(open: boolean) => void` | —           | 底部面板开关变化时的回调 |
| `defaultSidebarWidth`    | `number`            | `220`       | 侧边栏初始宽度（px）                                     |
| `sidebarMinWidth`        | `number`            | `140`       | 侧边栏拖拽最小宽度（px）                                   |
| `sidebarMaxWidth`        | `number`            | `480`       | 侧边栏拖拽最大宽度（px）                                   |
| `sidebarSnapPoints`      | `readonly number[]` | —           | 侧边栏吸附宽度点；不传则保持连续拖拽                         |
| `sidebarSnapMode`        | `'nearest' \| 'threshold' \| 'direction'` | `'nearest'` | 吸附模式：就近、阈值、方向                                 |
| `sidebarSnapThreshold`   | `number`            | 最小吸附点   | `threshold` 模式阈值；`<=` 阈值吸到最小点，否则吸到最大点      |
| `defaultRightPanelWidth` | `number`            | `260`       | 右侧面板初始宽度（px）                                    |
| `rightPanelMinWidth`     | `number`            | `160`       | 右侧面板拖拽最小宽度（px）                                  |
| `rightPanelMaxWidth`     | `number`            | `520`       | 右侧面板拖拽最大宽度（px）                                  |
| `defaultBottomPanelHeight` | `number`           | `200`       | 底部面板初始高度（px）                                    |
| `bottomPanelMinHeight`   | `number`            | `100`       | 底部面板拖拽最小高度（px）                                  |
| `bottomPanelMaxHeight`   | `number`            | `600`       | 底部面板拖拽最大高度（px）                                  |
| `bottomPanelLayout`      | `'wide' \| 'center'` | `'wide'`   | 底部面板布局：`wide` 横跨 Main+RightPanel；`center` 仅 Main 下方 |
| `statusBarLayout`        | `'full' \| 'workbench'` | `'full'`   | 状态栏布局：`full` 横跨窗口；`workbench` 仅 Main+RightPanel |


---

## 主题切换

默认跟随系统 `prefers-color-scheme`。如需手动切换，在 `<html>` 上设置 `data-theme`：

```ts
document.documentElement.setAttribute('data-theme', 'dark');
document.documentElement.setAttribute('data-theme', 'light');
document.documentElement.removeAttribute('data-theme');
```

React 中可以这样写：

```tsx
useEffect(() => {
  document.documentElement.setAttribute('data-theme', theme);
  return () => document.documentElement.removeAttribute('data-theme');
}, [theme]);
```

---

## CSS 变量定制

在 `.app-shell` 父元素上覆盖变量即可调整主题：

```css
.app-shell {
  --shell-sidebar-width:      220px;    /* 侧边栏宽度（拖拽时自动更新） */
  --shell-right-panel-width:  260px;    /* 右面板宽度（拖拽时自动更新） */
  --shell-titlebar-height:    36px;     /* 标题栏高度 */
  --shell-traffic-spacer-w:   74px;     /* macOS 红绿灯占位宽，跟随 trafficLightPosition.x */
  --shell-sidebar-bg:         #f3f3f3;  /* 侧边栏背景色 */
  --shell-sidebar-color:      #3a3c3e;  /* 侧边栏文字色 */
  --shell-main-bg:            #ffffff;  /* 主内容区 / 右面板背景色 */
  --shell-main-color:         #1a1a1a;  /* 主内容区 / 右面板文字色 */
  --shell-border-color:       rgba(0, 0, 0, 0.07); /* 分隔线颜色 */
  --shell-icon-color:         #3a3a3a;  /* 标题栏图标色 */
  --shell-icon-hover-bg:      rgba(0, 0, 0, 0.10); /* 图标悬停背景 */
  --shell-transition:         0.22s ease;
  /* 底部面板 / 状态栏 */
  --shell-bottom-panel-height: 200px;   /* 底部面板高度（拖拽时自动更新） */
  --shell-bottom-panel-bg:    #ffffff;  /* 底部面板背景色 */
  --shell-bottom-panel-color: #1a1a1a;  /* 底部面板文字色 */
  --shell-statusbar-height:   24px;     /* 状态栏高度 */
  --shell-statusbar-bg:       #f3f3f3;  /* 状态栏背景色 */
  --shell-statusbar-color:    #5a5a5a;  /* 状态栏文字色 */
  --shell-statusbar-border-color: rgba(0, 0, 0, 0.08); /* 状态栏上边框色 */
  /* 默认无圆角/阴影（适合 Tauri 全屏窗口）；需要浮动卡片效果时启用： */
  /* --shell-radius: 12px; */
  /* --shell-shadow: 0 20px 60px rgba(0, 0, 0, 0.25); */
}
```

---

## 发版（维护者）

使用内置发版脚本，自动完成：更新 `package.json` 版本号 → 构建 → commit → 打 Tag → 推送 Git → 发布到 npm。

```bash
# 格式：pnpm release <版本号>
pnpm release <version>
```

脚本会自动校验：

- 版本号格式是否正确（x.y.z）
- 工作区是否有未提交的改动
- Tag 是否已存在

发版成功后，其他项目执行以下命令升级：

```bash
pnpm add tauri-app-shell@<version>
```

> **注意**：首次发布前请确保已登录 npm（`npm login`）。

---

## peerDependencies


| 包                 | 版本          |
| ----------------- | ----------- |
| `react`           | `>=18`      |
| `react-dom`       | `>=18`      |
| `@tauri-apps/api` | `>=2`       |
| `lucide-react`    | `>=0.300.0` |
