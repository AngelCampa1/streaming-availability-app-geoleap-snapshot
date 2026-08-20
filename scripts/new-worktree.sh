#!/usr/bin/env bash
set -euo pipefail

# ============================================================================
# GeoLeap — Worktree Setup
# Creates an isolated git worktree with all dependencies installed.
# Usage: ./scripts/new-worktree.sh <branch-name>
# Example: ./scripts/new-worktree.sh feat/auth-jwt
# ============================================================================

REPO_ROOT=$(git rev-parse --show-toplevel)

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

fail() { echo -e "${RED}ERROR:${NC} $1"; exit 1; }
info() { echo -e "${YELLOW}>>>${NC} $1"; }
ok()   { echo -e "${GREEN}OK:${NC} $1"; }

# ── Validate argument ────────────────────────────────────────────────────────

if [ $# -ne 1 ]; then
    echo "Usage: $0 <branch-name>"
    echo "Example: $0 feat/auth-jwt"
    exit 1
fi

BRANCH="$1"

git check-ref-format --branch "$BRANCH" \
    || fail "Invalid branch name: '$BRANCH'"

# Slashes in branch names map to subdirectories — flatten to avoid debris.
BRANCH_SLUG="${BRANCH//\//-}"
WORKTREE_PATH="$REPO_ROOT/.worktrees/$BRANCH_SLUG"

if [ -d "$WORKTREE_PATH" ]; then
    fail "Worktree already exists at .worktrees/$BRANCH_SLUG. Remove it first with: git worktree remove .worktrees/$BRANCH_SLUG"
fi

# ── Create worktree ──────────────────────────────────────────────────────────

info "Creating worktree at .worktrees/$BRANCH_SLUG..."
if git show-ref --verify --quiet "refs/heads/$BRANCH"; then
    git worktree add "$WORKTREE_PATH" "$BRANCH"
else
    git worktree add "$WORKTREE_PATH" -b "$BRANCH"
fi
ok "Worktree created"

# ── Copy .env files ──────────────────────────────────────────────────────────

info "Copying .env files..."
copied=0
for env_file in "$REPO_ROOT"/.env*; do
    [ -f "$env_file" ] || continue
    filename=$(basename "$env_file")
    cp "$env_file" "$WORKTREE_PATH/$filename"
    ok "Copied $filename"
    copied=$((copied + 1))
done
[ "$copied" -eq 0 ] && info "No .env files found at repo root — skipping"

# Copy frontend .env files
for env_file in "$REPO_ROOT/frontend"/.env*; do
    [ -f "$env_file" ] || continue
    filename=$(basename "$env_file")
    cp "$env_file" "$WORKTREE_PATH/frontend/$filename"
    ok "Copied frontend/$filename"
done

# Copy mobile .env files
for env_file in "$REPO_ROOT/mobile"/.env*; do
    [ -f "$env_file" ] || continue
    filename=$(basename "$env_file")
    cp "$env_file" "$WORKTREE_PATH/mobile/$filename"
    ok "Copied mobile/$filename"
done

# ── Backend deps (.NET restore) ──────────────────────────────────────────────

info "Restoring backend dependencies (dotnet restore)..."
command -v dotnet >/dev/null 2>&1 || fail "dotnet CLI not found in PATH. Install .NET 9 SDK."
(cd "$WORKTREE_PATH/backend" && dotnet restore --verbosity quiet)
ok "Backend dependencies restored"

# ── Frontend deps ────────────────────────────────────────────────────────────

info "Installing frontend dependencies (this may take a minute)..."
(cd "$WORKTREE_PATH/frontend" && npm install --quiet)

if [ ! -d "$WORKTREE_PATH/frontend/node_modules/.bin" ]; then
    fail "Frontend npm install succeeded but node_modules/.bin missing. Try: cd $WORKTREE_PATH/frontend && npm install"
fi
ok "Frontend dependencies installed"

# ── Mobile deps ───────────────────────────────────────────────────────────────

info "Installing mobile dependencies (this may take a minute)..."
(cd "$WORKTREE_PATH/mobile" && npm install --quiet)

if [ ! -d "$WORKTREE_PATH/mobile/node_modules/.bin" ]; then
    fail "Mobile npm install succeeded but node_modules/.bin missing. Try: cd $WORKTREE_PATH/mobile && npm install"
fi
ok "Mobile dependencies installed"

# ── Configure hooks ──────────────────────────────────────────────────────────

info "Configuring git hooks..."
(cd "$WORKTREE_PATH" && git config core.hooksPath .githooks)
ok "Hooks configured (.githooks/pre-commit)"

# ── Summary ──────────────────────────────────────────────────────────────────

echo ""
echo -e "${GREEN}Worktree ready!${NC} Branch: ${YELLOW}$BRANCH${NC}"
echo ""
echo "  cd $WORKTREE_PATH"
echo ""
echo "Services (same ports as main):"
echo "  Backend:  http://localhost:8020"
echo "  Frontend: http://localhost:3020"
echo "  Mobile:   http://localhost:5070"
echo ""
