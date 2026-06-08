import { useState, useEffect, useRef } from 'react'
import { Handle, Position } from '@xyflow/react'
import { useBoardStore } from '../store'
import { useTokens, DARK } from '../styles/themes'

export const TYPE_CONFIG: Record<string, { color: string; glyph: string; name: string }> = {
  action:     { color: DARK.types.action,     glyph: 'A', name: 'action' },
  host:       { color: DARK.types.host,       glyph: 'H', name: 'host' },
  identity:   { color: DARK.types.identity,   glyph: 'I', name: 'identity' },
  credential: { color: DARK.types.credential, glyph: 'C', name: 'credential' },
  finding:    { color: DARK.types.finding,    glyph: 'F', name: 'finding' },
  question:   { color: DARK.types.question,   glyph: '?', name: 'question' },
}

const STATUS_COLOR: Record<string, string> = {
  active: '#34d399', dormant: '#8b909c', burned: '#f43f5e', done: '#52525b',
}

interface CustomNodeProps {
  id: string
  data: Record<string, unknown>
  type?: string
  selected?: boolean
}

export function CustomNode({ id, data, type, selected }: CustomNodeProps) {
  const t = useTokens()
  const editingNodeId = useBoardStore((s) => s.editingNodeId)
  const setEditingNodeId = useBoardStore((s) => s.setEditingNodeId)
  const updateNodeData = useBoardStore((s) => s.updateNodeData)

  const isEditing = editingNodeId === id
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const cfg = TYPE_CONFIG[type ?? 'host'] ?? TYPE_CONFIG.host
  const color = t.types[type ?? 'host'] ?? cfg.color
  const status = (data.status as string) || 'active'
  const tags = (data.tags as string[]) ?? []
  const label = (data.label as string) ?? ''

  const statusOpacity: Record<string, number | undefined> = {
    active: undefined, dormant: 0.6, burned: undefined, done: 0.4,
  }

  useEffect(() => {
    if (isEditing) {
      setDraft(label)
      setTimeout(() => inputRef.current?.select(), 30)
    }
  }, [isEditing])

  const commit = () => {
    const trimmed = draft.trim()
    if (trimmed) updateNodeData(id, { label: trimmed })
    setEditingNodeId(null)
  }

  const startEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    setDraft(label)
    setEditingNodeId(id)
  }

  const handleStyle = { background: color, border: `2px solid ${t.bgSurface}`, width: 9, height: 9, color }

  return (
    <div
      style={{
        position: 'relative',
        borderRadius: 9,
        border: `1px solid ${selected ? color : t.border}`,
        background: status === 'burned' ? (t.theme === 'dark' ? '#1c0709' : '#fdf0f1') : t.bgSurface,
        opacity: statusOpacity[status],
        minWidth: 150,
        maxWidth: 230,
        fontFamily: t.fontMono,
        color: t.text,
        overflow: 'hidden',
        boxShadow: selected
          ? `0 0 0 1px ${color}, 0 0 18px -2px ${color}88, 0 10px 24px -12px rgba(0,0,0,0.7)`
          : '0 6px 16px -10px rgba(0,0,0,0.6)',
        transition: 'box-shadow 0.16s ease, border-color 0.16s ease',
      }}
    >
      {/* type accent stripe */}
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: color, boxShadow: `0 0 8px ${color}` }} />

      <Handle id="top" type="target" position={Position.Top} style={handleStyle} />
      <Handle id="left" type="target" position={Position.Left} style={handleStyle} />
      <Handle id="right" type="source" position={Position.Right} style={handleStyle} />

      <div style={{ padding: '8px 10px 8px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          {/* glyph chip */}
          <span style={{
            flexShrink: 0, width: 18, height: 18, borderRadius: 5,
            display: 'grid', placeItems: 'center',
            background: `${color}1f`, border: `1px solid ${color}66`,
            color, fontSize: 10, fontWeight: 700, fontFamily: t.fontDisplay,
          }}>
            {cfg.glyph}
          </span>

          {isEditing ? (
            <input
              ref={inputRef}
              className="nodrag"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); commit() }
                if (e.key === 'Escape') setEditingNodeId(null)
                e.stopPropagation()
              }}
              onClick={(e) => e.stopPropagation()}
              style={{
                flex: 1, background: 'transparent', border: 'none',
                borderBottom: `1px solid ${color}`,
                color: t.text, fontFamily: t.fontMono, fontSize: 12,
                fontWeight: 600, outline: 'none', padding: '0 2px', minWidth: 0,
              }}
            />
          ) : (
            <span
              onClick={startEdit}
              title="click to rename"
              style={{ fontWeight: 600, fontSize: 12.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, cursor: 'text' }}
            >
              {label || <span style={{ color: t.textMuted, fontStyle: 'italic', fontWeight: 400 }}>untitled</span>}
            </span>
          )}
        </div>

        {tags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 7 }}>
            {tags.slice(0, 4).map((tag) => (
              <span key={tag} style={{
                background: t.bgHover, color: t.textDim, borderRadius: 4,
                padding: '1px 5px', fontSize: 9, border: `1px solid ${t.border}`,
              }}>
                {tag}
              </span>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 7 }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: STATUS_COLOR[status] ?? t.textMuted }} />
          <span style={{ color: t.textMuted, fontSize: 9, letterSpacing: 1, textTransform: 'uppercase' }}>{status}</span>
        </div>
      </div>

      <Handle id="bottom" type="source" position={Position.Bottom} style={handleStyle} />
    </div>
  )
}

// expose theme to node component via data so useTokens can access store
Object.defineProperty(CustomNode, 'theme', { value: true })

export const nodeTypes = {
  action: CustomNode, host: CustomNode, identity: CustomNode,
  credential: CustomNode, finding: CustomNode, question: CustomNode,
}

export function nodeColor(node: { type?: string }): string {
  return DARK.types[node.type ?? 'host'] ?? '#888'
}
