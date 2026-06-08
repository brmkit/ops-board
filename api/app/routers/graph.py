import json
import uuid

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, field_validator

from .. import storage
from ..auth import get_current_user
from .ws import broadcast

router = APIRouter(prefix="/api/ops", tags=["graph"])

# Upper bounds to keep a single graph (and import) sane. Generous enough for
# real engagements, tight enough to reject junk / accidental huge payloads.
MAX_NODES = 50_000
MAX_EDGES = 100_000
MAX_IMPORT_BYTES = 10 * 1024 * 1024  # 10 MB


class NodeIn(BaseModel):
    # XyFlow nodes carry many fields (position, data, measured, custom type…).
    # We only require a stable id and keep everything else verbatim.
    model_config = ConfigDict(extra="allow")
    id: str


class EdgeIn(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: str
    source: str
    target: str


class GraphPayload(BaseModel):
    nodes: list[NodeIn] = []
    edges: list[EdgeIn] = []

    @field_validator("nodes")
    @classmethod
    def _cap_nodes(cls, v: list) -> list:
        if len(v) > MAX_NODES:
            raise ValueError(f"too many nodes (max {MAX_NODES})")
        return v

    @field_validator("edges")
    @classmethod
    def _cap_edges(cls, v: list) -> list:
        if len(v) > MAX_EDGES:
            raise ValueError(f"too many edges (max {MAX_EDGES})")
        return v

    def as_dicts(self) -> tuple[list[dict], list[dict]]:
        return (
            [n.model_dump() for n in self.nodes],
            [e.model_dump() for e in self.edges],
        )


@router.put("/{ops_id}/graph")
async def save_graph(
    ops_id: str,
    body: GraphPayload,
    user: dict = Depends(get_current_user),
):
    nodes, edges = body.as_dicts()
    data = storage.save_graph(ops_id, nodes, edges)
    if data is None:
        raise HTTPException(status_code=404, detail="operation not found")
    await broadcast(ops_id, {
        "type": "graph",
        "nodes": nodes,
        "edges": edges,
        "by": user["username"],
    })
    return {"ok": True, "updated_at": data["updated_at"]}


@router.get("/{ops_id}/export")
def export_ops(ops_id: str, user: dict = Depends(get_current_user)):
    data = storage.get_ops(ops_id)
    if data is None:
        raise HTTPException(status_code=404, detail="operation not found")
    safe_name = data.get("name", ops_id).replace(" ", "_").replace("/", "_")
    return JSONResponse(
        content=data,
        headers={"Content-Disposition": f'attachment; filename="{safe_name}.json"'},
    )


@router.post("/import", status_code=201)
async def import_ops(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    raw = await file.read()
    if len(raw) > MAX_IMPORT_BYTES:
        raise HTTPException(status_code=413, detail="file too large")
    try:
        incoming = json.loads(raw)
    except Exception:
        raise HTTPException(status_code=400, detail="invalid JSON")
    if not isinstance(incoming, dict):
        raise HTTPException(status_code=400, detail="expected a JSON object")

    # Validate the graph payload, dropping any untrusted fields. Only the
    # known shape (name + validated nodes/edges) is persisted.
    try:
        graph = GraphPayload(
            nodes=incoming.get("nodes", []),
            edges=incoming.get("edges", []),
        )
    except Exception:
        raise HTTPException(status_code=400, detail="invalid graph structure")

    nodes, edges = graph.as_dicts()
    new_id = str(uuid.uuid4())
    now = storage.now_iso()
    name = incoming.get("name")
    if not isinstance(name, str) or not name.strip():
        name = "imported"
    data = {
        "id": new_id,
        "name": name + " (import)",
        "created_at": now,
        "updated_at": now,
        "nodes": nodes,
        "edges": edges,
    }

    storage.save_ops(new_id, data)
    return data
