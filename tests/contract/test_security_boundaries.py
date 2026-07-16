from pathlib import Path

REPOSITORY_ROOT = Path(__file__).resolve().parents[2]


def test_learner_frontend_does_not_import_control_surface() -> None:
    learner_root = REPOSITORY_ROOT / "apps/learner-web"
    forbidden_imports = (
        "control-cockpit",
        "control-api",
        "binnagent_api.auth",
        "X-BinnAgent-Control-Role",
    )
    violations: list[str] = []
    source_roots = (learner_root / "app", learner_root / "lib", learner_root / "src")
    for source_root in source_roots:
        if not source_root.exists():
            continue
        for path in source_root.rglob("*"):
            if not path.is_file() or path.suffix not in {".ts", ".tsx", ".js", ".mjs"}:
                continue
            text = path.read_text(encoding="utf-8")
            for marker in forbidden_imports:
                if marker in text:
                    violations.append(f"{path.relative_to(REPOSITORY_ROOT)} contains {marker}")
    assert violations == []


def test_browser_environment_variables_are_allowlisted() -> None:
    env_lines = (REPOSITORY_ROOT / ".env.example").read_text(encoding="utf-8").splitlines()
    public_names = {
        line.split("=", 1)[0]
        for line in env_lines
        if line.startswith("NEXT_PUBLIC_") and "=" in line
    }
    assert public_names == {
        "NEXT_PUBLIC_LEARNER_API_BASE_URL",
        "NEXT_PUBLIC_CONTROL_API_BASE_URL",
    }
