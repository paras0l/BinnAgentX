#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="${PROJECT_ROOT:-$(cd "$SCRIPT_DIR/.." && pwd)}"
cd "$PROJECT_ROOT"

COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-binnagentx}"
LOG_DIR="${LOG_DIR:-$PROJECT_ROOT/logs}"
DB_WAIT_SECONDS="${DB_WAIT_SECONDS:-60}"
MONITOR_INTERVAL="${MONITOR_INTERVAL:-2}"
SKIP_MIGRATE="${SKIP_MIGRATE:-0}"
SKIP_COMPOSE="${SKIP_COMPOSE:-0}"
MONITOR_WORKER="${MONITOR_WORKER:-0}"

RUN_API=1
RUN_WORKER=1
RUN_LEARNER=0
RUN_CONTROL=0

show_help() {
  cat <<'EOF'
用法:
  bash scripts/deploy.sh [选项]

选项:
  --project-name <name>     docker compose 项目名（默认: binnagentx）
  --compose <file[:file]>   指定 compose 文件列表（优先于 COMPOSE_FILE/COMPOSE_FILES_ENV）
  --skip-compose            不启动/停止 docker compose，仅拉起本机服务
  --skip-migrate            跳过 alembic 迁移
  --no-api                  不启动 API
  --no-worker               不启动 Worker
  --learner                 启动 Learner 前端（可与 --control 配合）
  --control                 启动 Control 前端
  --monitor-worker          监控 worker 退出，异常退出则退出脚本（默认不监控）
  --log-dir <dir>           指定日志目录（默认: ./logs）
  --help                    打印帮助
EOF
}

declare -a COMPOSE_FILES=()

add_compose_file() {
  local compose_file="$1"
  local resolved="$compose_file"

  [[ -z "$resolved" ]] && return
  resolved="${resolved#./}"
  if [[ ! -f "$resolved" && -f "$PROJECT_ROOT/$resolved" ]]; then
    resolved="$PROJECT_ROOT/$resolved"
  fi
  [[ ! -f "$resolved" ]] && return

  for existing in "${COMPOSE_FILES[@]-}"; do
    if [[ "$existing" == "$resolved" ]]; then
      return
    fi
  done
  COMPOSE_FILES+=("$resolved")
}

collect_compose_files_from_env() {
  local value="$1"
  [[ -z "$value" ]] && return
  local -a files=()
  IFS=':' read -r -a files <<< "$value"
  for f in "${files[@]}"; do
    add_compose_file "$f"
  done
}

collect_default_compose_files() {
  add_compose_file "compose.yaml"
  add_compose_file "compose.yml"
  add_compose_file "docker-compose.yaml"
  add_compose_file "docker-compose.yml"
  add_compose_file "docker-compose.dev.yaml"
  add_compose_file "docker-compose.dev.yml"
  add_compose_file "docker-compose.local.yaml"
  add_compose_file "docker-compose.local.yml"
}

require_cmd() {
  local cmd_name="$1"
  if ! command -v "$cmd_name" >/dev/null 2>&1; then
    echo "错误：未检测到命令 $cmd_name"
    return 1
  fi
}

run_uv() {
  uv run "$@"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --project-name)
      COMPOSE_PROJECT_NAME="$2"
      shift 2
      ;;
    --compose)
      compose_input="$2"
      collect_compose_files_from_env "$compose_input"
      shift 2
      ;;
    --skip-compose)
      SKIP_COMPOSE=1
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
    --monitor-worker)
      MONITOR_WORKER=1
      shift
      ;;
    --log-dir)
      LOG_DIR="$2"
      shift 2
      ;;
    --help)
      show_help
      exit 0
      ;;
    *)
      echo "未知参数: $1"
      show_help
      exit 2
      ;;
  esac
done

if (( RUN_API == 0 && RUN_WORKER == 0 && RUN_LEARNER == 0 && RUN_CONTROL == 0 )); then
  echo "错误：未选择任何服务。请至少保留 api、worker、learner、control 中的一项。"
  exit 1
fi

echo "部署入口目录: $PROJECT_ROOT"
echo "使用 Compose 项目: $COMPOSE_PROJECT_NAME"

if [[ "$SKIP_COMPOSE" == "0" ]]; then
  collect_compose_files_from_env "${COMPOSE_FILE:-}"
  collect_compose_files_from_env "${COMPOSE_FILES_ENV:-}"
  if (( ${#COMPOSE_FILES[@]-0} == 0 )); then
    collect_default_compose_files
  fi
  if (( ${#COMPOSE_FILES[@]-0} == 0 )); then
    echo "未匹配到明确 compose 文件，将直接使用 docker compose 默认规则。"
  else
    echo "使用 compose 文件:"
    for f in "${COMPOSE_FILES[@]}"; do
      echo "  - $f"
    done
  fi
fi

mkdir -p "$LOG_DIR"

if ! require_cmd docker; then
  echo "请先安装 Docker（或加 --skip-compose 并单独启动数据库）。"
  exit 1
fi

if (( RUN_API == 1 || RUN_WORKER == 1 )); then
  if ! require_cmd uv; then
    echo "请先安装 uv（例如 pipx install uv）。"
    exit 1
  fi
fi

if (( RUN_LEARNER == 1 || RUN_CONTROL == 1 )); then
  if ! require_cmd pnpm; then
    echo "请先安装 pnpm 11.9.0。"
    exit 1
  fi
fi

if [[ -n "${VIRTUAL_ENV:-}" ]]; then
  echo "检测到环境变量 VIRTUAL_ENV=${VIRTUAL_ENV}，将忽略并使用项目虚拟环境"
  unset VIRTUAL_ENV
fi

load_env_file() {
  local env_file="$1"
  local line key value
  local -i line_no=0
  while IFS= read -r line || [[ -n "$line" ]]; do
    line_no=$((line_no + 1))
    [[ -z "$line" || "${line:0:1}" == "#" ]] && continue
    line="${line%$'\r'}"
    if [[ "$line" == export\ * ]]; then
      line="${line#export }"
    fi
    [[ -z "$line" ]] && continue
    case "$line" in
      *=*)
        ;;
      *)
        continue
        ;;
    esac

    key="${line%%=*}"
    value="${line#*=}"
    key="$(printf '%s' "$key" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')"
    value="$(printf '%s' "$value" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')"

    case "$key" in
      [!A-Za-z_]* | "" )
        echo "警告: ${env_file}:${line_no} 跳过非法变量名 \"$key\"" >&2
        continue
        ;;
    esac

    if [[ "$value" == \"*\" && "$value" == *\" ]]; then
      value="${value:1:${#value}-2}"
    elif [[ "$value" == \'*\' && "$value" == *\' ]]; then
      value="${value:1:${#value}-2}"
    fi

    export "$key=$value"
  done < "$env_file"
}

if [[ -f "$PROJECT_ROOT/.env" ]]; then
  load_env_file "$PROJECT_ROOT/.env"
fi

export UV_PROJECT_ENVIRONMENT="${PROJECT_ROOT}/.venv"
export PYTHONPATH="$PROJECT_ROOT"
export PYTHONUNBUFFERED=1

compose_cmd=(docker compose)
  if (( SKIP_COMPOSE == 0 )) && (( ${#COMPOSE_FILES[@]-0} > 0 )); then
  for f in "${COMPOSE_FILES[@]-}"; do
    compose_cmd+=(-f "$f")
  done
fi
compose_cmd+=(-p "$COMPOSE_PROJECT_NAME")

compose_up() {
  "${compose_cmd[@]}" up -d
}

compose_down() {
  "${compose_cmd[@]}" down --remove-orphans
}

if [[ "$SKIP_COMPOSE" == "0" ]]; then
  echo "启动 compose..."
  compose_up
fi

wait_postgres() {
  if ! command -v pg_isready >/dev/null 2>&1; then
    echo "警告：未检测到 pg_isready，跳过数据库就绪探测。"
    return
  fi
  local host="${DB_HOST:-127.0.0.1}"
  local port="${DB_PORT:-5432}"
  local retries="$DB_WAIT_SECONDS"
  while (( retries > 0 )); do
    if pg_isready -h "$host" -p "$port" >/dev/null 2>&1; then
      echo "数据库就绪: ${host}:${port}"
      return
    fi
    retries=$((retries - 1))
    sleep 1
  done
  echo "错误：PostgreSQL 未在预期时间内就绪 (${host}:${port})"
  if [[ "$SKIP_COMPOSE" == "0" ]]; then
    compose_down
  fi
  exit 1
}

wait_postgres

if (( SKIP_MIGRATE == 0 )) && [[ -f "$PROJECT_ROOT/services/api/alembic.ini" ]]; then
  if ! run_uv python -m alembic -c services/api/alembic.ini upgrade head; then
    echo "错误：数据库迁移失败"
    if [[ "$SKIP_COMPOSE" == "0" ]]; then
      compose_down
    fi
    exit 1
  fi
fi

SERVICE_NAMES=()
SERVICE_PIDS=()
SERVICE_MONITOR_FLAGS=()
MONITOR_SERVICES=()

register_service() {
  local name="$1"
  local logfile="$2"
  local monitor="$3"
  shift 3

  mkdir -p "$LOG_DIR"
  : > "$logfile"

  "$@" >> "$logfile" 2>&1 &
  local pid=$!
  SERVICE_NAMES+=("$name")
  SERVICE_PIDS+=("$pid")
  SERVICE_MONITOR_FLAGS+=("$monitor")

  if [[ "$monitor" == "1" ]]; then
    MONITOR_SERVICES+=("$name")
  fi

  echo "启动 $name... (pid=$pid, log=$logfile, monitor=$monitor)"
}

cleanup() {
  local reason="${1:-exit}"
  echo "退出部署守护：$reason"
  for pid in "${SERVICE_PIDS[@]}"; do
    if kill -0 "$pid" >/dev/null 2>&1; then
      kill "$pid" >/dev/null 2>&1 || true
    fi
  done
  if [[ "$SKIP_COMPOSE" == "0" ]]; then
    compose_down || true
  fi
  for pid in "${SERVICE_PIDS[@]}"; do
    wait "$pid" 2>/dev/null || true
  done
}

trap 'cleanup "收到停止信号"' INT TERM

if (( RUN_API == 1 )); then
  register_service "api" "$LOG_DIR/api.log" 1 uv run binnagent-api
fi

if (( RUN_WORKER == 1 )); then
  worker_monitor=0
  if (( MONITOR_WORKER == 1 )); then
    worker_monitor=1
  fi
  register_service "worker" "$LOG_DIR/worker.log" "$worker_monitor" uv run binnagent-worker
fi

if (( RUN_LEARNER == 1 )); then
  register_service "learner-web" "$LOG_DIR/learner-web.log" 1 pnpm dev:learner
fi

if (( RUN_CONTROL == 1 )); then
  register_service "control-cockpit" "$LOG_DIR/control-cockpit.log" 1 pnpm dev:control
fi

echo "启动完成。日志目录: ${LOG_DIR}/*.log"
echo "按 Ctrl-C 可停止部署守护。"

if ((${#MONITOR_SERVICES[@]} == 0)); then
  echo "当前无监控服务（所有服务皆为可选一次性任务）将保持等待状态。"
fi

while true; do
  for service_name in "${MONITOR_SERVICES[@]}"; do
    service_pid=""
    for idx in "${!SERVICE_NAMES[@]}"; do
      if [[ "${SERVICE_NAMES[$idx]}" == "$service_name" ]]; then
        service_pid="${SERVICE_PIDS[$idx]}"
        break
      fi
    done
    if [[ -z "$service_pid" ]]; then
      continue
    fi
    if ! kill -0 "$service_pid" >/dev/null 2>&1; then
      if wait "$service_pid"; then
        echo "${service_name} 进程正常退出 (pid=$service_pid)"
        cleanup "服务 ${service_name} 已退出"
        exit 0
      else
        service_exit_code=$?
        echo "${service_name} 进程异常退出 code=$service_exit_code (pid=$service_pid)"
        cleanup "服务 ${service_name} 异常退出"
        exit "$service_exit_code"
      fi
    fi
  done
  sleep "$MONITOR_INTERVAL"
done
