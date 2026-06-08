import os
import secrets
import string

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routers import ops, graph
from .routers import auth as auth_router
from .routers import ws as ws_router
from .routers import users as users_router
from . import storage
from .auth import _pwd  # noqa: F401 — importing resolves the JWT secret at startup

_init_user = os.environ.get("OPSBOARD_INIT_USER", "")
_init_pass = os.environ.get("OPSBOARD_INIT_PASSWORD", "")

if _init_user and _init_pass:
    if not storage.get_user_by_username(_init_user):
        storage.create_user(_init_user, _pwd.hash(_init_pass), role="admin")
        print(f"INFO: created initial admin user '{_init_user}'")
elif not storage.list_users():
    _alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    _auto_pass = "".join(secrets.choice(_alphabet) for _ in range(20))
    storage.create_user("admin", _pwd.hash(_auto_pass), role="admin")
    print("=" * 60)
    print("  FIRST LAUNCH — admin account created")
    print(f"  username : admin")
    print(f"  password : {_auto_pass}")
    print("  Change these credentials after your first login.")
    print("=" * 60)

app = FastAPI(title="ops-board", docs_url="/api/docs", redoc_url=None)

# Frontend and API are served from the same origin behind nginx, so no
# cross-origin access is needed in production. For local dev (e.g. the Vite
# dev server on another port) set OPSBOARD_CORS_ORIGINS to a comma-separated
# list of allowed origins. Default: none (same-origin only).
_cors_origins = [
    o.strip()
    for o in os.environ.get("OPSBOARD_CORS_ORIGINS", "").split(",")
    if o.strip()
]
if _cors_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=_cors_origins,
        allow_methods=["*"],
        allow_headers=["*"],
        allow_credentials=True,
    )

app.include_router(auth_router.router)
app.include_router(users_router.router)
app.include_router(ops.router)
app.include_router(graph.router)
app.include_router(ws_router.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}
