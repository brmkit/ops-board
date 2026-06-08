# Architecture

**ops-board** is two containers behind one exposed port, with no database. State lives in JSON files on a mounted volume.

```
+-----------------------------------------+
|  Browser                                |
|  React 18 + Vite + XyFlow               |
|  Zustand (state) + Tailwind CSS         |
|  served on port 8080                    |
+--------------------+--------------------+
                     |  HTTP /api/*  and  WS /api/ops/{id}/ws
                     |  (reverse-proxied by nginx)
+--------------------v--------------------+
|  FastAPI + Uvicorn                      |
|  Python 3.12                            |
|  port 8000 (internal)                   |
+--------------------+--------------------+
                     |
+--------------------v--------------------+
|  ./data                                 |
|    ops/*.json   one file per operation  |
|    users.json   accounts                |
|    .secret      generated JWT key       |
|  (Docker volume)                        |
+-----------------------------------------+
```

## Containers

Two services defined in `docker-compose.yml`:

- **web**: builds `./web`, serves the compiled React app with nginx, and reverse-proxies `/api/*` (including the WebSocket upgrade) to the API. This is the only service that exposes a port to the host (`8080`).
- **api**: builds `./api`, runs FastAPI under Uvicorn, and mounts `./data` as a volume so operations and users persist across restarts.

Because nginx serves the frontend and proxies the API, the browser talks to a single origin. No cross-origin configuration is needed in production. For local development against a separate dev server, `OPSBOARD_CORS_ORIGINS` enables CORS for an explicit list of origins.

## Frontend

A single-page React app. The entry point (`App.tsx`) is a small router driven by the URL hash and an auth flag:

- No token: render the login page.
- Token but no active operation: render the operations list.
- Token and an active operation in the hash: render the board.

Key pieces:

| Area | File | Role |
|------|------|------|
| Login | `pages/Login.tsx` | Authenticate, store the token |
| Operations list | `pages/OpsList.tsx` | Create, rename, delete, import, export, open |
| Board | `pages/OpsBoard.tsx` | The XyFlow canvas and all canvas interactions |
| State | `store/index.ts` | Zustand store: nodes, edges, save status, theme, presence |
| API client | `api/client.ts` | Fetch wrapper, token handling, all REST calls |
| WebSocket | `hooks/useWs.ts` | Per-operation socket, reconnect, message dispatch |
| Node rendering | `components/NodeTypes.tsx` | Custom node, glyph, color, status styling |
| Edge rendering | `components/EdgeTypes.tsx` | Custom edge styling per state |
| Layout | `lib/layout.ts` | Non-destructive align and even spacing |
| Toolbar | `components/Toolbar.tsx` | Save status, summary, presence, search, export |
| Side panels | `components/NodeDrawer.tsx`, `EdgeDrawer.tsx` | Editing forms |
| Context menus | `components/ContextMenu.tsx` | Right-click menus |

The Zustand store is the single source of truth for the graph. Local edits and remote updates received over the WebSocket both flow through it using the same XyFlow change APIs, so there is one code path for applying changes regardless of origin. SVG export is generated on the client from the current node and edge positions.

## Backend

FastAPI, organized into routers under `api/app/routers`:

| Router | Prefix | Responsibility |
|--------|--------|----------------|
| `auth` | `/api/auth` | Login and (optional) registration |
| `users` | `/api/users` | User administration, admin only |
| `ops` | `/api/ops` | Operation lifecycle: list, create, get, rename, delete |
| `graph` | `/api/ops` | Save graph, export, import |
| `ws` | `/api/ops/{id}/ws` | Real-time WebSocket per operation |

`storage.py` is the only module that touches disk. It loads and saves operations and users, generates UUIDs and timestamps, and performs the atomic temp-file plus `os.replace()` writes. There is no ORM and no database; the file system is the store.

## Authentication

JWT based, stateless. `auth.py` resolves the signing secret, issues and verifies tokens, and exposes two FastAPI dependencies: `get_current_user` for any authenticated route and `require_admin` for administrative routes.

- Passwords are hashed with bcrypt (via a small wrapper in `auth.py`).
- Tokens are signed HS256 and carry the user id, username, and role, with an expiry controlled by `OPSBOARD_TOKEN_HOURS` (default 8).
- The signing secret comes from `OPSBOARD_SECRET`. If that is unset or left as the compose placeholder, a random secret is generated once and stored at `./data/.secret` so tokens survive restarts. Set it explicitly in production.
- Two roles exist: `admin` and `user`. Only admins can list, create, and delete users. Admins cannot delete their own account.

First-launch behavior: if `OPSBOARD_INIT_USER` and `OPSBOARD_INIT_PASSWORD` are set, that admin is created. Otherwise, if no users exist at all, an `admin` account with a random 20-character password is created and printed to the logs.

## Real-time layer

The WebSocket router keeps an in-memory map of operation id to the set of connected sockets. On connect, the token is validated during the handshake (an invalid token closes the socket with code 4001), the socket joins its operation's set, and a presence message with the current user list is broadcast to everyone on that operation.

When a graph is saved over REST, the `graph` router persists it and then calls the same `broadcast` helper to push the new graph to every other connected client on that operation. The sender is identified by username so clients can ignore the echo of their own save. Presence is recomputed and rebroadcast on disconnect. Because the connection map is in process memory, it resets if the API restarts; clients reconnect and re-announce automatically.

## Limits

The graph save and import endpoints cap input to keep a single operation sane: at most 50,000 nodes, 100,000 edges, and a 10 MB import payload. Imports are validated against the known graph shape and any unknown top-level fields are dropped before the operation is persisted.
</content>
