#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DEPLOY_HOST="${BINNAGENTX_DEPLOY_HOST:-root@8.152.198.107}"
REMOTE_DIR="${BINNAGENTX_DEPLOY_REMOTE_DIR:-/opt/binnagentx}"
PLATFORM="${BINNAGENTX_DEPLOY_PLATFORM:-linux/amd64}"
BUILDER="${BINNAGENTX_DEPLOY_BUILDER:-binnagentx-remote}"
BUILD_DIR="$(mktemp -d "${TMPDIR:-/tmp}/binnagentx-deploy.XXXXXX")"

cleanup() {
  rm -rf "$BUILD_DIR"
}
trap cleanup EXIT

require_command() {
  command -v "$1" >/dev/null 2>&1 || {
    printf '缺少命令：%s\n' "$1" >&2
    exit 1
  }
}

for command_name in docker scp ssh tar; do
  require_command "$command_name"
done

cd "$PROJECT_ROOT"

if ! docker buildx inspect "$BUILDER" >/dev/null 2>&1; then
  docker buildx create --name "$BUILDER" --driver docker-container >/dev/null
fi
docker buildx inspect "$BUILDER" --bootstrap >/dev/null

printf '本机构建 %s 运行镜像（远端不会编译前端）\n' "$PLATFORM"
docker buildx build --builder "$BUILDER" --platform "$PLATFORM" --target python-runtime \
  --tag binnagentx-app:latest --output "type=docker,dest=$BUILD_DIR/app.tar" .
docker buildx build --builder "$BUILDER" --platform "$PLATFORM" --target learner-runtime \
  --tag binnagentx-learner:latest --output "type=docker,dest=$BUILD_DIR/learner.tar" \
  -f Dockerfile.frontend .
docker buildx build --builder "$BUILDER" --platform "$PLATFORM" --target control-runtime \
  --tag binnagentx-control:latest --output "type=docker,dest=$BUILD_DIR/control.tar" \
  -f Dockerfile.frontend .

cp compose.remote.yaml "$BUILD_DIR/compose.yaml"
COPYFILE_DISABLE=1 tar -C "$BUILD_DIR" -czf "$BUILD_DIR/binnagentx-images.tgz" \
  app.tar learner.tar control.tar compose.yaml

printf '上传预构建镜像到 %s\n' "$DEPLOY_HOST"
scp "$BUILD_DIR/binnagentx-images.tgz" "$DEPLOY_HOST:/tmp/binnagentx-images.tgz"

ssh "$DEPLOY_HOST" "bash -s" -- "$REMOTE_DIR" <<'REMOTE_SCRIPT'
set -euo pipefail

REMOTE_DIR="$1"
ARCHIVE=/tmp/binnagentx-images.tgz
mkdir -p "$REMOTE_DIR"
tar -xzf "$ARCHIVE" -C "$REMOTE_DIR"

if [[ ! -f "$REMOTE_DIR/.env.production" ]]; then
  umask 077
  db_password="$(openssl rand -hex 24)"
  email_secret="$(openssl rand -hex 32)"
  experience_secret="$(openssl rand -hex 32)"
  bootstrap_invite="BINNX-$(openssl rand -hex 8 | tr '[:lower:]' '[:upper:]')"
  cat >"$REMOTE_DIR/.env.production" <<ENV_FILE
BINNAGENT_ENV=development
BINNAGENT_LEARNER_IDENTITY_ADAPTER=session
BINNAGENT_CONTROL_IDENTITY_ADAPTER=synthetic
BINNAGENT_ENABLE_REMOTE_MODEL_CALLS=true
BINNAGENT_MIN_CONTENT_RIGHTS_STATUS=eligible_dev
BINNAGENT_EMAIL_VERIFICATION_SECRET=$email_secret
BINNAGENT_EXPERIENCE_CODE_SECRET=$experience_secret
BINNAGENT_BOOTSTRAP_INVITE_CODE=$bootstrap_invite
POSTGRES_DB=binnagentx
POSTGRES_USER=binnagentx
POSTGRES_PASSWORD=$db_password
ENV_FILE
fi

printf '停止旧 BinnAgent 容器并保留其数据卷\n'
docker rm -f \
  binnagent-web binnagent-app binnagent-feishu-mcp binnagent-redis binnagent-db \
  >/dev/null 2>&1 || true

printf '导入本机预构建镜像\n'
docker load -i "$REMOTE_DIR/app.tar"
docker load -i "$REMOTE_DIR/learner.tar"
docker load -i "$REMOTE_DIR/control.tar"

cd "$REMOTE_DIR"
docker compose --env-file .env.production -f compose.yaml up \
  --detach --remove-orphans --no-build

for attempt in $(seq 1 30); do
  if curl -fsS http://127.0.0.1:5173/health >/dev/null && \
     curl -fsS http://127.0.0.1:5174/health >/dev/null; then
    break
  fi
  if [[ "$attempt" == 30 ]]; then
    docker compose --env-file .env.production -f compose.yaml ps
    exit 1
  fi
  sleep 2
done

docker compose --env-file .env.production -f compose.yaml ps
rm -f "$ARCHIVE" "$REMOTE_DIR/app.tar" "$REMOTE_DIR/learner.tar" "$REMOTE_DIR/control.tar"
REMOTE_SCRIPT

printf '部署完成：学习端 http://8.152.198.107:5173/\n'
printf '控制舱仅监听远端 127.0.0.1:5174，请通过 SSH 隧道访问。\n'
