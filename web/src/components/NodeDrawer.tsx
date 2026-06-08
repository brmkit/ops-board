import { useState } from 'react'
import { type Node, type Edge } from '@xyflow/react'
import { useBoardStore } from '../store'
import { useTokens } from '../styles/themes'
import { TYPE_CONFIG } from './NodeTypes'

const NODE_STATUSES = ['active', 'dormant', 'burned', 'done'] as const
const EDGE_STATES = ['confirmed', 'hypothetical', 'blocked', 'interrupted'] as const

const STATUS_COLOR: Record<string, string> = {
  active: '#34d399', dormant: '#8b909c', burned: '#f43f5e', done: '#52525b',
}

interface Props {
  node: Node
  onClose: () => void
  onDeleteRequest: (nodeId: string) => void
}

export default function NodeDrawer({ node, onClose, onDeleteRequest }: Props) {
  const t = useTokens()
  const { updateNodeData, edges, updateEdgeData } = useBoardStore()
  const [notesMode, setNotesMode] = useState<'edit' | 'preview'>('edit')
  const [newTag, setNewTag] = useState('')

  const d = node.data as Record<string, unknown>
  const tags = (d.tags as string[]) ?? []
  const notes = (d.notes as string) ?? ''
  const status = (d.status as string) ?? 'active'
  const label = (d.label as string) ?? ''

  const cfg = TYPE_CONFIG[node.type ?? 'host'] ?? TYPE_CONFIG.host
  const typeColor = t.types[node.type ?? 'host'] ?? cfg.color

  const relatedEdges = edges.filter((e: Edge) => e.source === node.id || e.target === node.id)
  const createdBy = d._created_by ? String(d._created_by) : null
  const createdAt = d._created_at ? new Date(String(d._created_at)).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' }) : null

  const addTag = () => {
    const tag = newTag.trim()
    if (!tag || tags.includes(tag)) return
    updateNodeData(node.id, { tags: [...tags, tag] })
    setNewTag('')
  }

  const inp: React.CSSProperties = {
    background: t.bgInput, border: `1px solid ${t.border}`, borderRadius: 7,
    padding: '7px 9px', color: t.text, fontFamily: t.fontMono,
    fontSize: 12, outline: 'none', width: '100%', marginTop: 5,
  }

  return (
    <div style={{
      position: 'absolute', top: 0, right: 0, width: 312, height: '100%',
      background: t.theme === 'dark' ? 'rgba(12,14,19,0.94)' : 'rgba(246,244,238,0.97)',
      backdropFilter: 'blur(14px)',
      borderLeft: `1px solid ${t.border}`,
      overflow: 'auto', fontFamily: t.fontMono, fontSize: 12, color: t.text,
      zIndex: 10, display: 'flex', flexDirection: 'column',
      boxShadow: '-20px 0 50px -24px rgba(0,0,0,0.6)',
    }}>
      {/* type accent bar */}
      <div style={{ height: 3, background: typeColor, boxShadow: `0 0 10px ${typeColor}`, flexShrink: 0 }} />

      {/* header */}
      <div style={{
        padding: '12px 14px', borderBottom: `1px solid ${t.hairline}`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0,
      }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            width: 20, height: 20, borderRadius: 5, display: 'grid', placeItems: 'center',
            background: `${typeColor}1f`, border: `1px solid ${typeColor}66`,
            color: typeColor, fontSize: 11, fontWeight: 700, fontFamily: t.fontDisplay,
          }}>{cfg.glyph}</span>
          <span style={{ color: t.textDim, fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase' }}>{cfg.name}</span>
        </span>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => onDeleteRequest(node.id)}
            style={{ color: t.textMuted, background: 'none', border: `1px solid ${t.border}`, borderRadius: 6, cursor: 'pointer', fontFamily: t.fontMono, fontSize: 10, padding: '3px 8px' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = t.accent; e.currentTarget.style.borderColor = t.accent }}
            onMouseLeave={(e) => { e.currentTarget.style.color = t.textMuted; e.currentTarget.style.borderColor = t.border }}>
            ✕ del
          </button>
          <button onClick={onClose}
            style={{ color: t.textDim, background: 'none', border: `1px solid ${t.border}`, borderRadius: 6, cursor: 'pointer', fontFamily: t.fontMono, fontSize: 12, padding: '3px 9px' }}>
            ✕
          </button>
        </div>
      </div>

      <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: 16, flex: 1, overflow: 'auto' }}>
        <Field label="label" t={t}>
          <input value={label} onChange={(e) => updateNodeData(node.id, { label: e.target.value })} style={inp} />
        </Field>

        <Field label="status" t={t}>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 5 }}>
            {NODE_STATUSES.map((s) => (
              <button key={s} onClick={() => updateNodeData(node.id, { status: s })} style={{
                display: 'flex', alignItems: 'center', gap: 5,
                background: status === s ? t.bgHover : 'transparent',
                border: `1px solid ${status === s ? STATUS_COLOR[s] : t.border}`,
                color: status === s ? t.text : t.textDim,
                padding: '3px 9px', borderRadius: 999, fontFamily: t.fontMono, fontSize: 10, cursor: 'pointer',
              }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: STATUS_COLOR[s] }} />
                {s}
              </button>
            ))}
          </div>
        </Field>

        <Field label="tags" t={t}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 5 }}>
            {tags.map((tag) => (
              <span key={tag} style={{
                background: t.bgHover, border: `1px solid ${t.border}`, borderRadius: 5,
                color: t.text, padding: '2px 7px', fontSize: 10,
                display: 'flex', alignItems: 'center', gap: 5,
              }}>
                {tag}
                <span onClick={() => updateNodeData(node.id, { tags: tags.filter((x) => x !== tag) })}
                  style={{ cursor: 'pointer', color: t.textMuted, fontSize: 9 }}>✕</span>
              </span>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 5, marginTop: 7 }}>
            <input value={newTag} onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addTag()}
              placeholder="add tag"
              style={{ ...inp, flex: 1, width: 'auto', marginTop: 0 }} />
            <button onClick={addTag} style={{
              background: 'transparent', border: `1px solid ${t.border}`, color: t.textDim, borderRadius: 7,
              padding: '0 12px', fontFamily: t.fontMono, fontSize: 13, cursor: 'pointer',
            }}>+</button>
          </div>
        </Field>

        <Field label="notes" t={t} right={
          <div style={{ display: 'flex', gap: 4, background: t.bgHover, borderRadius: 6, padding: 2 }}>
            {(['edit', 'preview'] as const).map((m) => (
              <button key={m} onClick={() => setNotesMode(m)} style={{
                background: notesMode === m ? t.bgSurface : 'none',
                border: notesMode === m ? `1px solid ${t.border}` : '1px solid transparent', borderRadius: 5,
                color: notesMode === m ? t.text : t.textMuted,
                fontFamily: t.fontMono, fontSize: 9, cursor: 'pointer', padding: '2px 7px',
              }}>{m}</button>
            ))}
          </div>
        }>
          {notesMode === 'edit' ? (
            <textarea value={notes} onChange={(e) => updateNodeData(node.id, { notes: e.target.value })}
              rows={7} style={{
                width: '100%', background: t.bgInput, border: `1px solid ${t.border}`, borderRadius: 7,
                padding: '8px 10px', color: t.text, fontFamily: t.fontMono, fontSize: 11.5,
                outline: 'none', resize: 'vertical', marginTop: 5, lineHeight: 1.6,
              }} />
          ) : (
            <div style={{
              background: t.bgInput, border: `1px solid ${t.border}`, borderRadius: 7, padding: '8px 10px',
              minHeight: 100, fontSize: 11.5, color: t.text, whiteSpace: 'pre-wrap',
              wordBreak: 'break-word', marginTop: 5, lineHeight: 1.6,
            }}>
              {notes || <span style={{ color: t.textMuted }}>empty</span>}
            </div>
          )}
        </Field>

        {relatedEdges.length > 0 && (
          <Field label={`connections · ${relatedEdges.length}`} t={t}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 7 }}>
              {relatedEdges.map((e) => (
                <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10 }}>
                  <span style={{ color: e.source === node.id ? t.info : t.warning, flexShrink: 0, fontSize: 12 }}>{e.source === node.id ? '↦' : '↤'}</span>
                  <select value={(e.data?.state as string) ?? 'hypothetical'}
                    onChange={(ev) => updateEdgeData(e.id, { state: ev.target.value })}
                    style={{
                      background: t.bgInput, border: `1px solid ${t.border}`, borderRadius: 6,
                      color: t.textDim, fontFamily: t.fontMono, fontSize: 10,
                      padding: '3px 5px', outline: 'none', flexShrink: 0,
                    }}>
                    {EDGE_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <input value={(e.data?.label as string) ?? ''}
                    onChange={(ev) => updateEdgeData(e.id, { label: ev.target.value })}
                    placeholder="label"
                    style={{ ...inp, flex: 1, width: 'auto', marginTop: 0, padding: '4px 7px' }} />
                </div>
              ))}
            </div>
          </Field>
        )}

        <div style={{ fontSize: 9, color: t.textMuted, borderTop: `1px solid ${t.hairline}`, paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {createdBy && (
            <div>
              <span style={{ color: t.textDim }}>created by </span>
              <span style={{ color: t.text }}>{createdBy}</span>
              {createdAt && <span> · {createdAt}</span>}
            </div>
          )}
          <div style={{ wordBreak: 'break-all', opacity: 0.7 }}>{node.id}</div>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children, right, t }: {
  label: string; children: React.ReactNode; right?: React.ReactNode
  t: ReturnType<typeof useTokens>
}) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: 20 }}>
        <span style={{ color: t.textDim, fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase' }}>{label}</span>
        {right}
      </div>
      {children}
    </div>
  )
}
