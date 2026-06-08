# Data model

The board is a directed graph. Nodes are the things you discover during an engagement; edges are the relations between them. Both nodes and edges carry a state that captures where they are in the operation, not just what they are.

## Node types

Each node has a type. The type is fixed at creation (chosen from the context menu) and drives the node's color and glyph.

| Type | Glyph | Represents |
|------|-------|------------|
| `action` | A | An action taken or planned: a technique, a step, a maneuver |
| `host` | H | Servers, endpoints, network infrastructure, exposed services |
| `identity` | I | Users, accounts, service accounts, machine identities |
| `credential` | C | Passwords, tokens, API keys, certificates, SSH keys |
| `finding` | F | Vulnerabilities, misconfigurations, items of interest |
| `question` | ? | Open hypotheses, unexplored leads, things still to close |

The `question` type matters as much as the others. An unresolved lead is a real node on the board, not a note that gets lost. It stays visible until you close it, and a later discovery can connect straight to it.

## Node states

State is independent of type. It tells you what is happening with the node right now, and it changes the way the node is drawn.

| State | Meaning | Visual cue |
|-------|---------|------------|
| `active` | Accessible, currently being worked | Full opacity |
| `dormant` | Discovered but blocked or waiting | Reduced opacity |
| `burned` | Compromised or detected by defenders | Red tint on the node body |
| `done` | Objective completed, archived | Strongly faded |

A node set to `dormant` does not disappear. It stays on the board, dimmed, carrying the constraint that is blocking it, until something changes that constraint.

## Edge states

Edges carry state too. This is the core of the idea: a connection is not just "these two things are related", it is "this relation is confirmed", or "suspected but unverified", or "tried and blocked".

| State | Meaning | Default |
|-------|---------|---------|
| `confirmed` | Verified relation | |
| `hypothetical` | Suspected, not yet verified | yes |
| `blocked` | A path that exists but is not traversable | |
| `interrupted` | Attempted and interrupted, to be resumed | |

New edges start as `hypothetical`. You promote an edge to `confirmed` once you have verified it, mark it `blocked` when a path exists but cannot be used right now, or `interrupted` when you started down it and had to stop.

## On-disk shape

Each operation is one JSON file at `./data/ops/{uuid}.json`:

```json
{
  "id": "uuid",
  "name": "Operation name",
  "created_at": "ISO8601",
  "updated_at": "ISO8601",
  "nodes": [],
  "edges": []
}
```

`nodes` and `edges` store the XyFlow graph almost verbatim. The backend only requires a stable `id` on each node and `id`, `source`, `target` on each edge; every other field (position, type, and the `data` object holding label, status, tags, notes, and authorship) is kept as is. This keeps the storage layer decoupled from the exact shape of the frontend graph.

### Node data fields

The interesting per-node content lives under `data`:

| Field | Purpose |
|-------|---------|
| `label` | The node name, shown on the canvas |
| `status` | One of the node states above |
| `tags` | Free-form labels, shown as chips and searchable |
| `notes` | Free text, searchable |
| `_created_by` | Username of the operator who created the node |
| `_created_at` | ISO timestamp of creation |

The `_created_by` and `_created_at` fields are attribution metadata. They are set on the client when a node is created and travel with the node through saves and real-time broadcasts.

### Writes are atomic

Every save writes to a temporary file and then calls `os.replace()`, so a graph file is never left half-written even if the process dies mid-write. The same pattern protects the users file.
</content>
