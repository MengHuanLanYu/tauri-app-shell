---
name: tauri-app-shell
description: 在 Tauri 2.0 + React 项目中安装和配置 tauri-app-shell 组件，实现自定义透明标题栏、多栏布局（左侧边栏 + 主区域 + 右面板）、macOS 红绿灯对齐、跨平台窗口配置。适用于接入 AppShell、配置自定义标题栏、安装 tauri-app-shell、实现多栏布局、设置透明窗口等场景。
---

# tauri-app-shell 快速接入

## 一、安装

```bash
# 将 <version> 替换为实际版本号，如 v0.1.0
pnpm add git+https://github.com/MengHuanLanYu/tauri-app-shell.git#<version>
```

> 可用版本列表：[GitHub Releases](https://github.com/MengHuanLanYu/tauri-app-shell/releases)

同时确认 peerDependencies 已安装：`react`、`@tauri-apps/api`、`lucide-react`。

---

## 二、Tauri 侧配置（必做）

### 2.1 开启拖拽权限

`src-tauri/capabilities/default.json` 的 `permissions` 数组中添加：

```json
"core:window:allow-start-dragging"
```

### 2.2 平台配置文件

**`src-tauri/tauri.conf.json`**（公共基础，去掉 transparent/decorations 等平台相关字段）：
```json
{
  "app": {
    "windows": [{ "title": "app", "width": 1200, "height": 800, "center": true, "minWidth": 600, "minHeight": 400 }]
  }
}
```

**`src-tauri/tauri.macos.conf.json`**：
```json
{
  "app": {
    "windows": [{ "titleBarStyle": "Overlay", "hiddenTitle": true, "transparent": true, "trafficLightPosition": { "x": 14, "y": 17 } }]
  }
}
```

**`src-tauri/tauri.windows.conf.json`**：
```json
{
  "app": { "windows": [{ "decorations": false, "transparent": true }] }
}
```

**`src-tauri/tauri.linux.conf.json`**：
```json
{
  "app": { "windows": [{ "decorations": false, "transparent": false }] }
}
```

Tauri 不会自动发现平台配置文件，需要在 `package.json` 的启动脚本中显式指定：

```json
{
  "scripts": {
    "tauri:dev:mac":   "tauri dev --config src-tauri/tauri.macos.conf.json",
    "tauri:dev:win":   "tauri dev --config src-tauri/tauri.windows.conf.json",
    "tauri:dev:linux": "tauri dev --config src-tauri/tauri.linux.conf.json"
  }
}
```

macOS 下执行 `pnpm tauri:dev:mac` 启动。

---

## 重要约束

`AppShell` 必须是应用最外层根组件，外层不允许再套任何组件或 DOM 元素，否则会破坏铺满逻辑导致白边或透明窗口失效。

```tsx
// ✅ 正确
export default function App() {
  return <AppShell>...</AppShell>;
}

// ❌ 错误
export default function App() {
  return <div className="wrapper"><AppShell>...</AppShell></div>;
}
```

---

## 三、前端使用

### 3.1 全局基础样式（必须）

在全局 CSS 文件（如 `src/index.css`）中添加，缺少会导致白边或滚动条：

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

### 3.2 引入组件样式（入口文件，如 `main.tsx`）

```tsx
import 'tauri-app-shell/style';
```

### 3.2 最简用法（三栏）

```tsx
import { AppShell } from 'tauri-app-shell';

function App() {
  return (
    <AppShell
      sidebar={<div>左侧内容</div>}
      rightPanel={<div>右侧内容</div>}
    >
      <div>主区域内容</div>
    </AppShell>
  );
}
```

### 3.3 双栏（隐藏右面板）

```tsx
<AppShell sidebar={<Sidebar />}>
  <MainContent />
</AppShell>
```

### 3.4 纯主区域（无侧边栏）

```tsx
<AppShell>{/* 主内容 */}</AppShell>
```

### 3.5 自定义标题栏内容

```tsx
<AppShell
  titlebarLeft={<span>Logo</span>}
  titlebarCenter={<SearchBar />}
  titlebarRight={<UserAvatar />}
  sidebarToggle={false}        // false = 隐藏折叠按钮
  rightPanelToggle={<MyBtn />} // 传入自定义按钮
>
  ...
</AppShell>
```

---

## 四、Props 速查

| Prop | 类型 | 默认 | 说明 |
|------|------|------|------|
| `children` | ReactNode | — | 主内容区（必填） |
| `sidebar` | ReactNode | — | 左侧边栏 |
| `rightPanel` | ReactNode | — | 右面板 |
| `sidebarToggle` | ReactNode \| false | 默认按钮 | false = 不显示 |
| `rightPanelToggle` | ReactNode \| false | 默认按钮 | false = 不显示 |
| `titlebarLeft` | ReactNode | — | 标题栏左区（红绿灯之后） |
| `titlebarCenter` | ReactNode | — | 标题栏中区 |
| `titlebarRight` | ReactNode | — | 标题栏右区 |
| `defaultSidebarOpen` | boolean | true | 初始侧边栏状态 |
| `defaultRightPanelOpen` | boolean | true | 初始右面板状态 |

---

## 五、主题切换

AppShell 默认跟随系统 `prefers-color-scheme`。如需手动切换，在 `<html>` 上设置 `data-theme` 属性即可：

```ts
// 切换到深色
document.documentElement.setAttribute('data-theme', 'dark');

// 切换到浅色
document.documentElement.setAttribute('data-theme', 'light');

// 移除后恢复跟随系统
document.documentElement.removeAttribute('data-theme');
```

React 中典型用法：

```tsx
const [theme, setTheme] = useState<'light' | 'dark'>('light');

useEffect(() => {
  document.documentElement.setAttribute('data-theme', theme);
}, [theme]);
```

> 不需要手动切换的项目无需关心此属性，组件默认跟随系统。

---

## 六、CSS 变量定制

在全局 CSS 中覆盖（`.app-shell` 作用域）：

```css
.app-shell {
  --shell-sidebar-width:      240px;                          /* 左侧栏宽度 */
  --shell-right-panel-width:  300px;                          /* 右面板宽度 */
  --shell-titlebar-height:    40px;                           /* 标题栏高度 */
  --shell-traffic-spacer-w:   74px;                           /* macOS 红绿灯占位宽 */
  --shell-sidebar-bg:         #f0f0f0;                        /* 左侧背景色 */
  --shell-main-bg:            #ffffff;                        /* 主区域背景色 */
  --shell-right-panel-bg:     #ffffff;                        /* 右面板背景色 */

  /* 默认无圆角/阴影，适合 Tauri 全屏窗口直接填满。
     需要浮动卡片效果时取消注释： */
  /* --shell-radius: 12px; */
  /* --shell-shadow: 0 20px 60px rgba(0, 0, 0, 0.25); */
}
```

