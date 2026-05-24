#!/usr/bin/env bash
# release.sh — 一键发布新版本（Git Tag + npm publish）
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
# package.json 版本号与当前一致时跳过 commit，直接打 tag
if git diff --cached --quiet; then
  echo "ℹ️  package.json 版本号无变化，跳过 commit，直接打 Tag"
else
  git commit -m "chore: release $TAG"
fi
git tag "$TAG"

echo "🚀 推送到远程..."
git push origin main
git push origin "$TAG"

# ── 发布到 npm ───────────────────────────────────────
echo ""
echo "⚠️  即将发布 tauri-app-shell@$VERSION 到 npm"
echo "   npm 版本一经发布不可覆盖，请确认版本号无误！"
echo ""
read -r -p "确认发布到 npm？(y/N) " confirm
if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
  echo "⏭️  跳过 npm 发布（Git Tag 已推送）"
  echo "   后续手动发布：npm publish --access public"
  exit 0
fi

echo "📦 发布到 npm..."
npm publish --access public

echo ""
echo "✅ 发布完成！$TAG 已推送到 Git 远程并发布到 npm"
echo ""
echo "其他项目安装命令："
echo "  pnpm add tauri-app-shell@$VERSION"
echo "  # 或"
echo "  npm install tauri-app-shell@$VERSION"
