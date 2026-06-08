import json
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

_ROOT = Path(os.environ.get("OPS_BOARD_DATA_DIR", "./data"))
DATA_DIR = _ROOT / "ops"
_USERS_FILE = _ROOT / "users.json"


# ── users ──────────────────────────────────────────────────────────────────

def _load_users() -> list[dict]:
    if not _USERS_FILE.exists():
        return []
    return json.loads(_USERS_FILE.read_text())


def _save_users(users: list[dict]):
    _USERS_FILE.parent.mkdir(parents=True, exist_ok=True)
    tmp = _USERS_FILE.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(users, indent=2, ensure_ascii=False))
    os.replace(tmp, _USERS_FILE)


def get_user_by_username(username: str) -> Optional[dict]:
    return next((u for u in _load_users() if u["username"] == username), None)


def get_user_by_id(user_id: str) -> Optional[dict]:
    return next((u for u in _load_users() if u["id"] == user_id), None)


def list_users() -> list[dict]:
    return [
        {"id": u["id"], "username": u["username"], "role": u.get("role", "user"), "created_at": u["created_at"]}
        for u in _load_users()
    ]


def create_user(username: str, hashed_password: str, role: str = "user") -> dict:
    users = _load_users()
    user = {
        "id": str(uuid.uuid4()),
        "username": username,
        "hashed_password": hashed_password,
        "role": role,
        "created_at": now_iso(),
    }
    users.append(user)
    _save_users(users)
    return user


def delete_user(user_id: str) -> bool:
    users = _load_users()
    new_users = [u for u in users if u["id"] != user_id]
    if len(new_users) == len(users):
        return False
    _save_users(new_users)
    return True


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def ensure_data_dir():
    DATA_DIR.mkdir(parents=True, exist_ok=True)


def _path(ops_id: str) -> Path:
    return DATA_DIR / f"{ops_id}.json"


def _write(ops_id: str, data: dict):
    ensure_data_dir()
    p = _path(ops_id)
    tmp = p.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(data, indent=2, ensure_ascii=False))
    os.replace(tmp, p)


def save_ops(ops_id: str, data: dict):
    _write(ops_id, data)


def list_ops() -> list[dict]:
    ensure_data_dir()
    result = []
    for f in sorted(DATA_DIR.glob("*.json"), key=lambda p: p.stat().st_mtime, reverse=True):
        try:
            data = json.loads(f.read_text())
            result.append({
                "id": data["id"],
                "name": data["name"],
                "created_at": data["created_at"],
                "updated_at": data["updated_at"],
                "node_count": len(data.get("nodes", [])),
            })
        except Exception:
            pass
    return result


def create_ops(name: str) -> dict:
    ops_id = str(uuid.uuid4())
    now = now_iso()
    data = {
        "id": ops_id,
        "name": name,
        "created_at": now,
        "updated_at": now,
        "nodes": [],
        "edges": [],
    }
    _write(ops_id, data)
    return data


def get_ops(ops_id: str) -> Optional[dict]:
    p = _path(ops_id)
    if not p.exists():
        return None
    return json.loads(p.read_text())


def rename_ops(ops_id: str, name: str) -> Optional[dict]:
    data = get_ops(ops_id)
    if data is None:
        return None
    data["name"] = name
    data["updated_at"] = now_iso()
    _write(ops_id, data)
    return data


def delete_ops(ops_id: str) -> bool:
    p = _path(ops_id)
    if not p.exists():
        return False
    p.unlink()
    return True


def save_graph(ops_id: str, nodes: list, edges: list) -> Optional[dict]:
    data = get_ops(ops_id)
    if data is None:
        return None
    data["nodes"] = nodes
    data["edges"] = edges
    data["updated_at"] = now_iso()
    _write(ops_id, data)
    return data
