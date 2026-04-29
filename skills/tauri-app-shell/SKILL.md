---

## name: tauri-app-shell
description: 在 Tauri 2.0 + React 项目中安装和配置 tauri-app-shell 组件，实现自定义透明标题栏、多栏布局（左侧边栏 + 主区域 + 右面板）、macOS 红绿灯对齐、跨平台窗口配置。适用于接入 AppShell、配置自定义标题栏、安装 tauri-app-shell、实现多栏布局、设置透明窗口等场景。
---

# tauri-app-shell 快速接入

## 一、安装

```bash
# 将 <version> 替换为实际版本号，如 v0.1.4
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

`**src-tauri/tauri.conf.json**`（公共基础，去掉 transparent/decorations 等平台相关字段）：

```json
{
  "app": {
    "windows": [{ "title": "app", "width": 1200, "height": 800, "center": true, "minWidth": 600, "minHeight": 400 }]
  }
}
```

`**src-tauri/tauri.macos.conf.json**`：

```json
{
  "app": {
    "windows": [{ "titleBarStyle": "Overlay", "hiddenTitle": true, "transparent": true, "trafficLightPosition": { "x": 14, "y": 16 } }]
  }
}
```

`**src-tauri/tauri.windows.conf.json**`：

```json
{
  "app": { "windows": [{ "decorations": false, "transparent": true }] }
}
```

`**src-tauri/tauri.linux.conf.json**`：

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

### 3.3 最简用法（三栏）

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

### 3.4 双栏（隐藏右面板）

```tsx
<AppShell sidebar={<Sidebar />}>
  <MainContent />
</AppShell>
```

### 3.5 纯主区域（无侧边栏）

```tsx
<AppShell>{/* 主内容 */}</AppShell>
```

### 3.6 自定义标题栏内容

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

### 3.7 侧边栏吸附模式

`AppShell` 默认支持连续拖拽侧边栏宽度。传入 `sidebarSnapPoints` 后，可以让侧边栏在固定宽度之间吸附。

`nearest`：拖拽结束时吸附到最近的宽度点，适合普通可调宽面板。

```tsx
<AppShell
  sidebar={<Sidebar />}
  defaultSidebarWidth={200}
  sidebarMinWidth={80}
  sidebarMaxWidth={200}
  sidebarSnapPoints={[80, 200]}
  sidebarSnapMode="nearest"
>
  <MainContent />
</AppShell>
```

`threshold`：拖拽结束时按阈值吸附。下面示例中，`<= 80` 吸到 `80`，`> 80` 吸到 `200`。

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
  <MainContent />
</AppShell>
```

`direction`：拖拽过程中按方向立即吸附，向右拖到最大点，向左拖到最小点。适合企业微信式窄栏/展开栏两态导航。

```tsx
<AppShell
  sidebar={<Sidebar />}
  defaultSidebarWidth={200}
  sidebarMinWidth={80}
  sidebarMaxWidth={200}
  sidebarSnapPoints={[80, 200]}
  sidebarSnapMode="direction"
>
  <MainContent />
</AppShell>
```

---

## 四、Props 速查

| Prop                     | 类型                   | 默认    | 说明                              |
| ------------------------ | -------------------- | ----- | ------------------------------- |
| `children`               | ReactNode            | —     | 主内容区（必填）                        |
| `sidebar`                | ReactNode            | —     | 左侧边栏                            |
| `rightPanel`             | ReactNode            | —     | 右面板                             |
| `sidebarToggle`          | ReactNode \| false   | 默认按钮  | false = 不显示；传节点 = 自定义            |
| `rightPanelToggle`       | ReactNode \| false   | 默认按钮  | 同上                              |
| `titlebarLeft`           | ReactNode            | —     | 标题栏左区（红绿灯之后）                    |
| `titlebarCenter`         | ReactNode            | —     | 标题栏中区                           |
| `titlebarRight`          | ReactNode            | —     | 标题栏右区                           |
| `defaultSidebarOpen`     | boolean              | true  | 初始侧边栏状态                         |
| `defaultRightPanelOpen`  | boolean              | true  | 初始右面板状态                         |
| `defaultSidebarWidth`    | number               | 220   | 侧边栏初始宽度（px）                     |
| `sidebarMinWidth`        | number               | 140   | 侧边栏拖拽最小宽度（px）                   |
| `sidebarMaxWidth`        | number               | 480   | 侧边栏拖拽最大宽度（px）                   |
| `sidebarSnapPoints`      | readonly number[]    | —     | 侧边栏吸附宽度点；不传则保持连续拖拽          |
| `sidebarSnapMode`        | 'nearest' \| 'threshold' \| 'direction' | 'nearest' | 吸附模式：就近、阈值、方向 |
| `sidebarSnapThreshold`   | number               | 最小吸附点 | threshold 模式阈值；<= 阈值吸到最小点，否则吸到最大点 |
| `defaultRightPanelWidth` | number               | 260   | 右面板初始宽度（px）                     |
| `rightPanelMinWidth`     | number               | 160   | 右面板拖拽最小宽度（px）                   |
| `rightPanelMaxWidth`     | number               | 520   | 右面板拖拽最大宽度（px）                   |


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
  --shell-sidebar-width:      220px;    /* 侧边栏宽度（拖拽时自动更新） */
  --shell-right-panel-width:  260px;    /* 右面板宽度（拖拽时自动更新） */
  --shell-titlebar-height:    36px;     /* 标题栏高度 */
  --shell-traffic-spacer-w:   74px;     /* macOS 红绿灯占位宽 */
  --shell-sidebar-bg:         #f3f3f3;  /* 侧边栏背景色 */
  --shell-sidebar-color:      #3a3c3e;  /* 侧边栏文字色 */
  --shell-main-bg:            #ffffff;  /* 主内容区 / 右面板背景色 */
  --shell-main-color:         #1a1a1a;  /* 主内容区 / 右面板文字色 */
  --shell-border-color:       rgba(0, 0, 0, 0.07);
  --shell-icon-color:         #3a3a3a;
  --shell-transition:         0.22s ease;
  /* 默认无圆角/阴影；需要浮动卡片效果时启用： */
  /* --shell-radius: 12px; */
  /* --shell-shadow: 0 20px 60px rgba(0, 0, 0, 0.25); */
}
```
