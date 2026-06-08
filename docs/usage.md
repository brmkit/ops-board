# Using the board

This document covers the operator-facing behavior: how you build a graph, what the toolbar does, and how collaboration works.

## Operations list

After logging in you land on the operations list, ordered by last modified. From here you can:

- Create a new operation by name
- Rename an operation inline
- Delete an operation (with confirmation)
- Export an operation as a JSON file
- Import an operation from a JSON file (creates a new operation with an "import" suffix)
- See the node count per operation
- Open an operation, which takes you to its canvas

The active operation is reflected in the URL hash, so browser back and forward move between the canvas and the list.

## Canvas interactions

The graph is built live on the canvas. Most actions are driven by right-click.

| Action | Result |
|--------|--------|
| Right-click on the canvas | Open a menu to add a node of any type at the cursor |
| Right-click on a node | Add a child node below it, pre-connected by an edge |
| Right-click on an edge | Change the edge state |
| Left-click on a node or edge | Open the side panel to edit it |
| Click a node label | Rename it inline |
| Drag between handles | Create a manual edge between two nodes |
| `Delete` or `Backspace` | Delete the selected node or edge |

Deleting a node that has children opens a confirmation modal that requires typing `delete`, because removing it also removes every connected edge. Deleting a leaf node only asks for a simple confirmation.

When you add a child node from a node's context menu, the new edge starts as `hypothetical` and the new node opens directly in inline rename so you can name it without an extra click.

## Toolbar

The toolbar runs across the top of the canvas.

- **Back to ops**: return to the operations list.
- **Operation name**: the current operation.
- **Save status**: a colored dot and label showing `synced`, `syncing`, `pending`, or `error`. See auto-save below.
- **Operational summary**: chips that appear when relevant, counting open findings, open questions, and blocked edges, so the state of the operation is visible at a glance.
- **Connected users**: a chip per operator currently on this operation. Your own chip is highlighted.
- **Search**: filters nodes by label, notes, or tags. Non-matching nodes are faded rather than hidden, so the shape of the graph is preserved.
- **Edge style**: cycles the edge routing between curved, straight, and step. The choice is saved in local storage.
- **Align**: a non-destructive tidy. It snaps nodes that are roughly in the same column or row onto a shared coordinate and spaces them evenly, using the graph's own median gap. It never changes the relative order of nodes, so your manual hierarchy is preserved.
- **Export**: download the current operation as JSON or as a rendered SVG of the graph. File names include the operation name and a timestamp.
- **Theme**: toggle dark and light, saved in local storage.
- **Logout**: clear the session and return to login.

## Type filter

A filter panel sits at the bottom left of the canvas. Each node type has a chip showing its live count. Clicking a chip hides or shows all nodes of that type, so you can focus on, for example, only credentials and identities. A reset control appears once any type is hidden.

## Auto-save

Every change to the graph marks the board `pending`, then after an 800 ms pause the full graph is sent to the backend (`syncing`), and on success the status becomes `synced`. A failed save shows `error`. There is no explicit save button; the debounce coalesces rapid edits into a single write.

## Real-time collaboration

Multiple operators can open the same operation at once.

- On open, the client connects a WebSocket scoped to that operation, authenticated with the JWT.
- The connected user list in the toolbar updates as operators join and leave. A user with several tabs still appears once.
- When you save, the backend broadcasts the new graph to everyone else on the same operation. Their boards update in place, and nodes that an operator just created or changed are briefly outlined for about two seconds so the change is noticeable without interrupting local work.
- Conflict handling is last-write-wins: whoever saves last overwrites. This is intentional for the current scope.
- If the socket drops, the client reconnects automatically after a few seconds.
</content>
