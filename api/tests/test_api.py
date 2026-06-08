import io
import json


def test_health(client):
    assert client.get("/api/health").json() == {"status": "ok"}


def test_login_wrong_password(client):
    r = client.post("/api/auth/login", json={"username": "admin", "password": "nope"})
    assert r.status_code == 401


def test_register_disabled_by_default(client):
    r = client.post("/api/auth/register", json={"username": "x", "password": "y"})
    assert r.status_code == 403


def test_ops_requires_auth(client):
    assert client.get("/api/ops").status_code == 401  # no bearer -> HTTPBearer rejects


def test_ops_crud(client, auth_headers):
    # create
    r = client.post("/api/ops", json={"name": "op1"}, headers=auth_headers)
    assert r.status_code == 201
    ops_id = r.json()["id"]

    # list
    r = client.get("/api/ops", headers=auth_headers)
    assert any(o["id"] == ops_id for o in r.json())

    # rename
    r = client.patch(f"/api/ops/{ops_id}", json={"name": "op1-renamed"}, headers=auth_headers)
    assert r.json()["name"] == "op1-renamed"

    # delete
    assert client.delete(f"/api/ops/{ops_id}", headers=auth_headers).status_code == 204
    assert client.get(f"/api/ops/{ops_id}", headers=auth_headers).status_code == 404


def test_graph_save_valid(client, auth_headers):
    ops_id = client.post("/api/ops", json={"name": "g"}, headers=auth_headers).json()["id"]
    payload = {
        "nodes": [{"id": "n1", "type": "action", "position": {"x": 1, "y": 2}, "data": {"label": "scan"}}],
        "edges": [{"id": "e1", "source": "n1", "target": "n1"}],
    }
    r = client.put(f"/api/ops/{ops_id}/graph", json=payload, headers=auth_headers)
    assert r.status_code == 200, r.text

    # round-trip: extra fields preserved, structure intact
    data = client.get(f"/api/ops/{ops_id}", headers=auth_headers).json()
    assert data["nodes"][0]["data"]["label"] == "scan"
    assert data["nodes"][0]["position"] == {"x": 1, "y": 2}


def test_graph_save_rejects_node_without_id(client, auth_headers):
    ops_id = client.post("/api/ops", json={"name": "g"}, headers=auth_headers).json()["id"]
    r = client.put(
        f"/api/ops/{ops_id}/graph",
        json={"nodes": [{"position": {"x": 0, "y": 0}}], "edges": []},
        headers=auth_headers,
    )
    assert r.status_code == 422


def test_graph_save_rejects_edge_without_endpoints(client, auth_headers):
    ops_id = client.post("/api/ops", json={"name": "g"}, headers=auth_headers).json()["id"]
    r = client.put(
        f"/api/ops/{ops_id}/graph",
        json={"nodes": [], "edges": [{"id": "e1"}]},
        headers=auth_headers,
    )
    assert r.status_code == 422


def test_import_invalid_json(client, auth_headers):
    f = io.BytesIO(b"not json")
    r = client.post("/api/ops/import", files={"file": ("x.json", f, "application/json")}, headers=auth_headers)
    assert r.status_code == 400


def test_import_strips_untrusted_fields(client, auth_headers):
    blob = {
        "id": "attacker-controlled",
        "name": "imp",
        "nodes": [{"id": "n1", "data": {"label": "x"}}],
        "edges": [],
        "evil": {"backdoor": True},
    }
    f = io.BytesIO(json.dumps(blob).encode())
    r = client.post("/api/ops/import", files={"file": ("x.json", f, "application/json")}, headers=auth_headers)
    assert r.status_code == 201
    out = r.json()
    assert out["id"] != "attacker-controlled"  # server-assigned id
    assert "evil" not in out
    assert out["name"] == "imp (import)"
    assert out["nodes"][0]["id"] == "n1"
