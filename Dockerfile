ARG PYTHON_BASE_IMAGE=python:3.13-slim-bookworm
FROM ${PYTHON_BASE_IMAGE} AS python-runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_HTTP_RETRIES=10 \
    UV_HTTP_TIMEOUT=600 \
    PATH="/app/.venv/bin:$PATH"

WORKDIR /app

RUN pip install --no-cache-dir uv==0.11.3

COPY pyproject.toml uv.lock README.md ./
RUN --mount=type=cache,id=binnagentx-uv,target=/root/.cache/uv \
    uv sync --frozen --no-dev --no-install-project

COPY python ./python
COPY services ./services
COPY contracts ./contracts
COPY fixtures ./fixtures

RUN --mount=type=cache,id=binnagentx-uv,target=/root/.cache/uv \
    uv sync --frozen --no-dev

CMD ["binnagent-api"]
