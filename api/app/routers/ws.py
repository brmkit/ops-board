import json
from collections import defaultdict

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from ..auth import decode_token

router = APIRouter(tags=["ws"])

_connections: dict[str, set[WebSocket]] = defaultdict(set)


def get_connected_usernames(ops_id: str) -> list[str]:
    # Dedupe: a user with multiple tabs holds multiple sockets but should
    # appear once in the presence list. dict.fromkeys preserves order.
    return list(dict.fromkeys(ws.state.username for ws in _connections[ops_id]))


async def broadcast(ops_id: str, payload: dict, exclude: WebSocket | None = None):
    dead = set()
    for ws in list(_connections[ops_id]):
        if ws is exclude:
            continue
        try:
            await ws.send_text(json.dumps(payload))
        except Exception:
            dead.add(ws)
    _connections[ops_id] -= dead


@router.websocket("/api/ops/{ops_id}/ws")
async def ws_endpoint(ops_id: str, websocket: WebSocket, token: str = ""):
    payload = decode_token(token)
    if payload is None:
        await websocket.close(code=4001)
        return

    await websocket.accept()
    websocket.state.username = payload["username"]
    _connections[ops_id].add(websocket)

    # notify everyone (including new joiner) of current user list
    await broadcast(ops_id, {
        "type": "users",
        "users": get_connected_usernames(ops_id),
    })

    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        _connections[ops_id].discard(websocket)
        await broadcast(ops_id, {
            "type": "users",
            "users": get_connected_usernames(ops_id),
        })
