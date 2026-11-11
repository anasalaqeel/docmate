#!/bin/bash
set -e

# Docmate Release Script
# Usage: ./scripts/release.sh [version] (e.g., ./scripts/release.sh 1.0.0 or ./scripts/release.sh v1.0.0)

VERSION="$1"

if [ -z "$VERSION" ]; then
  echo "Error: Version argument is required."
  echo "Usage: ./scripts/release.sh 1.0.0"
  exit 1
fi

# Normalize tag to have 'v' prefix, and version without 'v' prefix
if [[ "$VERSION" =~ ^v ]]; then
  TAG="$VERSION"
  SEMVER="${VERSION#v}"
else
  TAG="v$VERSION"
  SEMVER="$VERSION"
fi

# Ensure git status is clean
if [ -n "$(git status --porcelain)" ]; then
  echo "Error: Working directory has uncommitted changes. Please commit or stash them first."
  exit 1
fi

echo "Preparing release $TAG (SemVer: $SEMVER)..."

# Run tests & linting locally first
echo "Running quality checks..."
bun run lint
bun run test

# Update version in package.json files
echo "Updating versions in package files..."
bun -e "
const fs = require('fs');
['package.json', 'backend/package.json', 'frontend/package.json'].forEach(p => {
  if (fs.existsSync(p)) {
    const pkg = JSON.parse(fs.readFileSync(p, 'utf8'));
    pkg.version = '$SEMVER';
    fs.writeFileSync(p, JSON.stringify(pkg, null, 2) + '\n');
    console.log('Updated ' + p + ' to ' + '$SEMVER');
  }
});
"

# Commit and tag
git add package.json backend/package.json frontend/package.json
git commit -m "chore(release): $TAG"
git tag -a "$TAG" -m "Release $TAG"

echo "Release $TAG created locally."
echo ""
echo "To publish the release and trigger GitHub Actions (CI/CD + GHCR Docker publishing):"
echo "  git push origin main --tags"
