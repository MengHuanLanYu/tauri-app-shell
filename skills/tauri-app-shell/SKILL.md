---
name: tauri-app-shell
description: 在 Tauri 2.0 + React 项目中使用 tauri-app-shell 搭建透明标题栏和桌面工作区布局。适用于安装或配置 AppShell、自定义 macOS 红绿灯与跨平台窗口、实现 sidebar/rightPanel/bottomPanel/statusBar、多栏工作台、处理受控或非受控面板状态、调整拖拽吸附与主题变量，以及排查白边、透明窗口失效、拖拽区错位等接入问题。
---

# Tauri App Shell

## 先读哪里

- 先读 `README.md`，按文档完成安装、Tauri 配置和基础示例接入。
- 如果用户问题和 README 示例不完全匹配，再读 `src/AppShell.tsx` 确认 props、默认值和渲染规则。
- 如果 README 与源码冲突，以源码行为为准。

## 接入流程

1. 确认目标项目是 `Tauri 2.x + React`。
2. 安装 `tauri-app-shell`，并确认 `react`、`react-dom`、`@tauri-apps/api`、`lucide-react` 已可用。
3. 在 `src-tauri/capabilities/default.json` 添加 `core:window:allow-start-dragging`。
4. 为 macOS、Windows、Linux 分别维护 `src-tauri/tauri.*.conf.json`；Tauri 不会自动发现这些平台配置，必须在脚本里显式传 `--config`。
5. 在全局样式中保证 `html, body, #root` 满屏、无边距、`overflow: hidden`、`background: transparent`。
6. 在入口文件引入 `import 'tauri-app-shell/style';`。
7. 直接把 `<AppShell>` 渲染为应用最外层根组件，不要再包一层 DOM 或布局组件。
8. 按需求选择布局：
   - 单栏：只传 `children`
   - 双栏：传 `sidebar`
   - 三栏：传 `sidebar + rightPanel`
   - 底部面板：传 `bottomPanel`，并选择 `bottomPanelLayout`
   - 状态栏：传 `statusBar`，并选择 `statusBarLayout`
9. 按交互复杂度选择状态管理方式：
   - `sidebar` 目前只有默认开关态：`defaultSidebarOpen`
   - `rightPanel` 支持受控和非受控：`rightPanelOpen` / `defaultRightPanelOpen` / `onRightPanelOpenChange`
   - `bottomPanel` 支持受控和非受控：`bottomPanelOpen` / `defaultBottomPanelOpen` / `onBottomPanelOpenChange`
10. 用 `<html data-theme="light|dark">` 和 `.app-shell` CSS 变量做主题与视觉定制。

## 典型用法选择

- 内容页或详情页：用 `rightPanel`，需要业务驱动开关时优先用受控模式。
- IDE/编辑器式布局：用 `sidebar + rightPanel + bottomPanel + statusBar`。
- 终端、日志、输出区：用 `bottomPanel`，通常配合 `bottomPanelLayout="wide"`。
- AI 助手、检查器、属性栏：用 `rightPanel`。
- 固定信息条：用 `statusBar`，如果不想覆盖 sidebar 底部，用 `statusBarLayout="workbench"`。
- 窄栏/展开栏两态导航：给 `sidebar` 配 `sidebarSnapPoints`，优先考虑 `sidebarSnapMode="direction"`。

## 关键约束

- `AppShell` 必须是最外层根组件。外面多包一层，最常见后果是白边、滚动条、透明窗口失效或拖拽区错位。
- `html, body, #root` 必须满屏且 `background: transparent`；缺少这一步通常会出现白边。
- 平台窗口配置必须由 Tauri 启动脚本显式传 `--config`，不要假设平台配置文件会被自动发现。
- `sidebarToggle`、`rightPanelToggle`、`bottomPanelToggle` 的约定一致：
  - `undefined`：仅在对应面板存在时渲染内置切换按钮
  - `false`：强制隐藏
  - 自定义 `ReactNode`：只负责渲染，不会被库自动注入开关逻辑
- 如果某个面板内容不存在，不要期待对应的内置 toggle、面板容器或 resize handle 继续出现。
- `bottomPanelLayout="wide"` 时，底部面板横跨 `main + rightPanel`；`"center"` 时仅位于 `main` 下方，`rightPanel` 保持全高。
- `statusBarLayout="full"` 时状态栏横跨全窗口；`"workbench"` 时只覆盖 `main + rightPanel`，`sidebar` 全高贯穿。

## 常见排查

- 白边或窗口没铺满：先检查最外层是否直接渲染 `<AppShell>`，再检查 `html, body, #root` 的满屏样式。
- 透明窗口不生效：先检查平台 `tauri.*.conf.json` 是否真的通过启动脚本传入。
- 标题栏不能拖拽：检查 `src-tauri/capabilities/default.json` 是否包含 `core:window:allow-start-dragging`。
- 想让右侧详情随业务状态出现或隐藏：使用 `rightPanelOpen` 和 `onRightPanelOpenChange`，不要只依赖内部 toggle。
- 想让底部面板由外部控制：使用 `bottomPanelOpen` 和 `onBottomPanelOpenChange`。
- 想做浅色/深色切换：设置 `<html data-theme="light">` 或 `<html data-theme="dark">`，未设置时默认跟随系统。

## 回答用户请求时的偏好

- 优先直接给出可粘贴的 Tauri 配置、React 用法和 CSS 片段。
- 优先根据用户目标推荐布局组合，而不是罗列全部 props。
- 如果用户只是在做应用接入，不要展开介绍组件库内部维护流程。
