# tauri-app-shell

Tauri 2.0 + React 透明自定义标题栏 + 弹性多列布局组件。

- 透明窗口，标题栏颜色与下方内容列自然连续
- macOS 保留原生红绿灯，Windows / Linux 自绘窗口控制按钮
- 支持单栏 / 两栏 / 三栏，侧边栏和右侧面板均可折叠、可拖拽调整宽度
- 所有标题栏区域均为插槽，完全自定义
- 内置浅色 / 深色主题，支持跟随系统或手动切换

---

## 安装

```bash
pnpm add git+https://github.com/MengHuanLanYu/tauri-app-shell.git
```

锁定版本（推荐生产环境）：

```bash
pnpm add git+https://github.com/MengHuanLanYu/tauri-app-shell.git#v0.1.0
```

---

## Tauri 侧配置（必须）

### 1. 平台配置文件

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

### 2. 开启拖拽权限

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

### 右侧面板受控模式

默认情况下右侧面板的开关由 `AppShell` 内部维护（非受控）。
传入 `rightPanelOpen` 后进入**受控模式**，开关状态完全由调用方管理。

#### 场景一：业务状态驱动（密码模块）

第三列跟随选中项自动打开/关闭，隐藏内置 toggle 按钮：

```tsx
<AppShell
  sidebar={<MainNav />}
  rightPanel={selectedPassword ? <PasswordDetail /> : undefined}
  rightPanelOpen={!!selectedPassword}
  rightPanelToggle={false}
>
  <PasswordList />
</AppShell>
```

#### 场景二：业务状态 + 允许手动收起

有选中项时面板打开，但用户仍可点击按钮手动收起：

```tsx
const [panelOpen, setPanelOpen] = useState(false);

// 选中项变化时同步打开面板
useEffect(() => {
  if (selectedItem) setPanelOpen(true);
}, [selectedItem]);

<AppShell
  sidebar={<MainNav />}
  rightPanel={<Inspector item={selectedItem} />}
  rightPanelOpen={panelOpen}
  onRightPanelOpenChange={setPanelOpen}   // 按钮点击 → 这里被调用 → 状态更新
>
  <ItemList />
</AppShell>
```

#### 场景三：非受控（默认行为，向后兼容）

不传 `rightPanelOpen`，行为与之前完全一致：

```tsx
<AppShell
  sidebar={<LeftSidebar />}
  rightPanel={<RightPanel />}
  defaultRightPanelOpen={true}   // 仅控制初始状态
>
  <main>主内容</main>
</AppShell>
```

---

## Props


| Prop                     | 类型                  | 默认值         | 说明                                              |
| ------------------------ | ------------------- | ----------- | ----------------------------------------------- |
| `children`               | `ReactNode`         | 必填          | 主内容区                                            |
| `sidebar`                | `ReactNode`         | —           | 左侧边栏；不传则不渲染                                     |
| `rightPanel`             | `ReactNode`         | —           | 右侧面板；不传则不渲染                                     |
| `sidebarToggle`          | `ReactNode \| false` | `undefined` | `undefined` 有 sidebar 时显示默认按钮；`false` 隐藏；传节点则替换 |
| `rightPanelToggle`       | `ReactNode \| false` | `undefined` | 同上，控制右侧面板切换按钮                                   |
| `titlebarLeft`           | `ReactNode`         | —           | 标题栏左侧额外内容（sidebarToggle 之后）                     |
| `titlebarCenter`         | `ReactNode`         | —           | 标题栏中间（可拖拽区域内）                                   |
| `titlebarRight`          | `ReactNode`         | —           | 标题栏右侧额外内容（rightPanelToggle 之前）                  |
| `defaultSidebarOpen`        | `boolean`                | `true`      | 侧边栏初始展开状态                                                  |
| `rightPanelOpen`            | `boolean`                | —           | **受控**：右侧面板展开状态；传入后由调用方管理，AppShell 不再维护内部状态               |
| `defaultRightPanelOpen`     | `boolean`                | `true`      | **非受控**：右侧面板初始展开状态（`rightPanelOpen` 未传时生效）                |
| `onRightPanelOpenChange`    | `(open: boolean) => void` | —           | 受控模式下面板开关变化时的回调；非受控模式下按钮点击同样会触发，可用于监听 |
| `defaultSidebarWidth`    | `number`            | `220`       | 侧边栏初始宽度（px）                                     |
| `sidebarMinWidth`        | `number`            | `140`       | 侧边栏拖拽最小宽度（px）                                   |
| `sidebarMaxWidth`        | `number`            | `480`       | 侧边栏拖拽最大宽度（px）                                   |
| `defaultRightPanelWidth` | `number`            | `260`       | 右侧面板初始宽度（px）                                    |
| `rightPanelMinWidth`     | `number`            | `160`       | 右侧面板拖拽最小宽度（px）                                  |
| `rightPanelMaxWidth`     | `number`            | `520`       | 右侧面板拖拽最大宽度（px）                                  |


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
  /* 默认无圆角/阴影（适合 Tauri 全屏窗口）；需要浮动卡片效果时启用： */
  /* --shell-radius: 12px; */
  /* --shell-shadow: 0 20px 60px rgba(0, 0, 0, 0.25); */
}
```

---

## 发版（维护者）

使用内置发版脚本，自动完成：更新 `package.json` 版本号 → 构建 → commit → 打 Tag → 推送。

```bash
# 格式：pnpm release <版本号>
pnpm release 0.2.0
```

脚本会自动校验：

- 版本号格式是否正确（x.y.z）
- 工作区是否有未提交的改动
- Tag 是否已存在

发版成功后，其他项目执行以下命令升级：

```bash
# 方式一：锁定版本（推荐）
pnpm add git+https://github.com/MengHuanLanYu/tauri-app-shell.git#v0.2.0

# 方式二：修改 package.json 中的版本后执行
pnpm install
```

> **注意**：`#v0.1.0` 是 Git Tag，不是分支。必须通过发版脚本或手动 `git tag` 后才能使用指定版本安装。

---

## peerDependencies


| 包                 | 版本          |
| ----------------- | ----------- |
| `react`           | `>=18`      |
| `react-dom`       | `>=18`      |
| `@tauri-apps/api` | `>=2`       |
| `lucide-react`    | `>=0.300.0` |


