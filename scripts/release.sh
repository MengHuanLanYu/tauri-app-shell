#!/usr/bin/env bash
# release.sh — 一键发布新版本
# 用法：bash scripts/release.sh 0.2.0

set -e

VERSION=$1

# ── 参数校验 ──────────────────────────────────────────────
if [ -z "$VERSION" ]; then
  echo "❌ 请传入版本号，例如：bash scripts/release.sh 0.2.0"
  exit 1
fi

if ! echo "$VERSION" | grep -qE '^[0-9]+\.[0-9]+\.[0-9]+$'; then
  echo "❌ 版本号格式不正确，应为 x.y.z，例如：0.2.0"
  exit 1
fi

TAG="v$VERSION"

# ── 检查工作区是否干净 ────────────────────────────────────
if [ -n "$(git status --porcelain)" ]; then
  echo "❌ 工作区有未提交的改动，请先 commit 后再发版"
  git status --short
  exit 1
fi

# ── 检查 tag 是否已存在 ───────────────────────────────────
if git rev-parse "$TAG" >/dev/null 2>&1; then
  echo "❌ Tag $TAG 已存在，请换一个版本号"
  exit 1
fi

# ── 更新 package.json 版本号 ─────────────────────────────
echo "📦 更新 package.json version → $VERSION"
# 用 node 避免 sed 跨平台差异
node -e "
  const fs = require('fs');
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  pkg.version = '$VERSION';
  fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
"

# ── 构建 ─────────────────────────────────────────────────
echo "🔨 构建..."
pnpm build

# ── 提交 & 打 Tag ─────────────────────────────────────────
git add package.json
git commit -m "chore: release $TAG"
git tag "$TAG"

echo "🚀 推送到远程..."
git push origin main
git push origin "$TAG"

echo ""
echo "✅ 发布完成！$TAG 已推送到远程"
echo ""
echo "其他项目安装命令："
echo "  pnpm add git+https://github.com/MengHuanLanYu/tauri-app-shell.git#$TAG"
