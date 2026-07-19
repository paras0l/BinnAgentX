import os
import signal
import subprocess
import time
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
DEPLOY_SCRIPT = PROJECT_ROOT / "scripts" / "deploy.sh"
COMPOSE_FILE = PROJECT_ROOT / "compose.yaml"


def _write_executable(path: Path, content: str) -> None:
    path.write_text(content, encoding="utf-8")
    path.chmod(0o755)


def test_deploy_script_has_valid_syntax_and_concise_help() -> None:
    syntax = subprocess.run(
        ["bash", "-n", str(DEPLOY_SCRIPT)],
        cwd=PROJECT_ROOT,
        check=False,
        capture_output=True,
        text=True,
    )
    assert syntax.returncode == 0, syntax.stderr

    help_result = subprocess.run(
        ["bash", str(DEPLOY_SCRIPT), "--help"],
        cwd=PROJECT_ROOT,
        check=False,
        capture_output=True,
        text=True,
    )
    assert help_result.returncode == 0
    assert "Compose 项目名" in help_result.stdout
    assert "binnagentx" in help_result.stdout
    assert "--host-services" in help_result.stdout
    assert "--restart" in help_result.stdout
    assert "控制台只显示关键状态" in help_result.stdout


def test_compose_project_is_isolated_and_contains_the_full_app_stack() -> None:
    compose = COMPOSE_FILE.read_text(encoding="utf-8")

    assert compose.startswith("name: binnagentx\n")
    for service in (
        "prefect-server",
        "postgres",
        "migrate",
        "worker",
        "app",
        "learner",
        "control",
    ):
        assert f"  {service}:\n" in compose
    assert "name: binnagentx_postgres_data" in compose
    assert "name: binnagentx_prefect_task_storage" in compose
    assert compose.count("binnagent_prefect_task_storage:/opt/prefect/task-storage") == 2
    deploy = DEPLOY_SCRIPT.read_text(encoding="utf-8")
    assert "--no-build --force-recreate" in deploy
    assert "run_logged_with_heartbeat" in deploy
    assert "background_command_is_running" in deploy
    assert "runtime_source_fingerprint" in deploy
    assert "--restart 自动升级为构建并重启" in deploy


def test_container_restart_skips_build_only_when_source_fingerprint_matches(
    tmp_path: Path,
) -> None:
    fake_bin = tmp_path / "bin"
    fake_bin.mkdir()
    docker_calls = tmp_path / "docker-calls"
    _write_executable(
        fake_bin / "docker",
        '#!/usr/bin/env bash\nprintf \'%s\\n\' "$*" >> "$FAKE_DOCKER_CALLS"\nexit 0\n',
    )
    _write_executable(
        fake_bin / "curl",
        "#!/usr/bin/env bash\nprintf '%s\\n' '{\"prefect\":{\"active_workers\":1}}'\n",
    )
    _write_executable(fake_bin / "lsof", "#!/usr/bin/env bash\nexit 1\n")
    env = {
        **os.environ,
        "PATH": f"{fake_bin}:{os.environ['PATH']}",
        "FAKE_DOCKER_CALLS": str(docker_calls),
        "LOG_DIR": str(tmp_path / "logs"),
        "DEPLOY_STATE_DIR": str(tmp_path / "state"),
    }

    built = subprocess.run(
        ["bash", str(DEPLOY_SCRIPT)],
        cwd=PROJECT_ROOT,
        env=env,
        check=False,
        capture_output=True,
        text=True,
        timeout=10,
    )
    restarted = subprocess.run(
        ["bash", str(DEPLOY_SCRIPT), "--restart"],
        cwd=PROJECT_ROOT,
        env=env,
        check=False,
        capture_output=True,
        text=True,
        timeout=10,
    )

    assert built.returncode == 0, built.stderr
    assert restarted.returncode == 0, restarted.stderr
    calls = docker_calls.read_text(encoding="utf-8")
    assert "up --detach --remove-orphans --build" in calls
    assert "up --detach --remove-orphans --no-build --force-recreate" in calls
    assert "运行代码未变化" in restarted.stdout
    assert "跳过镜像构建" in restarted.stdout


def test_host_worker_starts_without_requiring_or_invoking_docker(tmp_path: Path) -> None:
    fake_bin = tmp_path / "bin"
    fake_bin.mkdir()
    docker_marker = tmp_path / "docker-invoked"
    _write_executable(
        fake_bin / "docker",
        '#!/usr/bin/env bash\ntouch "$FAKE_DOCKER_MARKER"\nexit 99\n',
    )
    _write_executable(
        fake_bin / "uv",
        "#!/usr/bin/env bash\ntrap 'exit 0' TERM INT\nwhile :; do sleep 1; done\n",
    )
    _write_executable(fake_bin / "pg_isready", "#!/usr/bin/env bash\nexit 0\n")
    env = {
        **os.environ,
        "PATH": f"{fake_bin}:{os.environ['PATH']}",
        "FAKE_DOCKER_MARKER": str(docker_marker),
        "LOG_DIR": str(tmp_path / "logs"),
        "DEPLOY_STATE_DIR": str(tmp_path / "state"),
    }

    process = subprocess.Popen(
        [
            "bash",
            str(DEPLOY_SCRIPT),
            "--skip-compose",
            "--skip-migrate",
            "--no-api",
            "--no-learner",
            "--no-control",
        ],
        cwd=PROJECT_ROOT,
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
    )
    try:
        time.sleep(0.5)
        process.send_signal(signal.SIGINT)
        output, _ = process.communicate(timeout=6)
    finally:
        if process.poll() is None:
            process.kill()
            process.wait(timeout=3)

    assert process.returncode == 130, output
    assert "内容生成 Worker 已启动" in output
    assert "停止本次启动的服务" in output
    assert not docker_marker.exists()


def test_frontend_uses_npm_fallback_and_stops_child_on_interrupt(
    tmp_path: Path,
) -> None:
    fake_bin = tmp_path / "bin"
    fake_bin.mkdir()
    npm_marker = tmp_path / "npm-args"
    _write_executable(
        fake_bin / "npm",
        '#!/bin/bash\nprintf \'%s\\n\' "$*" > "$FAKE_NPM_MARKER"\n'
        "trap 'exit 0' TERM INT\nwhile :; do sleep 1; done\n",
    )
    _write_executable(
        fake_bin / "curl",
        "#!/usr/bin/env bash\nprintf '%s\\n' '{\"prefect\":{\"active_workers\":1}}'\n",
    )
    _write_executable(fake_bin / "lsof", "#!/usr/bin/env bash\nexit 1\n")
    env = {
        **os.environ,
        "PATH": f"{fake_bin}:/usr/bin:/bin",
        "FAKE_NPM_MARKER": str(npm_marker),
        "LOG_DIR": str(tmp_path / "logs"),
        "DEPLOY_STATE_DIR": str(tmp_path / "state"),
        "MONITOR_INTERVAL": "1",
        "SHUTDOWN_TIMEOUT": "2",
    }
    process = subprocess.Popen(
        [
            "bash",
            str(DEPLOY_SCRIPT),
            "--skip-compose",
            "--skip-migrate",
            "--no-api",
            "--no-worker",
            "--learner",
            "--no-control",
        ],
        cwd=PROJECT_ROOT,
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
    )
    try:
        time.sleep(0.5)
        process.send_signal(signal.SIGINT)
        output, _ = process.communicate(timeout=6)
    finally:
        if process.poll() is None:
            process.kill()
            process.wait(timeout=3)

    assert process.returncode == 130, output
    assert "使用 npm 加载 pnpm 11.9.0" in output
    assert "启动 Learner" in output
    assert "停止本次启动的服务" in output
    assert "已停止" in output
    assert npm_marker.read_text(encoding="utf-8").strip() == (
        "exec --yes pnpm@11.9.0 -- dev:learner"
    )


def test_new_deploy_cleans_previous_project_instance(tmp_path: Path) -> None:
    fake_bin = tmp_path / "bin"
    fake_bin.mkdir()
    _write_executable(
        fake_bin / "npm",
        "#!/bin/bash\ntrap 'exit 0' TERM INT\nwhile :; do sleep 1; done\n",
    )
    _write_executable(
        fake_bin / "curl",
        "#!/usr/bin/env bash\nprintf '%s\\n' '{\"prefect\":{\"active_workers\":1}}'\n",
    )
    _write_executable(fake_bin / "lsof", "#!/usr/bin/env bash\nexit 1\n")
    state_dir = tmp_path / "state"
    env = {
        **os.environ,
        "PATH": f"{fake_bin}:/usr/bin:/bin",
        "LOG_DIR": str(tmp_path / "logs"),
        "DEPLOY_STATE_DIR": str(state_dir),
        "MONITOR_INTERVAL": "1",
        "SHUTDOWN_TIMEOUT": "2",
    }
    command = [
        "bash",
        str(DEPLOY_SCRIPT),
        "--skip-compose",
        "--skip-migrate",
        "--no-api",
        "--no-worker",
        "--learner",
        "--no-control",
    ]
    first = subprocess.Popen(
        command,
        cwd=PROJECT_ROOT,
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
    )
    second: subprocess.Popen[str] | None = None
    try:
        state_file = state_dir / "deploy.state"
        deadline = time.monotonic() + 4
        while not state_file.exists() and time.monotonic() < deadline:
            time.sleep(0.05)
        assert state_file.exists()

        second = subprocess.Popen(
            command,
            cwd=PROJECT_ROOT,
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
        )
        first.wait(timeout=6)
        assert first.returncode == 143

        deadline = time.monotonic() + 6
        while time.monotonic() < deadline:
            state_lines = (
                state_file.read_text(encoding="utf-8").splitlines() if state_file.exists() else []
            )
            if state_lines and state_lines[0].split("\t")[1] == str(second.pid):
                break
            time.sleep(0.05)
        else:
            raise AssertionError("new deploy did not take ownership of the state file")
        second.send_signal(signal.SIGINT)
        output, _ = second.communicate(timeout=6)
    finally:
        for process in (second, first):
            if process is not None and process.poll() is None:
                process.kill()
                process.wait(timeout=3)

    assert "清理上次运行的服务" in output
    assert "旧实例已清理" in output
    assert not (state_dir / "deploy.state").exists()


def test_new_deploy_discovers_legacy_instance_from_listener(tmp_path: Path) -> None:
    fake_bin = tmp_path / "bin"
    fake_bin.mkdir()
    listener_marker = tmp_path / "listener-pid"
    _write_executable(
        fake_bin / "npm",
        '#!/bin/bash\nprintf \'%s\\n\' "$$" > "$FAKE_LISTENER_MARKER"\n'
        "trap 'exit 0' TERM INT\nwhile :; do sleep 1; done\n",
    )
    _write_executable(
        fake_bin / "curl",
        "#!/usr/bin/env bash\nprintf '%s\\n' '{\"prefect\":{\"active_workers\":1}}'\n",
    )
    _write_executable(
        fake_bin / "lsof",
        "#!/bin/bash\n"
        'case " $* " in\n'
        "  *' -d cwd '*) printf 'p%s\\nfcwd\\nn%s\\n' \"$3\" \"$PROJECT_ROOT\"; exit 0 ;;\n"
        "  *' -iTCP:3000 '*)\n"
        '    if [ -s "$FAKE_LISTENER_MARKER" ]; then\n'
        '      pid=$(head -n 1 "$FAKE_LISTENER_MARKER")\n'
        '      if kill -0 "$pid" 2>/dev/null; then printf \'%s\\n\' "$pid"; exit 0; fi\n'
        "    fi\n"
        "    exit 1 ;;\n"
        "esac\n"
        "exit 1\n",
    )
    common_env = {
        **os.environ,
        "PATH": f"{fake_bin}:/usr/bin:/bin",
        "FAKE_LISTENER_MARKER": str(listener_marker),
        "PROJECT_ROOT": str(PROJECT_ROOT),
        "MONITOR_INTERVAL": "1",
        "SHUTDOWN_TIMEOUT": "2",
    }
    command = [
        "bash",
        str(DEPLOY_SCRIPT),
        "--skip-compose",
        "--skip-migrate",
        "--no-api",
        "--no-worker",
        "--learner",
        "--no-control",
    ]
    first = subprocess.Popen(
        command,
        cwd=PROJECT_ROOT,
        env={
            **common_env,
            "LOG_DIR": str(tmp_path / "old-logs"),
            "DEPLOY_STATE_DIR": str(tmp_path / "old-state"),
        },
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
    )
    second: subprocess.Popen[str] | None = None
    try:
        deadline = time.monotonic() + 4
        while not listener_marker.exists() and time.monotonic() < deadline:
            time.sleep(0.05)
        assert listener_marker.exists()

        new_state = tmp_path / "new-state" / "deploy.state"
        second = subprocess.Popen(
            command,
            cwd=PROJECT_ROOT,
            env={
                **common_env,
                "LOG_DIR": str(tmp_path / "new-logs"),
                "DEPLOY_STATE_DIR": str(tmp_path / "new-state"),
            },
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
        )
        first.wait(timeout=6)
        assert first.returncode == 143

        deadline = time.monotonic() + 6
        while time.monotonic() < deadline:
            state_lines = (
                new_state.read_text(encoding="utf-8").splitlines() if new_state.exists() else []
            )
            if state_lines and state_lines[0].split("\t")[1] == str(second.pid):
                break
            time.sleep(0.05)
        else:
            raise AssertionError("new deploy did not replace the legacy instance")
        second.send_signal(signal.SIGINT)
        output, _ = second.communicate(timeout=6)
    finally:
        for process in (second, first):
            if process is not None and process.poll() is None:
                process.kill()
                process.wait(timeout=3)

    assert "清理检测到的旧服务" in output
    assert "旧实例已清理" in output
