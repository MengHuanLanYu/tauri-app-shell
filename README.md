# tauri-app-shell

Tauri 2.0 + React 透明自定义标题栏 + 弹性多列布局组件。

- 透明窗口，标题栏颜色与下方内容列自然连续
- macOS 保留原生红绿灯，Windows / Linux 自绘窗口控制按钮
- 支持单栏 / 两栏 / 三栏，侧边栏和右侧面板均可折叠动画
- 所有标题栏区域均为插槽，完全自定义

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

---

## Props


| Prop                    | 类型                  | 默认值         | 说明                                              |
| ----------------------- | ------------------- | ----------- | ----------------------------------------------- |
| `children`              | `ReactNode`         | 必填          | 主内容区                                            |
| `sidebar`               | `ReactNode`         | —           | 左侧边栏；不传则不渲染                                     |
| `rightPanel`            | `ReactNode`         | —           | 右侧面板；不传则不渲染                                     |
| `sidebarToggle`         | `ReactNode | false` | `undefined` | `undefined` 有 sidebar 时显示默认按钮；`false` 隐藏；传节点则替换 |
| `rightPanelToggle`      | `ReactNode | false` | `undefined` | 同上，控制右侧面板切换按钮                                   |
| `titlebarLeft`          | `ReactNode`         | —           | 标题栏左侧额外内容（sidebarToggle 之后）                     |
| `titlebarCenter`        | `ReactNode`         | —           | 标题栏中间（可拖拽区域内）                                   |
| `titlebarRight`         | `ReactNode`         | —           | 标题栏右侧额外内容（rightPanelToggle 之前）                  |
| `defaultSidebarOpen`    | `boolean`           | `true`      | 侧边栏初始展开状态                                       |
| `defaultRightPanelOpen` | `boolean`           | `true`      | 右侧面板初始展开状态                                      |


---

## CSS 变量定制

在 `.app-shell` 父元素上覆盖变量即可调整主题：

```css
.app-shell {
  --shell-sidebar-width:      220px;
  --shell-right-panel-width:  260px;
  --shell-titlebar-height:    36px;
  /* 跟随 trafficLightPosition.x 调整，使按钮紧贴红绿灯右侧 */
  --shell-traffic-spacer-w:   74px;
  --shell-sidebar-bg:         #ede8e3;
  --shell-main-bg:            #ffffff;
  --shell-border-color:       rgba(0, 0, 0, 0.07);
  --shell-transition:         0.22s ease;
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


