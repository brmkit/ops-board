import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlowProvider,
  useReactFlow,
  type Node,
  type Edge,
  type NodeMouseHandler,
  type EdgeMouseHandler,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { getOps, downloadBlob } from '../api/client'
import { useBoardStore } from '../store'
import { useTokens } from '../styles/themes'
import { nodeTypes, nodeColor, TYPE_CONFIG } from '../components/NodeTypes'
import { edgeTypes } from '../components/EdgeTypes'
import NodeDrawer from '../components/NodeDrawer'
import EdgeDrawer from '../components/EdgeDrawer'
import Toolbar from '../components/Toolbar'
import ContextMenu, { type CtxMenuState } from '../components/ContextMenu'
import { Logo, Corners, Kicker } from '../components/ui'
import { useWs, type WsGraphMessage } from '../hooks/useWs'
import { getUsername } from '../api/client'
import { alignNodes } from '../lib/layout'

const NODE_W = 160
const NODE_H = 52

function escXml(s: string): string {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function nodeExitPoint(cx: number, cy: number, tx: number, ty: number): [number, number] {
  const dx = tx - cx, dy = ty - cy
  if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return [cx, cy]
  const sx = Math.abs(dx) > 0 ? (NODE_W / 2) / Math.abs(dx) : Infinity
  const sy = Math.abs(dy) > 0 ? (NODE_H / 2) / Math.abs(dy) : Infinity
  const s = Math.min(sx, sy)
  return [cx + dx * s, cy + dy * s]
}

function generateSvg(nodes: Node[], edges: Edge[], opsName: string): string {
  if (!nodes.length) return `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="60"><rect width="200" height="60" fill="#0f0f1a"/><text x="100" y="35" fill="#6b7280" font-family="monospace" font-size="12" text-anchor="middle">empty graph</text></svg>`

  const PAD = 60
  const xs = nodes.map((n) => n.position.x)
  const ys = nodes.map((n) => n.position.y)
  const ox = Math.min(...xs) - PAD
  const oy = Math.min(...ys) - PAD
  const W = Math.max(...xs) + NODE_W + PAD - ox
  const H = Math.max(...ys) + NODE_H + PAD - oy + 24

  const nodeMap = new Map(nodes.map((n) => ({
    id: n.id,
    cx: n.position.x - ox + NODE_W / 2,
    cy: n.position.y - oy + NODE_H / 2,
    node: n,
  })).map((e) => [e.id, e]))

  const defs = `<defs>
    <marker id="a-c" markerWidth="7" markerHeight="7" refX="5" refY="2.5" orient="auto"><path d="M0,0 L0,5 L7,2.5 z" fill="#10b981"/></marker>
    <marker id="a-h" markerWidth="7" markerHeight="7" refX="5" refY="2.5" orient="auto"><path d="M0,0 L0,5 L7,2.5 z" fill="#6b7280"/></marker>
    <marker id="a-b" markerWidth="7" markerHeight="7" refX="5" refY="2.5" orient="auto"><path d="M0,0 L0,5 L7,2.5 z" fill="#ef4444"/></marker>
  </defs>`

  const edgesSvg = edges.map((e) => {
    const src = nodeMap.get(e.source)
    const tgt = nodeMap.get(e.target)
    if (!src || !tgt) return ''
    const state = (e.data?.state as string) ?? 'hypothetical'
    const color = state === 'confirmed' ? '#10b981' : state === 'blocked' ? '#ef4444' : '#6b7280'
    const markerId = state === 'confirmed' ? 'a-c' : state === 'blocked' ? 'a-b' : 'a-h'
    const dash = state === 'hypothetical' ? ' stroke-dasharray="5,4"' : state === 'blocked' ? ' stroke-dasharray="2,4"' : ''
    const [x1, y1] = nodeExitPoint(src.cx, src.cy, tgt.cx, tgt.cy)
    const [x2, y2] = nodeExitPoint(tgt.cx, tgt.cy, src.cx, src.cy)
    const edgeLabel = (e.data?.label as string) ?? ''
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2
    return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${color}" stroke-width="1.5"${dash} marker-end="url(#${markerId})"/>` +
      (edgeLabel ? `<text x="${mx.toFixed(1)}" y="${(my - 5).toFixed(1)}" fill="${color}" font-family="monospace" font-size="8" text-anchor="middle">${escXml(edgeLabel)}</text>` : '')
  }).join('\n    ')

  const nodesSvg = nodes.map((n) => {
    const cfg = TYPE_CONFIG[n.type ?? 'host'] ?? { color: '#888', glyph: '[?]' }
    const color = cfg.color
    const glyph = cfg.glyph
    const label = escXml((n.data.label as string) ?? '')
    const status = (n.data.status as string) ?? 'active'
    const tags = ((n.data.tags as string[]) ?? []).slice(0, 3).map(escXml)
    const x = (n.position.x - ox).toFixed(1)
    const y = (n.position.y - oy).toFixed(1)
    const strokeDash = status === 'dormant' ? ' stroke-dasharray="4,3"' : ''
    const opacity = status === 'done' ? ' opacity="0.4"' : ''
    return `<g${opacity}>
      <rect x="${x}" y="${y}" width="${NODE_W}" height="${NODE_H}" fill="#111827" stroke="${color}" stroke-width="1"${strokeDash}/>
      <text x="${+x + 8}" y="${+y + 17}" fill="${color}" font-family="monospace" font-size="9" font-weight="bold">${glyph}</text>
      <text x="${+x + 28}" y="${+y + 17}" fill="#e2e8f0" font-family="monospace" font-size="10" font-weight="600">${label}</text>
      ${tags.length ? `<text x="${+x + 8}" y="${+y + 32}" fill="#6b7280" font-family="monospace" font-size="8">${tags.join('  ')}</text>` : ''}
      <text x="${+x + 8}" y="${+y + 46}" fill="#4b5563" font-family="monospace" font-size="8">${status}</text>
    </g>`
  }).join('\n    ')

  const ts = new Date().toISOString().slice(0, 10)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  ${defs}
  <rect width="${W}" height="${H}" fill="#0f0f1a"/>
  ${edgesSvg}
  ${nodesSvg}
  <text x="${(W / 2).toFixed(1)}" y="${(H - 6).toFixed(1)}" fill="#374151" font-family="monospace" font-size="9" text-anchor="middle">${escXml(opsName)} · ${ts}</text>
</svg>`
}

function makeNodeData(type: string) {
  return { label: type, tags: [], notes: '', status: 'active', _created_by: getUsername(), _created_at: new Date().toISOString() }
}

function matchesSearch(node: Node, q: string): boolean {
  const lq = q.toLowerCase()
  const d = node.data as Record<string, unknown>
  return (
    ((d.label as string) ?? '').toLowerCase().includes(lq) ||
    ((d.notes as string) ?? '').toLowerCase().includes(lq) ||
    ((d.tags as string[]) ?? []).some((t) => t.toLowerCase().includes(lq))
  )
}

interface Props {
  opsId: string
  onClose: () => void
  onLogout: () => void
}

function BoardInner({ opsId, onClose, onLogout }: Props) {
  const t = useTokens()
  const { fitView, screenToFlowPosition } = useReactFlow()
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, loadGraph, addNode, updateEdgeData, applyRemoteDelta, setConnectedUsers, connectedUsers } = useBoardStore()

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null)
  const [ctxMenu, setCtxMenu] = useState<CtxMenuState | null>(null)
  const [search, setSearch] = useState('')
  const [opsName, setOpsName] = useState('')
  const [deleteModal, setDeleteModal] = useState<{ nodeId: string; hasChildren: boolean } | null>(null)
  const [deleteInput, setDeleteInput] = useState('')
  const [hiddenTypes, setHiddenTypes] = useState<Set<string>>(new Set())
  const [loaded, setLoaded] = useState(false)
  const deleteInputRef = useRef<HTMLInputElement>(null)

  const typeCounts = useMemo(() => {
    const c: Record<string, number> = {}
    for (const n of nodes) { const ty = n.type ?? 'host'; c[ty] = (c[ty] ?? 0) + 1 }
    return c
  }, [nodes])

  const summary = useMemo(() => ({
    findings: nodes.filter((n) => n.type === 'finding' && (n.data?.status as string) !== 'done').length,
    questions: nodes.filter((n) => n.type === 'question' && (n.data?.status as string) !== 'done').length,
    blocked: edges.filter((e) => (e.data?.state as string) === 'blocked').length,
  }), [nodes, edges])

  const toggleType = useCallback((ty: string) => {
    setHiddenTypes((prev) => {
      const next = new Set(prev)
      if (next.has(ty)) next.delete(ty); else next.add(ty)
      return next
    })
  }, [])

  const handleAutoLayout = useCallback(() => {
    const { nodes: ns, edges: es, setNodes } = useBoardStore.getState()
    if (ns.length < 2) return
    setNodes(alignNodes(ns, es))
    setTimeout(() => fitView({ padding: 0.2, duration: 400 }), 60)
  }, [fitView])

  const handleExport = useCallback(async (format: 'json' | 'svg') => {
    const slug = opsName.replace(/\s+/g, '_') || opsId
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const base = `${slug}_${ts}`
    if (format === 'json') {
      const data = await getOps(opsId)
      downloadBlob(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), `${base}.json`)
    } else {
      const { nodes, edges } = useBoardStore.getState()
      const svg = generateSvg(nodes, edges, opsName)
      downloadBlob(new Blob([svg], { type: 'image/svg+xml' }), `${base}.svg`)
    }
  }, [opsId, opsName])

  const handleWsGraph = useCallback((msg: WsGraphMessage) => {
    if (msg.by === getUsername()) return  // ignore own broadcasts
    applyRemoteDelta(msg.nodes as Node[], msg.edges as Parameters<typeof applyRemoteDelta>[1])
  }, [applyRemoteDelta])

  useWs(opsId, { onGraph: handleWsGraph, onUsers: setConnectedUsers })

  useEffect(() => {
    getOps(opsId).then((data) => {
      setOpsName(data.name)
      const loadedNodes = ((data.nodes ?? []) as Node[]).map((n: Node) => ({
        ...n,
        type: (n.type as string) || 'host',
      }))
      const loadedEdges = ((data.edges ?? []) as Record<string, unknown>[]).map((e) => ({
        ...e,
        type: 'custom',
      }))
      loadGraph(opsId, loadedNodes, loadedEdges as Parameters<typeof loadGraph>[2])
      setLoaded(true)
      setTimeout(() => fitView({ padding: 0.15 }), 150)
    })
  }, [opsId])

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) ?? null
  const selectedEdge = selectedEdgeId ? edges.find((e) => e.id === selectedEdgeId) ?? null : null

  const handleDeleteKey = useCallback((e: React.KeyboardEvent | KeyboardEvent) => {
    if (e.key !== 'Delete' && e.key !== 'Backspace') return
    const tag = (e.target as HTMLElement).tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement).isContentEditable) return
    e.preventDefault()
    if (selectedEdgeId) {
      useBoardStore.getState().onEdgesChange([{ type: 'remove', id: selectedEdgeId }])
      setSelectedEdgeId(null)
      return
    }
    if (!selectedNodeId) return
    const hasChildren = edges.some((edge) => edge.source === selectedNodeId)
    setDeleteModal({ nodeId: selectedNodeId, hasChildren })
    setDeleteInput('')
  }, [selectedNodeId, selectedEdgeId, edges])

  useEffect(() => {
    if (deleteModal?.hasChildren && deleteInputRef.current) {
      deleteInputRef.current.focus()
    }
  }, [deleteModal])

  const confirmDelete = useCallback(() => {
    if (!deleteModal) return
    const { deleteNode } = useBoardStore.getState()
    deleteNode(deleteModal.nodeId)
    setSelectedNodeId(null)
    setDeleteModal(null)
    setDeleteInput('')
  }, [deleteModal])

  const remoteUpdatedIds = useBoardStore((s) => s.remoteUpdatedIds)

  const displayNodes = nodes.map((n) => {
    const highlighted = remoteUpdatedIds.has(n.id)
    const dimmed = search.trim() && !matchesSearch(n, search)
    return {
      ...n,
      hidden: hiddenTypes.has(n.type ?? 'host'),
      style: {
        ...n.style,
        opacity: dimmed ? 0.08 : 1,
        ...(highlighted ? { outline: `2px solid ${t.info}`, outlineOffset: 2, borderRadius: 11 } : {}),
      },
    }
  })

  const onNodeClick: NodeMouseHandler = useCallback((_evt, node) => {
    setSelectedNodeId(node.id)
    setSelectedEdgeId(null)
    setCtxMenu(null)
  }, [])

  const onEdgeClick: EdgeMouseHandler = useCallback((_evt, edge) => {
    setSelectedEdgeId(edge.id)
    setSelectedNodeId(null)
    setCtxMenu(null)
  }, [])

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null)
    setSelectedEdgeId(null)
    setCtxMenu(null)
    useBoardStore.getState().setEditingNodeId(null)
  }, [])

  const onPaneContextMenu = useCallback(
    (e: MouseEvent | React.MouseEvent) => {
      e.preventDefault()
      const flowPos = screenToFlowPosition({ x: e.clientX, y: e.clientY })
      setCtxMenu({
        mode: 'pane',
        screenX: e.clientX,
        screenY: e.clientY,
        flowX: flowPos.x,
        flowY: flowPos.y,
      })
    },
    [screenToFlowPosition],
  )

  const onEdgeContextMenu: EdgeMouseHandler = useCallback(
    (e, edge) => {
      e.preventDefault()
      e.stopPropagation()
      setCtxMenu({
        mode: 'edge',
        screenX: e.clientX,
        screenY: e.clientY,
        edgeId: edge.id,
        currentState: (edge.data?.state as string) ?? 'hypothetical',
      })
    },
    [],
  )

  const onNodeContextMenu: NodeMouseHandler = useCallback(
    (e, node) => {
      e.preventDefault()
      e.stopPropagation()
      const pos = node.position
      setCtxMenu({
        mode: 'node',
        screenX: e.clientX,
        screenY: e.clientY,
        nodeId: node.id,
        nodeX: pos.x,
        nodeY: pos.y,
      })
    },
    [],
  )

  const handleCtxSelect = useCallback(
    (type: string) => {
      if (!ctxMenu) return
      const newId = crypto.randomUUID()

      if (ctxMenu.mode === 'edge') {
        updateEdgeData(ctxMenu.edgeId, { state: type })
        return
      }

      if (ctxMenu.mode === 'pane') {
        addNode({ id: newId, type, position: { x: ctxMenu.flowX, y: ctxMenu.flowY }, data: makeNodeData(type) })
      } else {
        const jitter = (Math.random() - 0.5) * 80
        addNode({ id: newId, type, position: { x: ctxMenu.nodeX + jitter, y: ctxMenu.nodeY + 140 }, data: makeNodeData(type) })
        useBoardStore.getState().onConnect({ source: ctxMenu.nodeId, target: newId, sourceHandle: null, targetHandle: null })
      }
      setSelectedNodeId(newId)
      useBoardStore.getState().setEditingNodeId(newId)
    },
    [ctxMenu, addNode],
  )

  const cancelBtnStyle: React.CSSProperties = {
    padding: '9px 18px', background: 'transparent',
    border: `1px solid ${t.border}`, color: t.textDim,
    borderRadius: 8, cursor: 'pointer', fontSize: 12, fontFamily: t.fontMono,
  }

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', background: t.bg }}>
      <Toolbar
        opsName={opsName}
        search={search}
        onSearch={setSearch}
        onBack={onClose}
        onLogout={onLogout}
        connectedUsers={connectedUsers}
        onExport={handleExport}
        onAutoLayout={handleAutoLayout}
        summary={summary}
      />

      <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
        <ReactFlow
          nodes={displayNodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onEdgeClick={onEdgeClick}
          onPaneClick={onPaneClick}
          onPaneContextMenu={onPaneContextMenu}
          onNodeContextMenu={onNodeContextMenu}
          onEdgeContextMenu={onEdgeContextMenu}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          defaultEdgeOptions={{ type: 'custom', data: { state: 'hypothetical', label: '' } }}
          deleteKeyCode={null}
          onKeyDown={handleDeleteKey}
          fitView
          style={{ background: t.bg }}
          proOptions={{ hideAttribution: true }}
        >
          <Background color={t.grid} gap={26} size={1.5} variant={BackgroundVariant.Dots} />
          <Controls showInteractive={false} />
          <MiniMap
            nodeColor={nodeColor}
            nodeStrokeWidth={2}
            maskColor={t.theme === 'dark' ? 'rgba(8,9,12,0.78)' : 'rgba(236,234,227,0.7)'}
            style={{ background: t.bgElevated, border: `1px solid ${t.border}` }}
          />
        </ReactFlow>

        <div style={{
          position: 'absolute', bottom: 12, left: 52,
          background: t.theme === 'dark' ? 'rgba(12,14,19,0.85)' : 'rgba(246,244,238,0.92)',
          backdropFilter: 'blur(10px)',
          border: `1px solid ${t.border}`, borderRadius: 10,
          padding: '11px 14px 12px',
          boxShadow: '0 12px 30px -16px rgba(0,0,0,0.6)',
        }}>
          <Corners color={t.border} gap={5} len={8} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 18, marginBottom: 9 }}>
            <Kicker>// filter</Kicker>
            {hiddenTypes.size > 0 && (
              <button
                onClick={() => setHiddenTypes(new Set())}
                style={{ background: 'none', border: 'none', color: t.accent, fontFamily: t.fontMono, fontSize: 9, letterSpacing: 1, cursor: 'pointer', padding: 0 }}
              >
                ↺ reset
              </button>
            )}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxWidth: 460 }}>
            {Object.entries(TYPE_CONFIG).map(([key, cfg]) => {
              const count = typeCounts[key] ?? 0
              const off = hiddenTypes.has(key)
              return (
                <button
                  key={key}
                  onClick={() => toggleType(key)}
                  title={off ? 'show' : 'hide'}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '3px 9px 3px 4px', borderRadius: 999,
                    border: `1px solid ${off ? t.border : `${t.types[key]}66`}`,
                    background: off ? 'transparent' : `${t.types[key]}14`,
                    color: off ? t.textMuted : t.text,
                    fontFamily: t.fontMono, fontSize: 10, cursor: 'pointer',
                    opacity: off ? 0.6 : 1, transition: 'all 0.13s',
                  }}
                >
                  <span style={{
                    width: 16, height: 16, borderRadius: 4, display: 'grid', placeItems: 'center',
                    background: off ? t.bgHover : `${t.types[key]}1f`,
                    border: `1px solid ${off ? t.border : `${t.types[key]}66`}`,
                    color: off ? t.textMuted : t.types[key], fontSize: 9, fontWeight: 700, fontFamily: t.fontDisplay,
                  }}>{cfg.glyph}</span>
                  <span style={{ textDecoration: off ? 'line-through' : 'none' }}>{cfg.name}</span>
                  <span style={{ color: off ? t.textMuted : t.textDim, fontWeight: 600 }}>{count}</span>
                </button>
              )
            })}
          </div>
          <div style={{ color: t.textMuted, fontSize: 10, marginTop: 10, lineHeight: 1.7 }}>
            <span style={{ color: t.textDim }}>right-click</span> canvas: add · node: child · edge: state &nbsp;·&nbsp; <span style={{ color: t.textDim }}>click</span> type: filter
          </div>
        </div>

        {loaded && nodes.length === 0 && (
          <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', pointerEvents: 'none' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ display: 'inline-grid', placeItems: 'center', opacity: 0.85, marginBottom: 18 }}>
                <Logo size={76} />
              </div>
              <div style={{ fontFamily: t.fontDisplay, fontSize: 20, fontWeight: 600, color: t.text, marginBottom: 8 }}>
                Empty board
              </div>
              <div style={{ fontSize: 12.5, color: t.textDim, marginBottom: 22, fontFamily: t.fontMono }}>
                <span style={{ color: t.accent }}>right-click</span> the canvas to create the first node
              </div>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', maxWidth: 380, margin: '0 auto' }}>
                {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
                  <span key={key} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: t.textMuted, fontFamily: t.fontMono }}>
                    <span style={{
                      width: 16, height: 16, borderRadius: 4, display: 'grid', placeItems: 'center',
                      background: `${t.types[key]}1f`, border: `1px solid ${t.types[key]}66`,
                      color: t.types[key], fontSize: 9, fontWeight: 700, fontFamily: t.fontDisplay,
                    }}>{cfg.glyph}</span>
                    {cfg.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {selectedNode && (
          <NodeDrawer
            node={selectedNode}
            onClose={() => setSelectedNodeId(null)}
            onDeleteRequest={(nodeId) => {
              const hasChildren = edges.some((e) => e.source === nodeId)
              setDeleteModal({ nodeId, hasChildren })
              setDeleteInput('')
            }}
          />
        )}
        {!selectedNode && selectedEdge && (
          <EdgeDrawer
            edge={selectedEdge}
            nodes={nodes}
            onClose={() => setSelectedEdgeId(null)}
          />
        )}
      </div>

      {ctxMenu && (
        <ContextMenu
          menu={ctxMenu}
          onSelect={handleCtxSelect}
          onClose={() => setCtxMenu(null)}
        />
      )}

      {deleteModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.66)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
          onClick={() => setDeleteModal(null)}
        >
          <div className="fade-up" style={{
            position: 'relative',
            background: t.bgSurface, border: `1px solid ${t.border}`,
            padding: '28px 30px 26px', width: 380, borderRadius: t.radius + 2,
            color: t.text, boxShadow: t.shadow,
          }}
            onClick={(e) => e.stopPropagation()}
          >
            <Corners color={t.accent} gap={8} len={12} />
            <Kicker color={t.accent}>⚠ destructive action</Kicker>
            {deleteModal.hasChildren ? (
              <>
                <div style={{ fontFamily: t.fontDisplay, fontWeight: 600, fontSize: 18, margin: '12px 0 10px' }}>Delete node with children</div>
                <div style={{ fontSize: 13, color: t.textDim, marginBottom: 18, lineHeight: 1.6 }}>
                  This node has connected child nodes: all connected edges will be removed.<br />
                  To confirm, type <strong style={{ color: t.accent }}>delete</strong>.
                </div>
                <input
                  ref={deleteInputRef}
                  value={deleteInput}
                  onChange={(e) => setDeleteInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && deleteInput === 'delete') confirmDelete() }}
                  placeholder="delete"
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    background: t.bgInput, border: `1px solid ${deleteInput === 'delete' ? t.accent : t.border}`,
                    color: t.text, padding: '9px 12px', fontSize: 13, fontFamily: t.fontMono,
                    borderRadius: 8, marginBottom: 20, outline: 'none',
                  }}
                />
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button onClick={() => setDeleteModal(null)} style={cancelBtnStyle}>Cancel</button>
                  <button
                    disabled={deleteInput !== 'delete'}
                    onClick={confirmDelete}
                    style={{
                      padding: '9px 18px', background: deleteInput === 'delete' ? t.accent : 'transparent',
                      border: `1px solid ${deleteInput === 'delete' ? t.accent : t.border}`,
                      color: deleteInput === 'delete' ? '#fff' : t.textMuted,
                      borderRadius: 8, cursor: deleteInput === 'delete' ? 'pointer' : 'not-allowed',
                      fontSize: 12, fontFamily: t.fontDisplay, letterSpacing: 1,
                    }}>DELETE</button>
                </div>
              </>
            ) : (
              <>
                <div style={{ fontFamily: t.fontDisplay, fontWeight: 600, fontSize: 18, margin: '12px 0 10px' }}>Delete node</div>
                <div style={{ fontSize: 13, color: t.textDim, marginBottom: 22, lineHeight: 1.6 }}>
                  Are you sure you want to delete this node?
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button onClick={() => setDeleteModal(null)} style={cancelBtnStyle}>Cancel</button>
                  <button onClick={confirmDelete} style={{
                    padding: '9px 18px', background: t.accent,
                    border: `1px solid ${t.accent}`, color: '#fff',
                    borderRadius: 8, cursor: 'pointer', fontSize: 12, fontFamily: t.fontDisplay, letterSpacing: 1,
                  }}>DELETE</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function OpsBoard(props: Props) {
  return (
    <ReactFlowProvider>
      <BoardInner {...props} />
    </ReactFlowProvider>
  )
}

