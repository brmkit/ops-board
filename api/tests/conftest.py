import importlib
import sys

import pytest


@pytest.fixture()
def client(tmp_path, monkeypatch):
    """A TestClient backed by a fresh temp data dir and a known admin user.

    The app resolves its JWT secret and seeds the initial admin at import
    time, so env vars must be set before (re)importing the app modules.
    """
    monkeypatch.setenv("OPS_BOARD_DATA_DIR", str(tmp_path))
    monkeypatch.setenv("OPSBOARD_SECRET", "test-secret-not-the-placeholder")
    monkeypatch.setenv("OPSBOARD_INIT_USER", "admin")
    monkeypatch.setenv("OPSBOARD_INIT_PASSWORD", "adminpass")
    monkeypatch.setenv("OPSBOARD_ALLOW_REGISTER", "false")

    # Drop any already-imported app modules so they re-read the env above.
    for name in list(sys.modules):
        if name == "app" or name.startswith("app."):
            del sys.modules[name]

    from fastapi.testclient import TestClient

    main = importlib.import_module("app.main")
    return TestClient(main.app)


@pytest.fixture()
def auth_headers(client):
    r = client.post("/api/auth/login", json={"username": "admin", "password": "adminpass"})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['token']}"}
