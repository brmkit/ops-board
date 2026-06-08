# ops-board documentation

ops-board is a shared, live graph for red team operations. Every host, identity, credential, finding, and open question becomes a node on a canvas; the relations between them become edges that carry state. The model is built and updated as the engagement progresses, so a discovery made on day one is still on the board, with its context, when a later discovery connects to it.

This folder explains both the idea behind the tool and how the running system is put together.

## Where to start

| Document | What it covers |
|----------|----------------|
| [obsessed with graphs](https://brmk.me/posts/obsessed-with-graphs) | The reasoning behind the tool: why operations are graphs, not sequences, and what a live shared model buys you. Read this first if you want the "why". |
| [data-model.md](data-model.md) | Node types, node states, edge states, and the on-disk JSON shape. The vocabulary of the board. |
| [usage.md](usage.md) | How to drive the board: canvas interactions, the toolbar, search and filters, export, auto-save, and real-time collaboration. |
| [architecture.md](architecture.md) | How the system is built: containers, frontend, backend, storage, authentication, and the real-time layer. |
| [api.md](api.md) | The REST and WebSocket reference for the backend. |

## One-paragraph summary

The frontend is a React single-page app (XyFlow canvas, Zustand state, Tailwind) served as static files by nginx. The backend is a FastAPI service that persists each operation as a single JSON file on disk, with no database. The two run as separate containers behind one exposed port. Authentication is JWT based with bcrypt password hashing and two roles (admin and user). Multiple operators can open the same operation at once: changes are saved with an 800 ms debounce and broadcast over a WebSocket to everyone else on that operation, with a connected user list and a brief highlight on nodes another operator just touched.

## Quick start

From the repository root:

```bash
docker-compose up -d --build
```

Open `http://localhost:8080`. On the very first start, when no users exist yet, the API creates an `admin` account with a random password and prints it to the container logs (`docker-compose logs api`). See the root `README.md` for first launch details and environment configuration.
</content>
