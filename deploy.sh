#!/usr/bin/env bash
set -euo pipefail

COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env"
BACKUP_DIR="backups"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()   { echo -e "${GREEN}[deploy]${NC} $*"; }
warn()  { echo -e "${YELLOW}[warn]${NC} $*"; }
error() { echo -e "${RED}[error]${NC} $*" >&2; }

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

validate_env() {
  if [ ! -f "$ENV_FILE" ]; then
    error ".env file not found. Copy from template:"
    error "  cp .env.production.example .env"
    exit 1
  fi

  # shellcheck source=/dev/null
  source "$ENV_FILE"

  local failed=0

  if [ "${POSTGRES_PASSWORD:-}" = "CHANGE_ME" ] || [ -z "${POSTGRES_PASSWORD:-}" ]; then
    error "POSTGRES_PASSWORD is not set or still contains CHANGE_ME"
    failed=1
  fi

  if [ "${JWT_SECRET:-}" = "CHANGE_ME" ] || [ -z "${JWT_SECRET:-}" ]; then
    error "JWT_SECRET is not set or still contains CHANGE_ME"
    failed=1
  fi

  if [ -z "${DOMAIN:-}" ]; then
    error "DOMAIN is not set"
    failed=1
  fi

  if [ -z "${ACME_EMAIL:-}" ]; then
    error "ACME_EMAIL is not set"
    failed=1
  fi

  if [ "$failed" -eq 1 ]; then
    error "Fix the values in .env before deploying"
    exit 1
  fi

  log "Environment validated"
}

dc() {
  docker compose -f "$COMPOSE_FILE" "$@"
}

build_frontend() {
  log "Building frontend assets..."
  dc --profile build run --rm frontend-build
  log "Frontend build complete"
}

# ---------------------------------------------------------------------------
# Commands
# ---------------------------------------------------------------------------

cmd_setup() {
  log "Running first-time setup..."
  validate_env
  build_frontend
  log "Starting services..."
  dc up -d
  log "Setup complete! Services are starting."
  cmd_status
}

cmd_deploy() {
  local rebuild_api=false

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --build) rebuild_api=true; shift ;;
      *) error "Unknown option: $1"; exit 1 ;;
    esac
  done

  validate_env

  log "Pulling latest code..."
  git pull --ff-only

  build_frontend

  if [ "$rebuild_api" = true ]; then
    log "Rebuilding API image..."
    dc build api
  fi

  log "Restarting services..."
  dc up -d
  log "Deployment complete!"
  cmd_status
}

cmd_logs() {
  local service="${1:-}"
  if [ -n "$service" ]; then
    dc logs -f "$service"
  else
    dc logs -f
  fi
}

cmd_status() {
  echo ""
  log "Service status:"
  dc ps
  echo ""

  # shellcheck source=/dev/null
  source "$ENV_FILE"

  log "Health check:"
  if curl -sf "https://api.${DOMAIN}/health" > /dev/null 2>&1; then
    echo -e "  API: ${GREEN}healthy${NC}"
  else
    echo -e "  API: ${RED}unreachable${NC} (may still be starting)"
  fi
}

cmd_backup_db() {
  validate_env

  # shellcheck source=/dev/null
  source "$ENV_FILE"

  mkdir -p "$BACKUP_DIR"

  local timestamp
  timestamp=$(date +%Y%m%d_%H%M%S)
  local backup_file="${BACKUP_DIR}/${POSTGRES_DB}_${timestamp}.sql.gz"

  log "Backing up database to ${backup_file}..."
  dc exec -T postgres pg_dump -U "${POSTGRES_USER}" "${POSTGRES_DB}" | gzip > "$backup_file"
  log "Backup complete: ${backup_file} ($(du -h "$backup_file" | cut -f1))"
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

usage() {
  echo "Usage: $0 <command> [options]"
  echo ""
  echo "Commands:"
  echo "  setup              First-time deployment (validate, build, start)"
  echo "  deploy [--build]   Update deployment (pull, rebuild frontend, restart)"
  echo "                     --build  also rebuild the API Docker image"
  echo "  logs [service]     Tail logs (all services or a specific one)"
  echo "  status             Show service status and health check"
  echo "  backup-db          Create compressed database backup"
}

case "${1:-}" in
  setup)     shift; cmd_setup "$@" ;;
  deploy)    shift; cmd_deploy "$@" ;;
  logs)      shift; cmd_logs "$@" ;;
  status)    shift; cmd_status "$@" ;;
  backup-db) shift; cmd_backup_db "$@" ;;
  *)         usage; exit 1 ;;
esac
