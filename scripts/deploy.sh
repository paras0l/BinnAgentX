#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"
REPO_DIR="${ROOT_DIR}"

if [[ ! -f "${REPO_DIR}/pyproject.toml" || ! -d "${REPO_DIR}/services/api/binnagent_api" ]]; then
  echo "错误：当前脚本未解析到 BinnAgent 仓库根目录。请确认路径为 scripts/ 所在目录。"
  exit 1
fi

export PYTHONPATH="${REPO_DIR}/python:${REPO_DIR}/services/api:${REPO_DIR}/services/worker:${PYTHONPATH:-}"
export COMPOSE_FILE="${REPO_DIR}/compose.yaml"
export COMPOSE_PROJECT_NAME="binnagent_$(basename "$REPO_DIR" | tr '[:upper:]' '[:lower:]' | tr -c 'a-z0-9_' '_' | sed 's/^_\\+//;s/_\\+$//')"
export DOCKER_BUILDKIT="${DOCKER_BUILDKIT:-0}"

echo "部署入口目录: ${REPO_DIR}"

RUN_WORKER=true
RUN_FRONTEND=false
GENERATE_CONTENT=false
SEED=()
PIDS=()

run_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "错误：缺少依赖 '$1'，请先安装后重试。"
    exit 1
  }
}

compose() {
  local subcommand=$1
  shift
  if [[ "${DOCKER_COMPOSE_USE_PLUGIN:-true}" == "true" ]]; then
    docker compose -f "$COMPOSE_FILE" -p "$COMPOSE_PROJECT_NAME" "$subcommand" "$@"
  else
    docker-compose -f "$COMPOSE_FILE" -p "$COMPOSE_PROJECT_NAME" "$subcommand" "$@"
  fi
}

usage() {
  cat <<'USAGE'
用法: scripts/deploy.sh [--skip-worker] [--with-frontend] [--seed-content [SEED]]

默认行为：
  - 启动 PostgreSQL（docker compose）
  - 执行数据库迁移
  - 启动 API 服务
  - 启动 Worker 服务
  - 不自动启动前端（可用 --with-frontend 开启）

可选项：
  --skip-worker      不启动 worker 进程
  --with-frontend    同时启动 learner 与 control 前端
  --seed-content     在启动前通过 Agent 内容生成工作流执行一次离线内容生成（可再加一个整型种子）
USAGE
  exit 0
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --skip-worker)
      RUN_WORKER=false
      shift
      ;;
    --with-frontend)
      RUN_FRONTEND=true
      shift
      ;;
    --seed-content)
      GENERATE_CONTENT=true
      shift
      if [[ "${1:-}" != "" && "${1:0:1}" != "-" ]]; then
        SEED+=("--seed" "$1")
        shift
      fi
      ;;
    --help|-h)
      usage
      ;;
    *)
      echo "未知参数: $1"
      usage
      ;;
  esac
done

run_cmd docker
run_cmd uv
run_cmd git
if docker compose version >/dev/null 2>&1; then
  export DOCKER_COMPOSE_USE_PLUGIN=true
else
  run_cmd docker-compose
  export DOCKER_COMPOSE_USE_PLUGIN=false
fi

mkdir -p scripts logs

if ! [[ -f .env ]]; then
  echo "未检测到 .env，请先 cp .env.example .env 并补齐。"
  exit 1
fi

if ! command -v pg_isready >/dev/null 2>&1; then
  echo "警告：未检测到 pg_isready，跳过 PostgreSQL 连接探测。"
else
  echo "启动数据库并等待就绪..."
fi

echo "使用 Compose 项目: ${COMPOSE_PROJECT_NAME}"
compose up -d postgres

if command -v pg_isready >/dev/null 2>&1; then
  for _ in {1..30}; do
    if compose exec -T postgres pg_isready \
        -U "${POSTGRES_USER:-binnagent}" -d "${POSTGRES_DB:-binnagent}" >/dev/null 2>&1; then
      break
    fi
    sleep 1
  done
fi

run_cmd alembic
uv run alembic -c services/api/alembic.ini upgrade head

if [[ "$GENERATE_CONTENT" == "true" ]]; then
  if [[ "${#SEED[@]}" -gt 0 ]]; then
    uv run python -m binnagent_agent.workflows.content_generation "${SEED[@]}"
  else
    uv run python -m binnagent_agent.workflows.content_generation
  fi
fi

echo "启动 API..."
nohup env PYTHONPATH="$PYTHONPATH" uv run python -m binnagent_api.main > logs/api.log 2>&1 &
PIDS+=("$!")

if [[ "$RUN_WORKER" == "true" ]]; then
  echo "启动 Worker..."
  nohup env PYTHONPATH="$PYTHONPATH" uv run python -m binnagent_worker.main > logs/worker.log 2>&1 &
  PIDS+=("$!")
fi

if [[ "$RUN_FRONTEND" == "true" ]]; then
  run_cmd pnpm
  echo "启动 learner 前端..."
  nohup pnpm dev:learner > logs/learner-web.log 2>&1 &
  PIDS+=("$!")
  echo "启动 control 前端..."
  nohup pnpm dev:control > logs/control-cockpit.log 2>&1 &
  PIDS+=("$!")
fi

cleanup() {
  echo
  echo "退出部署守护：正在回收子进程..."
  for pid in "${PIDS[@]:-}"; do
    if kill -0 "$pid" >/dev/null 2>&1; then
      kill "$pid" >/dev/null 2>&1 || true
    fi
  done
}

trap cleanup EXIT INT TERM

echo
echo "启动完成："
echo "- API: http://127.0.0.1:8000"
echo "- Learner: http://127.0.0.1:3000"
echo "- Control: http://127.0.0.1:3001"
echo "- 控制角色头：X-BinnAgent-Control-Role=developer_reviewer"
echo
echo "运行日志在 logs/*.log，可用 tail -f 查看。"
echo "按 Ctrl-C 结束部署进程。"

wait
