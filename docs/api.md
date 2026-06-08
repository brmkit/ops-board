# API reference

All routes are served under `/api`. Interactive docs are available at `/api/docs` (FastAPI Swagger UI) when the API is running.

Except for login and registration, every endpoint requires a bearer token:

```
Authorization: Bearer <jwt>
```

A request with a missing or expired token returns `401`. The frontend treats a `401` as a signal to clear the stored session and return to the login screen.

## Auth

| Method | Endpoint | Body | Notes |
|--------|----------|------|-------|
| `POST` | `/api/auth/login` | `{ username, password }` | Returns `{ token, username, role }` |
| `POST` | `/api/auth/register` | `{ username, password }` | Disabled unless `OPSBOARD_ALLOW_REGISTER=true`. Creates a `user` role account |

## Users (admin only)

| Method | Endpoint | Body | Notes |
|--------|----------|------|-------|
| `GET` | `/api/users` | | List users (id, username, role, created_at) |
| `POST` | `/api/users` | `{ username, password, role }` | `role` is `admin` or `user` |
| `DELETE` | `/api/users/{user_id}` | | Cannot delete your own account |

## Operations

| Method | Endpoint | Body | Notes |
|--------|----------|------|-------|
| `GET` | `/api/ops` | | List operations (summary with node count), newest first |
| `POST` | `/api/ops` | `{ name }` | Create an empty operation |
| `GET` | `/api/ops/{id}` | | Full operation including nodes and edges |
| `PATCH` | `/api/ops/{id}` | `{ name }` | Rename |
| `DELETE` | `/api/ops/{id}` | | Delete |

## Graph

| Method | Endpoint | Body | Notes |
|--------|----------|------|-------|
| `PUT` | `/api/ops/{id}/graph` | `{ nodes, edges }` | Save the graph, then broadcast it to other connected clients. Returns `{ ok, updated_at }` |
| `GET` | `/api/ops/{id}/export` | | Download the operation as a JSON attachment |
| `POST` | `/api/ops/import` | multipart file | Import a JSON file as a new operation, named with an "import" suffix |

Save and import enforce limits: at most 50,000 nodes, 100,000 edges, and a 10 MB import payload.

## Health

| Method | Endpoint | Notes |
|--------|----------|-------|
| `GET` | `/api/health` | Returns `{ "status": "ok" }`. No auth required |

## WebSocket

```
WS /api/ops/{ops_id}/ws?token=<jwt>
```

The token is passed as a query parameter and validated during the handshake. An invalid token closes the socket with code 4001. The server pushes JSON messages; the client does not need to send anything to receive updates.

Message types:

| Type | Shape | Meaning |
|------|-------|---------|
| `users` | `{ "type": "users", "users": ["alice", "bob"] }` | Current presence list for this operation. Sent on join and on disconnect |
| `graph` | `{ "type": "graph", "nodes": [...], "edges": [...], "by": "alice" }` | A new graph saved by another operator. `by` lets a client ignore the echo of its own save |
</content>
