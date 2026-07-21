#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="${PROJECT_ROOT:-$(cd "$SCRIPT_DIR/.." && pwd)}"
cd "$PROJECT_ROOT"

# Keep the default isolated from the legacy BinnAgent repository.
COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-binnagentx}"
LOG_DIR="${LOG_DIR:-$PROJECT_ROOT/logs}"
DEPLOY_STATE_DIR="${DEPLOY_STATE_DIR:-$PROJECT_ROOT/logs}"
DB_WAIT_SECONDS="${DB_WAIT_SECONDS:-60}"
SERVICE_WAIT_SECONDS="${SERVICE_WAIT_SECONDS:-45}"
MONITOR_INTERVAL="${MONITOR_INTERVAL:-2}"
SHUTDOWN_TIMEOUT="${SHUTDOWN_TIMEOUT:-8}"
SKIP_MIGRATE="${SKIP_MIGRATE:-0}"
SKIP_COMPOSE="${SKIP_COMPOSE:-0}"
VERBOSE="${VERBOSE:-0}"
LEARNER_API_BASE_URL="${NEXT_PUBLIC_LEARNER_API_BASE_URL:-http://127.0.0.1:8000/learner}"
CONTROL_API_BASE_URL="${NEXT_PUBLIC_CONTROL_API_BASE_URL:-http://127.0.0.1:8000/control}"

RUN_API=1
RUN_WORKER=1
RUN_LEARNER=1
RUN_CONTROL=1
MONITOR_WORKER=0
CLEAN_OLD_INSTANCES=1
RUN_CONTAINER_STACK=1
REBUILD_IMAGES=1
ACTIVE_COMMAND_PID=""

declare -a COMPOSE_FILES=()
declare -a SERVICE_NAMES=()
declare -a SERVICE_PIDS=()
declare -a SERVICE_LOGS=()
declare -a PNPM_CMD=()

COMPOSE_STARTED_BY_SCRIPT=0
CLEANUP_DONE=0
INSTANCE_STATE_FILE=""
IMAGE_FINGERPRINT_FILE=""

show_help() {
  cat <<'EOF'
用法:
  bash scripts/deploy.sh [选项]

默认构建并后台启动 PostgreSQL、迁移、常驻 Worker、资产导出器、API、学习端和控制舱容器。
控制台只显示关键状态；完整构建输出写入 ./logs。

选项:
  --project-name <name>     Compose 项目名（默认: binnagentx）
  --compose <file[:file]>   指定 Compose 文件列表
  --host-services           API 和前端改在宿主机运行，Compose 只启动数据库
  --skip-compose            使用已有数据库，不操作 Docker Compose
  --skip-migrate            跳过 Alembic 迁移
  --no-api                  不启动 API
  --no-worker               不启动内容生成 Worker及资产导出器
  --learner                 启动 Learner 前端（默认开启）
  --control                 启动 Control 前端（默认开启）
  --no-learner              不启动 Learner 前端
  --no-control              不启动 Control 前端
  --monitor-worker          兼容旧参数；Worker 现已默认常驻
  --no-cleanup              不清理当前项目上次遗留的服务实例
  --restart                 代码未变时快速重启；检测到变更会自动重新构建
  --log-dir <dir>           日志目录（默认: ./logs）
  --verbose                 在控制台同步显示 Compose/迁移输出
  --help                    打印帮助

常用:
  bash scripts/deploy.sh
  bash scripts/deploy.sh --restart
  bash scripts/deploy.sh --no-control
  bash scripts/deploy.sh --host-services
  bash scripts/deploy.sh --host-services --skip-compose --skip-migrate --no-api --no-worker
EOF
}

info() {
  printf '• %s\n' "$*"
}

success() {
  printf '✓ %s\n' "$*"
}

warn() {
  printf '! %s\n' "$*" >&2
}

die() {
  printf '错误：%s\n' "$*" >&2
  exit 1
}

require_option_value() {
  local option="$1"
  local count="$2"
  local value="${3:-}"
  if (( count < 2 )) || [[ -z "$value" || "$value" == --* ]]; then
    die "${option} 需要一个值"
  fi
}

require_cmd() {
  local command_name="$1"
  local guidance="$2"
  if ! command -v "$command_name" >/dev/null 2>&1; then
    die "未检测到 ${command_name}。${guidance}"
  fi
}

resolve_pnpm() {
  if command -v pnpm >/dev/null 2>&1; then
    PNPM_CMD=(pnpm)
    return
  fi
  if command -v corepack >/dev/null 2>&1; then
    PNPM_CMD=(corepack pnpm)
    info "未找到全局 pnpm，使用 Corepack 提供 pnpm 11.9.0"
    return
  fi
  if command -v npm >/dev/null 2>&1; then
    PNPM_CMD=(npm exec --yes pnpm@11.9.0 --)
    info "未找到全局 pnpm，使用 npm 加载 pnpm 11.9.0"
    return
  fi
  die "未检测到 pnpm、Corepack 或 npm。请安装 Node.js 24.14.0。"
}

validate_positive_integer() {
  local name="$1"
  local value="$2"
  case "$value" in
    '' | *[!0-9]*) die "${name} 必须是正整数" ;;
  esac
  (( value > 0 )) || die "${name} 必须大于 0"
}

absolute_log_dir() {
  case "$LOG_DIR" in
    /*) ;;
    *) LOG_DIR="$PROJECT_ROOT/$LOG_DIR" ;;
  esac
}

add_compose_file() {
  local compose_file="$1"
  local required="${2:-0}"
  local resolved="$compose_file"
  local existing

  [[ -z "$resolved" ]] && return
  resolved="${resolved#./}"
  if [[ ! -f "$resolved" && -f "$PROJECT_ROOT/$resolved" ]]; then
    resolved="$PROJECT_ROOT/$resolved"
  fi
  if [[ ! -f "$resolved" ]]; then
    if [[ "$required" == "1" ]]; then
      die "Compose 文件不存在: $compose_file"
    fi
    return
  fi

  for existing in "${COMPOSE_FILES[@]-}"; do
    [[ "$existing" == "$resolved" ]] && return
  done
  COMPOSE_FILES+=("$resolved")
}

collect_compose_files_from_value() {
  local value="$1"
  local required="${2:-0}"
  local -a files=()
  local compose_file
  [[ -z "$value" ]] && return
  IFS=':' read -r -a files <<< "$value"
  for compose_file in "${files[@]}"; do
    add_compose_file "$compose_file" "$required"
  done
}

collect_default_compose_files() {
  local base
  local override
  for base in compose.yaml compose.yml docker-compose.yaml docker-compose.yml; do
    if [[ -f "$PROJECT_ROOT/$base" ]]; then
      add_compose_file "$PROJECT_ROOT/$base"
      break
    fi
  done
  for override in \
    docker-compose.dev.yaml docker-compose.dev.yml \
    docker-compose.local.yaml docker-compose.local.yml; do
    add_compose_file "$PROJECT_ROOT/$override"
  done
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --project-name)
      require_option_value "$1" "$#" "${2:-}"
      COMPOSE_PROJECT_NAME="$2"
      shift 2
      ;;
    --compose)
      require_option_value "$1" "$#" "${2:-}"
      collect_compose_files_from_value "$2" 1
      shift 2
      ;;
    --skip-compose)
      SKIP_COMPOSE=1
      RUN_CONTAINER_STACK=0
      shift
      ;;
    --host-services)
      RUN_CONTAINER_STACK=0
      shift
      ;;
    --skip-migrate)
      SKIP_MIGRATE=1
      shift
      ;;
    --no-api)
      RUN_API=0
      shift
      ;;
    --no-worker)
      RUN_WORKER=0
      shift
      ;;
    --learner)
      RUN_LEARNER=1
      shift
      ;;
    --control)
      RUN_CONTROL=1
      shift
      ;;
    --no-learner)
      RUN_LEARNER=0
      shift
      ;;
    --no-control)
      RUN_CONTROL=0
      shift
      ;;
    --monitor-worker)
      MONITOR_WORKER=1
      shift
      ;;
    --no-cleanup)
      CLEAN_OLD_INSTANCES=0
      shift
      ;;
    --restart)
      REBUILD_IMAGES=0
      shift
      ;;
    --log-dir)
      require_option_value "$1" "$#" "${2:-}"
      LOG_DIR="$2"
      shift 2
      ;;
    --verbose)
      VERBOSE=1
      shift
      ;;
    --help)
      show_help
      exit 0
      ;;
    *)
      printf '未知参数: %s\n\n' "$1" >&2
      show_help >&2
      exit 2
      ;;
  esac
done

if (( RUN_API == 0 && RUN_WORKER == 0 && RUN_LEARNER == 0 && RUN_CONTROL == 0 )); then
  die "未选择任何服务"
fi

validate_positive_integer "DB_WAIT_SECONDS" "$DB_WAIT_SECONDS"
validate_positive_integer "SERVICE_WAIT_SECONDS" "$SERVICE_WAIT_SECONDS"
validate_positive_integer "MONITOR_INTERVAL" "$MONITOR_INTERVAL"
validate_positive_integer "SHUTDOWN_TIMEOUT" "$SHUTDOWN_TIMEOUT"
absolute_log_dir
case "$DEPLOY_STATE_DIR" in
  /*) ;;
  *) DEPLOY_STATE_DIR="$PROJECT_ROOT/$DEPLOY_STATE_DIR" ;;
esac
INSTANCE_STATE_FILE="$DEPLOY_STATE_DIR/deploy.state"
IMAGE_FINGERPRINT_FILE="$DEPLOY_STATE_DIR/deploy.image-fingerprint"
mkdir -p "$LOG_DIR" "$DEPLOY_STATE_DIR"
: > "$LOG_DIR/bootstrap.log"

NEED_DATABASE=0
if (( RUN_API == 1 || RUN_WORKER == 1 )); then
  NEED_DATABASE=1
fi

if (( (NEED_DATABASE == 1 && SKIP_COMPOSE == 0) || RUN_CONTAINER_STACK == 1 )); then
  require_cmd docker "请安装 Docker，或使用 --skip-compose 连接已有数据库。"
  if ! docker compose version >/dev/null 2>&1; then
    die "Docker Compose 不可用"
  fi
fi
if (( RUN_CONTAINER_STACK == 0 && (RUN_API == 1 || RUN_WORKER == 1) )); then
  require_cmd uv "请安装 uv 并执行 uv sync。"
fi
if (( RUN_CONTAINER_STACK == 0 && (RUN_LEARNER == 1 || RUN_CONTROL == 1) )); then
  resolve_pnpm
fi
if (( RUN_API == 1 || RUN_LEARNER == 1 || RUN_CONTROL == 1 )); then
  require_cmd curl "服务就绪检查需要 curl。"
fi

# uv should consistently use this repository's environment, regardless of the caller's shell.
unset VIRTUAL_ENV || true
export UV_PROJECT_ENVIRONMENT="$PROJECT_ROOT/.venv"
export PYTHONUNBUFFERED=1
export PYTHONPATH="$PROJECT_ROOT${PYTHONPATH:+:$PYTHONPATH}"

if (( (NEED_DATABASE == 1 && SKIP_COMPOSE == 0) || RUN_CONTAINER_STACK == 1 )); then
  if (( ${#COMPOSE_FILES[@]} == 0 )); then
    collect_compose_files_from_value "${COMPOSE_FILE:-}"
    collect_compose_files_from_value "${COMPOSE_FILES_ENV:-}"
  fi
  if (( ${#COMPOSE_FILES[@]} == 0 )); then
    collect_default_compose_files
  fi
  (( ${#COMPOSE_FILES[@]} > 0 )) || die "未找到 Compose 文件"
fi

compose_cmd=(docker compose)
if (( ${#COMPOSE_FILES[@]} > 0 )); then
  for compose_file in "${COMPOSE_FILES[@]}"; do
    compose_cmd+=(-f "$compose_file")
  done
fi
compose_cmd+=(-p "$COMPOSE_PROJECT_NAME")

run_logged() {
  local logfile="$1"
  shift
  if (( VERBOSE == 1 )); then
    set +e
    "$@" 2>&1 | tee -a "$logfile"
    local status=${PIPESTATUS[0]}
    set -e
    return "$status"
  fi
  "$@" >> "$logfile" 2>&1
}

run_logged_with_heartbeat() {
  local logfile="$1"
  local label="$2"
  shift 2
  if (( VERBOSE == 1 )); then
    run_logged "$logfile" "$@"
    return
  fi

  "$@" >> "$logfile" 2>&1 &
  ACTIVE_COMMAND_PID="$!"
  local elapsed=0
  local status=0
  while background_command_is_running "$ACTIVE_COMMAND_PID"; do
    sleep 2
    elapsed=$((elapsed + 2))
    if (( elapsed % 10 == 0 )); then
      info "${label}（已等待 ${elapsed}s；详细日志: ${logfile}）"
    fi
  done
  wait "$ACTIVE_COMMAND_PID" || status=$?
  ACTIVE_COMMAND_PID=""
  return "$status"
}

background_command_is_running() {
  local pid="$1"
  local process_state=""
  kill -0 "$pid" >/dev/null 2>&1 || return 1
  process_state="$(ps -p "$pid" -o stat= 2>/dev/null | tr -d '[:space:]')"
  [[ -n "$process_state" && "$process_state" != Z* ]]
}

runtime_source_fingerprint() {
  command -v git >/dev/null 2>&1 || return 1
  git rev-parse --is-inside-work-tree >/dev/null 2>&1 || return 1

  local files
  files="$(
    git ls-files -co --exclude-standard -- \
      .dockerignore Dockerfile Dockerfile.frontend compose.yaml \
      pyproject.toml uv.lock package.json pnpm-lock.yaml pnpm-workspace.yaml \
      apps packages python services contracts fixtures \
      | LC_ALL=C sort
  )"
  [[ -n "$files" ]] || return 1
  while IFS= read -r file; do
    [[ -f "$file" ]] || continue
    printf '%s %s\n' "$file" "$(git hash-object "$file")"
  done <<< "$files" | git hash-object --stdin
}

ensure_restart_matches_sources() {
  if (( REBUILD_IMAGES == 1 )); then
    return 0
  fi
  local current_fingerprint=""
  local built_fingerprint=""
  if [[ -f "$IMAGE_FINGERPRINT_FILE" ]]; then
    built_fingerprint="$(tr -d '[:space:]' < "$IMAGE_FINGERPRINT_FILE")"
  fi
  if ! current_fingerprint="$(runtime_source_fingerprint)"; then
    warn "无法计算运行代码指纹；为避免启动旧代码，将重新构建镜像"
    REBUILD_IMAGES=1
    return
  fi
  if [[ -z "$built_fingerprint" || "$current_fingerprint" != "$built_fingerprint" ]]; then
    warn "检测到运行代码自上次构建后有变化；--restart 自动升级为构建并重启"
    REBUILD_IMAGES=1
    return
  fi
  info "运行代码未变化，跳过镜像构建"
}

record_built_source_fingerprint() {
  if (( REBUILD_IMAGES == 0 )); then
    return 0
  fi
  local fingerprint=""
  if fingerprint="$(runtime_source_fingerprint)"; then
    printf '%s\n' "$fingerprint" > "$IMAGE_FINGERPRINT_FILE"
  fi
}

show_log_tail() {
  local logfile="$1"
  local line_count="${2:-20}"
  if [[ -s "$logfile" ]]; then
    printf '\n最近日志（%s）：\n' "$logfile" >&2
    tail -n "$line_count" "$logfile" >&2
  fi
}

compose_is_running() {
  "${compose_cmd[@]}" ps --status running --services 2>/dev/null | grep -qx postgres
}

start_database() {
  if compose_is_running; then
    success "PostgreSQL 已在运行"
    return
  fi
  info "启动 PostgreSQL"
  if ! run_logged "$LOG_DIR/bootstrap.log" "${compose_cmd[@]}" up -d postgres; then
    show_log_tail "$LOG_DIR/bootstrap.log"
    die "PostgreSQL 启动失败"
  fi
  COMPOSE_STARTED_BY_SCRIPT=1
}

database_ready() {
  if (( SKIP_COMPOSE == 0 )); then
    "${compose_cmd[@]}" exec -T postgres sh -c \
      'pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"' >/dev/null 2>&1
    return
  fi
  if command -v pg_isready >/dev/null 2>&1; then
    pg_isready -h "${DB_HOST:-127.0.0.1}" -p "${DB_PORT:-5432}" >/dev/null 2>&1
    return
  fi
  if command -v nc >/dev/null 2>&1; then
    nc -z "${DB_HOST:-127.0.0.1}" "${DB_PORT:-5432}" >/dev/null 2>&1
    return
  fi
  return 1
}

wait_for_database() {
  local elapsed=0
  while (( elapsed < DB_WAIT_SECONDS )); do
    if database_ready; then
      success "PostgreSQL 就绪"
      return
    fi
    sleep 1
    elapsed=$((elapsed + 1))
  done
  show_log_tail "$LOG_DIR/bootstrap.log"
  die "PostgreSQL 在 ${DB_WAIT_SECONDS}s 内未就绪"
}

run_migrations() {
  local logfile="$LOG_DIR/migration.log"
  : > "$logfile"
  info "检查数据库迁移"
  if ! run_logged "$logfile" uv run python -m alembic -c services/api/alembic.ini upgrade head; then
    show_log_tail "$logfile" 30
    die "数据库迁移失败"
  fi
  success "数据库迁移完成"
}

start_worker_service() {
  local logfile="$LOG_DIR/worker.log"
  info "启动内容生成 Worker"
  register_service "Worker" "$logfile" uv run binnagent-worker
  local index=$((${#SERVICE_PIDS[@]} - 1))
  success "内容生成 Worker 已启动"
  sleep 0.2
  if ! kill -0 "${SERVICE_PIDS[$index]}" >/dev/null 2>&1; then
    show_log_tail "$logfile"
    die "内容生成 Worker 启动失败"
  fi
}

start_asset_exporter_service() {
  local logfile="$LOG_DIR/asset-exporter.log"
  info "启动 Obsidian 资产导出器"
  register_service "AssetExporter" "$logfile" uv run binnagent-asset-exporter
  local index=$((${#SERVICE_PIDS[@]} - 1))
  success "Obsidian 资产导出器已启动"
  sleep 0.2
  if ! kill -0 "${SERVICE_PIDS[$index]}" >/dev/null 2>&1; then
    show_log_tail "$logfile"
    die "Obsidian 资产导出器启动失败"
  fi
}

port_is_listening() {
  local port="$1"
  if command -v lsof >/dev/null 2>&1; then
    lsof -nP -iTCP:"$port" -sTCP:LISTEN -t >/dev/null 2>&1
    return
  fi
  if command -v nc >/dev/null 2>&1; then
    nc -z 127.0.0.1 "$port" >/dev/null 2>&1
    return
  fi
  return 1
}

ensure_port_available() {
  local name="$1"
  local port="$2"
  if port_is_listening "$port"; then
    die "${name} 端口 ${port} 已被占用；请先停止旧进程"
  fi
}

register_service() {
  local name="$1"
  local logfile="$2"
  shift 2
  : > "$logfile"
  "$@" >> "$logfile" 2>&1 &
  SERVICE_NAMES+=("$name")
  SERVICE_PIDS+=("$!")
  SERVICE_LOGS+=("$logfile")
  write_instance_state
}

wait_for_http_service() {
  local name="$1"
  local url="$2"
  local pid="$3"
  local logfile="$4"
  local elapsed=0

  while (( elapsed < SERVICE_WAIT_SECONDS )); do
    if curl --silent --fail --max-time 1 "$url" >/dev/null 2>&1; then
      success "${name} 就绪"
      return
    fi
    if ! kill -0 "$pid" >/dev/null 2>&1; then
      local exit_code=1
      if wait "$pid"; then
        exit_code=0
      else
        exit_code=$?
      fi
      show_log_tail "$logfile" 30
      die "${name} 启动时退出（code=${exit_code}）"
    fi
    sleep 1
    elapsed=$((elapsed + 1))
  done
  show_log_tail "$logfile" 30
  die "${name} 在 ${SERVICE_WAIT_SECONDS}s 内未就绪"
}

wait_for_container_url() {
  local name="$1"
  local url="$2"
  local elapsed=0
  while (( elapsed < SERVICE_WAIT_SECONDS )); do
    if curl --silent --fail --max-time 2 "$url" >/dev/null 2>&1; then
      success "${name} 就绪"
      return
    fi
    sleep 1
    elapsed=$((elapsed + 1))
  done
  "${compose_cmd[@]}" ps >&2 || true
  "${compose_cmd[@]}" logs --tail 30 app learner control >&2 || true
  die "${name} 在 ${SERVICE_WAIT_SECONDS}s 内未就绪"
}

wait_for_content_worker() {
  local elapsed=0
  local payload=""
  while (( elapsed < SERVICE_WAIT_SECONDS )); do
    payload="$(curl --silent --fail --max-time 2 \
      "http://127.0.0.1:3001/api/control/v1/content-generation/status" 2>/dev/null || true)"
    if WORKER_STATUS_PAYLOAD="$payload" python3 - <<'PY' >/dev/null 2>&1
import json
import os

payload = json.loads(os.environ.get("WORKER_STATUS_PAYLOAD", "{}"))
raise SystemExit(0 if bool(payload.get("worker", {}).get("online")) else 1)
PY
    then
      success "内容生成 Worker 已就绪"
      return
    fi
    sleep 1
    elapsed=$((elapsed + 1))
  done
  "${compose_cmd[@]}" ps >&2 || true
  "${compose_cmd[@]}" logs --tail 50 worker >&2 || true
  die "内容生成 Worker 在 ${SERVICE_WAIT_SECONDS}s 内未就绪"
}

start_http_service() {
  local name="$1"
  local port="$2"
  local url="$3"
  local logfile="$4"
  shift 4

  ensure_port_available "$name" "$port"
  info "启动 ${name}"
  register_service "$name" "$logfile" "$@"
  local index=$((${#SERVICE_PIDS[@]} - 1))
  wait_for_http_service "$name" "$url" "${SERVICE_PIDS[$index]}" "$logfile"
}

descendant_pids() {
  local parent_pid="$1"
  local child_pid
  local children=""
  command -v pgrep >/dev/null 2>&1 || return
  children="$(pgrep -P "$parent_pid" 2>/dev/null || true)"
  for child_pid in $children; do
    descendant_pids "$child_pid"
    printf '%s\n' "$child_pid"
  done
}

terminate_process_tree() {
  local root_pid="$1"
  local descendants=""
  local target_pid
  local elapsed=0
  local alive=0

  kill -0 "$root_pid" >/dev/null 2>&1 || return 0
  descendants="$(descendant_pids "$root_pid")"
  kill -TERM "$root_pid" >/dev/null 2>&1 || true
  for target_pid in $descendants; do
    kill -TERM "$target_pid" >/dev/null 2>&1 || true
  done

  while (( elapsed < SHUTDOWN_TIMEOUT )); do
    alive=0
    if kill -0 "$root_pid" >/dev/null 2>&1; then
      alive=1
    fi
    for target_pid in $descendants; do
      if kill -0 "$target_pid" >/dev/null 2>&1; then
        alive=1
      fi
    done
    (( alive == 0 )) && break
    sleep 1
    elapsed=$((elapsed + 1))
  done

  if (( alive == 1 )); then
    kill -KILL "$root_pid" >/dev/null 2>&1 || true
    for target_pid in $descendants; do
      kill -KILL "$target_pid" >/dev/null 2>&1 || true
    done
  fi
  wait "$root_pid" 2>/dev/null || true
}

process_command() {
  ps -p "$1" -o command= 2>/dev/null | sed -e 's/^[[:space:]]*//' || true
}

process_working_directory() {
  command -v lsof >/dev/null 2>&1 || return 0
  lsof -a -p "$1" -d cwd -Fn 2>/dev/null | sed -n 's/^n//p' | head -n 1 || true
}

process_belongs_to_project() {
  local pid="$1"
  local command_line=""
  local working_directory=""
  kill -0 "$pid" >/dev/null 2>&1 || return 1
  command_line="$(process_command "$pid")"
  working_directory="$(process_working_directory "$pid")"
  [[ "$command_line" == *"$PROJECT_ROOT/"* ]] && return 0
  [[ "$working_directory" == "$PROJECT_ROOT" || "$working_directory" == "$PROJECT_ROOT/"* ]]
}

process_is_current_deploy() {
  local pid="$1"
  local recorded_root="${2:-$PROJECT_ROOT}"
  local command_line=""
  [[ "$recorded_root" == "$PROJECT_ROOT" ]] || return 1
  process_belongs_to_project "$pid" || return 1
  command_line="$(process_command "$pid")"
  [[ "$command_line" == *"deploy.sh"* ]]
}

recorded_service_is_safe_to_stop() {
  local pid="$1"
  local name="$2"
  local command_line=""
  process_belongs_to_project "$pid" || return 1
  command_line="$(process_command "$pid")"
  case "$name" in
    API) [[ "$command_line" == *"binnagent-api"* ]] ;;
    Learner) [[ "$command_line" == *"dev:learner"* || "$command_line" == *"learner-web"* ]] ;;
    Control) [[ "$command_line" == *"dev:control"* || "$command_line" == *"control-cockpit"* ]] ;;
    Worker) [[ "$command_line" == *"binnagent-worker"* ]] ;;
    AssetExporter) [[ "$command_line" == *"binnagent-asset-exporter"* ]] ;;
    *) return 1 ;;
  esac
}

write_instance_state() {
  local temporary_file="${INSTANCE_STATE_FILE}.$$"
  local index
  [[ -n "$INSTANCE_STATE_FILE" ]] || return 0
  {
    printf 'root\t%s\t%s\n' "$$" "$PROJECT_ROOT"
    for index in "${!SERVICE_PIDS[@]}"; do
      printf 'service\t%s\t%s\n' "${SERVICE_PIDS[$index]}" "${SERVICE_NAMES[$index]}"
    done
  } > "$temporary_file"
  mv "$temporary_file" "$INSTANCE_STATE_FILE"
}

release_instance_state() {
  local record_type=""
  local recorded_pid=""
  local recorded_value=""
  [[ -f "$INSTANCE_STATE_FILE" ]] || return 0
  IFS=$'\t' read -r record_type recorded_pid recorded_value < "$INSTANCE_STATE_FILE" || true
  if [[ "$record_type" == "root" && "$recorded_pid" == "$$" ]]; then
    rm -f "$INSTANCE_STATE_FILE"
  fi
}

cleanup_recorded_instance() {
  local record_type=""
  local recorded_pid=""
  local recorded_value=""
  local old_root_pid=""
  local old_project_root=""
  local cleaned=0
  local -a old_service_pids=()
  local -a old_service_names=()
  local index

  [[ -f "$INSTANCE_STATE_FILE" ]] || return 0
  while IFS=$'\t' read -r record_type recorded_pid recorded_value; do
    case "$record_type" in
      root)
        old_root_pid="$recorded_pid"
        old_project_root="$recorded_value"
        ;;
      service)
        old_service_pids+=("$recorded_pid")
        old_service_names+=("$recorded_value")
        ;;
    esac
  done < "$INSTANCE_STATE_FILE"

  if [[ "$old_root_pid" =~ ^[0-9]+$ ]] && [[ "$old_root_pid" != "$$" ]] \
    && process_is_current_deploy "$old_root_pid" "$old_project_root"; then
    info "清理上次运行的服务"
    terminate_process_tree "$old_root_pid"
    cleaned=1
  else
    for index in "${!old_service_pids[@]}"; do
      recorded_pid="${old_service_pids[$index]}"
      recorded_value="${old_service_names[$index]}"
      [[ "$recorded_pid" =~ ^[0-9]+$ ]] || continue
      if recorded_service_is_safe_to_stop "$recorded_pid" "$recorded_value"; then
        (( cleaned == 1 )) || info "清理上次运行的服务"
        terminate_process_tree "$recorded_pid"
        cleaned=1
      fi
    done
  fi
  rm -f "$INSTANCE_STATE_FILE"
  (( cleaned == 0 )) || success "旧实例已清理"
}

find_project_instance_root() {
  local current_pid="$1"
  local parent_pid=""
  local candidate=""
  while [[ "$current_pid" =~ ^[0-9]+$ ]] && (( current_pid > 1 )); do
    if process_is_current_deploy "$current_pid"; then
      printf '%s\n' "$current_pid"
      return
    fi
    if process_belongs_to_project "$current_pid"; then
      candidate="$current_pid"
    fi
    parent_pid="$(ps -p "$current_pid" -o ppid= 2>/dev/null | tr -d '[:space:]')"
    [[ -n "$parent_pid" && "$parent_pid" != "$current_pid" ]] || break
    current_pid="$parent_pid"
  done
  [[ -z "$candidate" ]] || printf '%s\n' "$candidate"
}

cleanup_legacy_instances() {
  local port
  local listener_pid
  local root_pid
  local cleaned=0
  local seen_roots=" "
  local -a ports=()
  command -v lsof >/dev/null 2>&1 || return 0
  (( RUN_API == 0 )) || ports+=(8000)
  (( RUN_LEARNER == 0 )) || ports+=(3000)
  (( RUN_CONTROL == 0 )) || ports+=(3001)

  for port in "${ports[@]-}"; do
    while IFS= read -r listener_pid; do
      [[ "$listener_pid" =~ ^[0-9]+$ ]] || continue
      root_pid="$(find_project_instance_root "$listener_pid")"
      [[ "$root_pid" =~ ^[0-9]+$ && "$root_pid" != "$$" ]] || continue
      [[ "$seen_roots" != *" $root_pid "* ]] || continue
      seen_roots+="$root_pid "
      (( cleaned == 1 )) || info "清理检测到的旧服务"
      terminate_process_tree "$root_pid"
      cleaned=1
    done < <(lsof -nP -iTCP:"$port" -sTCP:LISTEN -t 2>/dev/null | sort -u)
  done
  (( cleaned == 0 )) || success "旧实例已清理"
}

cleanup() {
  local exit_code=$?
  local pid
  # Cleanup must finish even when a child already received the terminal signal.
  set +e
  if (( CLEANUP_DONE == 1 )); then
    return
  fi
  CLEANUP_DONE=1

  if (( ${#SERVICE_PIDS[@]} > 0 || COMPOSE_STARTED_BY_SCRIPT == 1 )); then
    printf '\n'
    info "停止本次启动的服务"
  fi
  for pid in "${SERVICE_PIDS[@]-}"; do
    terminate_process_tree "$pid"
  done
  if (( COMPOSE_STARTED_BY_SCRIPT == 1 )); then
    run_logged "$LOG_DIR/bootstrap.log" "${compose_cmd[@]}" stop postgres || true
  fi
  if (( ${#SERVICE_PIDS[@]} > 0 || COMPOSE_STARTED_BY_SCRIPT == 1 )); then
    success "已停止"
  fi
  release_instance_state
  return "$exit_code"
}

start_container_stack() {
  local -a targets=()
  local -a up_args=(up --detach --remove-orphans)
  local needs_app=0

  if (( RUN_API == 1 || RUN_LEARNER == 1 || RUN_CONTROL == 1 )); then
    needs_app=1
  fi
  (( RUN_WORKER == 0 )) || targets+=(worker asset-exporter)
  (( needs_app == 0 )) || targets+=(app)
  (( RUN_LEARNER == 0 )) || targets+=(learner)
  (( RUN_CONTROL == 0 )) || targets+=(control)
  (( ${#targets[@]} > 0 )) || die "未选择任何容器服务"
  ensure_restart_matches_sources

  if (( SKIP_MIGRATE == 1 )); then
    warn "容器模式始终执行幂等数据库迁移；--skip-migrate 仅适用于 --host-services"
  fi
  if (( MONITOR_WORKER == 1 )); then
    warn "--monitor-worker 已无需使用：容器中的 Worker 已默认常驻"
  fi

  if (( REBUILD_IMAGES == 1 )); then
    up_args+=(--build)
    info "构建并重启 BinnAgentX 容器"
  else
    up_args+=(--no-build --force-recreate)
    info "使用现有镜像重启 BinnAgentX 容器"
  fi
  : > "$LOG_DIR/compose.log"
  if ! run_logged_with_heartbeat "$LOG_DIR/compose.log" "容器仍在构建或重启" \
    "${compose_cmd[@]}" "${up_args[@]}" "${targets[@]}"; then
    show_log_tail "$LOG_DIR/compose.log" 50
    die "容器构建或启动失败"
  fi

  (( needs_app == 0 )) || \
    wait_for_container_url "API" "http://127.0.0.1:8000/health/ready"
  (( RUN_LEARNER == 0 )) || \
    wait_for_container_url "Learner" "http://127.0.0.1:3000"
  (( RUN_CONTROL == 0 )) || \
    wait_for_container_url "Control" "http://127.0.0.1:3001"
  (( RUN_WORKER == 0 || RUN_CONTROL == 0 )) || wait_for_content_worker
  record_built_source_fingerprint

  printf '\n已启动（Compose 项目: %s）：\n' "$COMPOSE_PROJECT_NAME"
  (( needs_app == 0 )) || printf '  API      http://127.0.0.1:8000\n'
  (( RUN_LEARNER == 0 )) || printf '  Learner  http://127.0.0.1:3000\n'
  (( RUN_CONTROL == 0 )) || printf '  Control  http://127.0.0.1:3001\n'
  printf '  日志     %s/compose.log\n' "$LOG_DIR"
  printf '停止命令: docker compose -p %s down\n' "$COMPOSE_PROJECT_NAME"
}

handle_signal() {
  if [[ -n "$ACTIVE_COMMAND_PID" ]] && kill -0 "$ACTIVE_COMMAND_PID" >/dev/null 2>&1; then
    terminate_process_tree "$ACTIVE_COMMAND_PID"
  fi
  exit "$1"
}

trap 'handle_signal 130' INT
trap 'handle_signal 143' TERM

if (( RUN_CONTAINER_STACK == 1 )); then
  if (( CLEAN_OLD_INSTANCES == 1 )); then
    cleanup_recorded_instance
    cleanup_legacy_instances
  fi
  start_container_stack
  exit 0
fi

trap cleanup EXIT

if (( CLEAN_OLD_INSTANCES == 1 )); then
  cleanup_recorded_instance
  cleanup_legacy_instances
fi

# Fail before touching the database when an old application process is still running.
(( RUN_API == 1 )) && ensure_port_available "API" 8000
(( RUN_LEARNER == 1 )) && ensure_port_available "Learner" 3000
(( RUN_CONTROL == 1 )) && ensure_port_available "Control" 3001

write_instance_state

if (( NEED_DATABASE == 1 )); then
  if (( SKIP_COMPOSE == 0 )); then
    start_database
  else
    info "使用已有 PostgreSQL"
  fi
  wait_for_database
  if (( SKIP_MIGRATE == 0 )); then
    run_migrations
  fi
fi

if (( MONITOR_WORKER == 1 )); then
  warn "--monitor-worker 已无需使用：当前 Worker 已默认常驻"
fi
if (( RUN_WORKER == 1 )); then
  start_worker_service
  start_asset_exporter_service
fi

if (( RUN_API == 1 )); then
  start_http_service \
    "API" 8000 "http://127.0.0.1:8000/health/ready" "$LOG_DIR/api.log" \
    uv run binnagent-api
fi
if (( RUN_LEARNER == 1 )); then
  start_http_service \
    "Learner" 3000 "http://127.0.0.1:3000/api/learner/v1/meta" "$LOG_DIR/learner-web.log" \
    env "NEXT_PUBLIC_LEARNER_API_BASE_URL=$LEARNER_API_BASE_URL" \
    "${PNPM_CMD[@]}" dev:learner
fi
if (( RUN_CONTROL == 1 )); then
  start_http_service \
    "Control" 3001 "http://127.0.0.1:3001/api/control/v1/meta" "$LOG_DIR/control-cockpit.log" \
    env "NEXT_PUBLIC_CONTROL_API_BASE_URL=$CONTROL_API_BASE_URL" \
    "${PNPM_CMD[@]}" dev:control
fi

if (( ${#SERVICE_PIDS[@]} == 0 )); then
  printf '\n'
  success "一次性检查完成"
  info "日志: $LOG_DIR"
  exit 0
fi

printf '\n已启动：\n'
(( RUN_WORKER == 1 )) && printf '  Worker   内容生成队列\n'
(( RUN_WORKER == 1 )) && printf '  Exporter Obsidian 资产导出队列\n'
(( RUN_API == 1 )) && printf '  API      http://127.0.0.1:8000\n'
(( RUN_LEARNER == 1 )) && printf '  Learner  http://127.0.0.1:3000\n'
(( RUN_CONTROL == 1 )) && printf '  Control  http://127.0.0.1:3001\n'
printf '  日志     %s\n' "$LOG_DIR"
printf '按 Ctrl-C 停止。\n'

while true; do
  for index in "${!SERVICE_NAMES[@]}"; do
    service_pid="${SERVICE_PIDS[$index]}"
    if ! kill -0 "$service_pid" >/dev/null 2>&1; then
      service_exit_code=1
      if wait "$service_pid"; then
        service_exit_code=0
      else
        service_exit_code=$?
      fi
      show_log_tail "${SERVICE_LOGS[$index]}" 30
      die "${SERVICE_NAMES[$index]} 已退出（code=${service_exit_code}）"
    fi
  done
  sleep "$MONITOR_INTERVAL"
done
