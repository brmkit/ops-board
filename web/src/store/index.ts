import { create } from 'zustand'
import {
  type Node,
  type Edge,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  type NodeChange,
  type EdgeChange,
  type Connection,
} from '@xyflow/react'
import { saveGraph } from '../api/client'
import type { Theme } from '../styles/themes'

export type SaveStatus = 'saved' | 'saving' | 'dirty' | 'error'
export type EdgeStyle = 'curved' | 'straight' | 'step'

const EDGE_STYLE_ORDER: EdgeStyle[] = ['curved', 'straight', 'step']

interface BoardStore {
  opsId: string | null
  nodes: Node[]
  edges: Edge[]
  saveStatus: SaveStatus
  editingNodeId: string | null
  theme: Theme
  edgeStyle: EdgeStyle
  connectedUsers: string[]
  remoteUpdatedIds: Set<string>

  loadGraph: (id: string, nodes: Node[], edges: Edge[]) => void
  setEditingNodeId: (id: string | null) => void
  toggleTheme: () => void
  cycleEdgeStyle: () => void
  onNodesChange: (changes: NodeChange[]) => void
  onEdgesChange: (changes: EdgeChange[]) => void
  onConnect: (connection: Connection) => void
  setNodes: (nodes: Node[]) => void
  addNode: (node: Node) => void
  updateNodeData: (id: string, data: Partial<Record<string, unknown>>) => void
  deleteNode: (id: string) => void
  updateEdgeData: (id: string, data: Partial<Record<string, unknown>>) => void
  setConnectedUsers: (users: string[]) => void
  applyRemoteDelta: (nodes: Node[], edges: Edge[]) => void
}

let saveTimer: number | null = null
let highlightTimer: number | null = null

function scheduleSave(getState: () => BoardStore) {
  useBoardStore.setState({ saveStatus: 'dirty' })
  if (saveTimer !== null) clearTimeout(saveTimer)
  saveTimer = window.setTimeout(async () => {
    const { opsId, nodes, edges } = getState()
    if (!opsId) return
    useBoardStore.setState({ saveStatus: 'saving' })
    try {
      await saveGraph(opsId, nodes, edges)
      useBoardStore.setState({ saveStatus: 'saved' })
    } catch {
      useBoardStore.setState({ saveStatus: 'error' })
    }
  }, 800)
}

export const useBoardStore = create<BoardStore>((set, get) => ({
  opsId: null,
  nodes: [],
  edges: [],
  saveStatus: 'saved',
  editingNodeId: null,
  theme: (localStorage.getItem('rb-theme') as Theme) || 'dark',
  edgeStyle: (localStorage.getItem('rb-edge-style') as EdgeStyle) || 'curved',
  connectedUsers: [],
  remoteUpdatedIds: new Set(),

  loadGraph: (id, nodes, edges) => {
    if (saveTimer !== null) { clearTimeout(saveTimer); saveTimer = null }
    if (highlightTimer !== null) { clearTimeout(highlightTimer); highlightTimer = null }
    set({ opsId: id, nodes, edges, saveStatus: 'saved', editingNodeId: null, remoteUpdatedIds: new Set() })
  },

  setEditingNodeId: (id) => set({ editingNodeId: id }),

  toggleTheme: () =>
    set((s) => {
      const next: Theme = s.theme === 'dark' ? 'light' : 'dark'
      localStorage.setItem('rb-theme', next)
      return { theme: next }
    }),

  cycleEdgeStyle: () =>
    set((s) => {
      const i = EDGE_STYLE_ORDER.indexOf(s.edgeStyle)
      const next = EDGE_STYLE_ORDER[(i + 1) % EDGE_STYLE_ORDER.length]
      localStorage.setItem('rb-edge-style', next)
      return { edgeStyle: next }
    }),

  onNodesChange: (changes) => {
    set((s) => ({ nodes: applyNodeChanges(changes, s.nodes) }))
    scheduleSave(get)
  },

  onEdgesChange: (changes) => {
    set((s) => ({ edges: applyEdgeChanges(changes, s.edges) }))
    scheduleSave(get)
  },

  onConnect: (connection) => {
    set((s) => ({
      edges: addEdge(
        { ...connection, type: 'custom', data: { state: 'hypothetical', label: '' } },
        s.edges,
      ),
    }))
    scheduleSave(get)
  },

  setNodes: (nodes) => {
    set({ nodes })
    scheduleSave(get)
  },

  addNode: (node) => {
    set((s) => ({ nodes: [...s.nodes, node] }))
    scheduleSave(get)
  },

  updateNodeData: (id, data) => {
    set((s) => ({
      nodes: s.nodes.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, ...data } } : n,
      ),
    }))
    scheduleSave(get)
  },

  deleteNode: (id) => {
    set((s) => ({
      nodes: s.nodes.filter((n) => n.id !== id),
      edges: s.edges.filter((e) => e.source !== id && e.target !== id),
    }))
    scheduleSave(get)
  },

  updateEdgeData: (id, data) => {
    set((s) => ({
      edges: s.edges.map((e) =>
        e.id === id ? { ...e, data: { ...e.data, ...data } } : e,
      ),
    }))
    scheduleSave(get)
  },

  setConnectedUsers: (users) => set({ connectedUsers: users }),

  applyRemoteDelta: (nodes, edges) => {
    const { nodes: local } = get()
    const localMap = new Map(local.map((n) => [n.id, n]))
    const highlighted = new Set<string>()
    for (const n of nodes) {
      const prev = localMap.get(n.id)
      if (!prev) {
        highlighted.add(n.id)
      } else if (
        JSON.stringify(prev.data) !== JSON.stringify(n.data) ||
        prev.position.x !== n.position.x ||
        prev.position.y !== n.position.y
      ) {
        highlighted.add(n.id)
      }
    }
    if (highlightTimer !== null) clearTimeout(highlightTimer)
    set({ nodes, edges, remoteUpdatedIds: highlighted })
    highlightTimer = window.setTimeout(() => { set({ remoteUpdatedIds: new Set() }); highlightTimer = null }, 2000)
  },
}))
