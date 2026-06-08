import { type Edge, type Node } from '@xyflow/react'
import { useBoardStore } from '../store'
import { useTokens } from '../styles/themes'

const EDGE_STATES = ['confirmed', 'hypothetical', 'blocked', 'interrupted'] as const

const STATE_COLOR: Record<string, string> = {
  confirmed: '#34d399',
  hypothetical: '#8b909c',
  blocked: '#f43f5e',
  interrupted: '#6b7280',
}

interface Props {
  edge: Edge
  nodes: Node[]
  onClose: () => void
}

export default function EdgeDrawer({ edge, nodes, onClose }: Props) {
  const t = useTokens()
  const { updateEdgeData, onEdgesChange } = useBoardStore()

  const state = (edge.data?.state as string) ?? 'hypothetical'
  const label = (edge.data?.label as string) ?? ''
  const color = STATE_COLOR[state] ?? t.textDim

  const sourceNode = nodes.find((n) => n.id === edge.source)
  const targetNode = nodes.find((n) => n.id === edge.target)
  const sourceLabel = (sourceNode?.data?.label as string) ?? edge.source
  const targetLabel = (targetNode?.data?.label as string) ?? edge.target

  const inp: React.CSSProperties = {
    background: t.bgInput, border: `1px solid ${t.border}`, borderRadius: 7,
    padding: '7px 9px', color: t.text, fontFamily: t.fontMono,
    fontSize: 12, outline: 'none', width: '100%', marginTop: 5, boxSizing: 'border-box',
  }

  const deleteEdge = () => {
    onEdgesChange([{ type: 'remove', id: edge.id }])
    onClose()
  }

  return (
    <div style={{
      position: 'absolute', top: 0, right: 0, width: 280, height: '100%',
      background: t.theme === 'dark' ? 'rgba(12,14,19,0.94)' : 'rgba(246,244,238,0.97)',
      backdropFilter: 'blur(14px)',
      borderLeft: `1px solid ${t.border}`,
      overflow: 'auto', fontFamily: t.fontMono, fontSize: 12, color: t.text,
      zIndex: 10, display: 'flex', flexDirection: 'column',
      boxShadow: '-20px 0 50px -24px rgba(0,0,0,0.6)',
    }}>
      <div style={{ height: 3, background: color, boxShadow: `0 0 10px ${color}`, flexShrink: 0 }} />

      <div style={{
        padding: '12px 14px', borderBottom: `1px solid ${t.hairline}`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0,
      }}>
        <span style={{ color: t.textDim, fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase' }}>↔ connection</span>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={deleteEdge}
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

      <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: 16, flex: 1 }}>
        <div>
          <span style={{ color: t.textDim, fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase' }}>route</span>
          <div style={{
            marginTop: 8, padding: '10px 12px', border: `1px solid ${t.border}`, borderRadius: 8, background: t.bgInput,
            fontSize: 12, display: 'flex', flexDirection: 'column', gap: 6,
          }}>
            <span style={{ color: t.text, fontWeight: 600, wordBreak: 'break-word' }}>{sourceLabel}</span>
            <span style={{ color, fontSize: 13, letterSpacing: 4 }}>↓</span>
            <span style={{ color: t.text, fontWeight: 600, wordBreak: 'break-word' }}>{targetLabel}</span>
          </div>
        </div>

        <div>
          <span style={{ color: t.textDim, fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase' }}>state</span>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 7 }}>
            {EDGE_STATES.map((s) => (
              <button key={s} onClick={() => updateEdgeData(edge.id, { state: s })} style={{
                display: 'flex', alignItems: 'center', gap: 5,
                background: state === s ? t.bgHover : 'transparent',
                border: `1px solid ${state === s ? STATE_COLOR[s] : t.border}`,
                color: state === s ? t.text : t.textDim,
                padding: '3px 9px', borderRadius: 999, fontFamily: t.fontMono, fontSize: 10, cursor: 'pointer',
              }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: STATE_COLOR[s] }} />
                {s}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span style={{ color: t.textDim, fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase' }}>label</span>
          <input
            value={label}
            onChange={(e) => updateEdgeData(edge.id, { label: e.target.value })}
            placeholder="e.g. lateral, ssh, pivot..."
            style={inp}
          />
        </div>

        <div style={{ fontSize: 9, color: t.textMuted, borderTop: `1px solid ${t.hairline}`, paddingTop: 10, wordBreak: 'break-all', opacity: 0.7 }}>
          {edge.id}
        </div>
      </div>
    </div>
  )
}
