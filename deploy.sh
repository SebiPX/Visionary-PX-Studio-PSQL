#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# deploy.sh — PX Studio + labs-api VPS Deployment Script
#
# Paths:
#   Frontend:  /opt/docker/px-studio-psql
#   Backend:   /opt/docker/labs-api
#
# Usage:
#   chmod +x deploy.sh        (first time only)
#   ./deploy.sh               (deploys both frontend + backend)
#   ./deploy.sh frontend      (only frontend)
#   ./deploy.sh api           (only labs-api backend)
# ─────────────────────────────────────────────────────────────────────────────

set -e  # Exit immediately on any error

# ── Config ────────────────────────────────────────────────────────────────────
REPO_URL="https://github.com/SebiPX/Visionary-PX-Studio-PSQL.git"
FRONTEND_DIR="/opt/docker/px-studio-psql"
API_DIR="/opt/docker/labs-api"
BRANCH="main"

# ── Colors ────────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

log()     { echo -e "${GREEN}[✓]${NC} $1"; }
warn()    { echo -e "${YELLOW}[!]${NC} $1"; }
error()   { echo -e "${RED}[✗]${NC} $1"; exit 1; }
header()  { echo -e "\n${YELLOW}══════════════════════════════════════${NC}"; echo -e "${YELLOW}  $1${NC}"; echo -e "${YELLOW}══════════════════════════════════════${NC}"; }

# ── Helper: pull latest code into a directory ─────────────────────────────────
pull_latest() {
  local dir=$1
  local name=$2

  if [ -d "$dir/.git" ]; then
    warn "$name: Git repo found — pulling latest from $BRANCH..."
    cd "$dir"
    git fetch origin
    git reset --hard origin/$BRANCH
    log "$name: Code updated."
  else
    warn "$name: No git repo found at $dir — cloning fresh..."
    # Backup existing .env if present
    if [ -f "$dir/.env" ]; then
      cp "$dir/.env" "/tmp/${name}.env.backup"
      warn "$name: Backed up existing .env to /tmp/${name}.env.backup"
    fi
    # Clone into temp dir, then copy contents
    rm -rf /tmp/px-studio-temp
    git clone --branch $BRANCH $REPO_URL /tmp/px-studio-temp
    rsync -a --exclude='.env' /tmp/px-studio-temp/ "$dir/"
    rm -rf /tmp/px-studio-temp
    # Restore .env backup
    if [ -f "/tmp/${name}.env.backup" ]; then
      cp "/tmp/${name}.env.backup" "$dir/.env"
      log "$name: Restored .env from backup."
    fi
    log "$name: Fresh clone complete."
  fi
}

# ── Deploy Frontend ───────────────────────────────────────────────────────────
deploy_frontend() {
  header "Deploying Frontend (px-studio-psql)"

  pull_latest "$FRONTEND_DIR" "frontend"
  cd "$FRONTEND_DIR"

  # Safety check: .env must exist
  if [ ! -f ".env" ]; then
    error "No .env found in $FRONTEND_DIR! Create it from .env.example first."
  fi

  log "Building Docker image..."
  docker compose build --no-cache

  log "Restarting container..."
  docker compose up -d

  log "Frontend deployed! Container: visionary-px-studio-app"
}

# ── Deploy API ────────────────────────────────────────────────────────────────
deploy_api() {
  header "Deploying Backend (labs-api)"

  # labs-api lives inside the repo as a subfolder.
  # We need to pull the full repo first, then use the subfolder.
  if [ -d "$API_DIR/.git" ]; then
    # API dir is its own repo checkout
    pull_latest "$API_DIR" "api"
  else
    # Pull main repo, copy labs-api subfolder
    warn "api: Pulling main repo to get latest labs-api subfolder..."
    rm -rf /tmp/px-studio-temp
    git clone --branch $BRANCH $REPO_URL /tmp/px-studio-temp

    # Backup .env
    if [ -f "$API_DIR/.env" ]; then
      cp "$API_DIR/.env" "/tmp/api.env.backup"
      warn "api: Backed up .env to /tmp/api.env.backup"
    fi

    # Sync only labs-api subfolder contents (exclude .env)
    rsync -a --exclude='.env' /tmp/px-studio-temp/labs-api/ "$API_DIR/"
    rm -rf /tmp/px-studio-temp

    # Restore .env
    if [ -f "/tmp/api.env.backup" ]; then
      cp "/tmp/api.env.backup" "$API_DIR/.env"
      log "api: Restored .env from backup."
    fi
    log "api: Code synced from repo subfolder."
  fi

  cd "$API_DIR"

  # Safety check: .env must exist
  if [ ! -f ".env" ]; then
    error "No .env found in $API_DIR! Create it from .env.example first."
  fi

  log "Building Docker image..."
  docker compose build --no-cache

  log "Restarting container..."
  docker compose up -d

  log "Backend deployed! Container: labs-api"
}

# ── Main ──────────────────────────────────────────────────────────────────────
TARGET="${1:-both}"

case "$TARGET" in
  frontend)
    deploy_frontend
    ;;
  api)
    deploy_api
    ;;
  both|"")
    deploy_api
    deploy_frontend
    ;;
  *)
    echo "Usage: ./deploy.sh [frontend|api|both]"
    exit 1
    ;;
esac

header "Deployment Complete"
echo ""
echo "  Frontend: https://px-studio.labs-schickeria.com"
echo "  API:      runs on internal port 4001 (behind Nginx Proxy Manager)"
echo ""
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "labs-api|visionary|NAMES"
echo ""
