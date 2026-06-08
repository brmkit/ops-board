import { useTokens, DARK } from '../styles/themes'

const NODE_TYPES = [
  { value: 'action',     label: 'action',          glyph: 'A', color: DARK.types.action },
  { value: 'host',       label: 'host / service',  glyph: 'H', color: DARK.types.host },
  { value: 'identity',   label: 'identity',        glyph: 'I', color: DARK.types.identity },
  { value: 'credential', label: 'credential',      glyph: 'C', color: DARK.types.credential },
  { value: 'finding',    label: 'finding',         glyph: 'F', color: DARK.types.finding },
  { value: 'question',   label: 'question',        glyph: '?', color: DARK.types.question },
]

const EDGE_STATES = [
  { value: 'confirmed',    label: 'confirmed',    glyph: '●', color: '#34d399' },
  { value: 'hypothetical', label: 'hypothetical', glyph: '◌', color: '#8b909c' },
  { value: 'blocked',      label: 'blocked',      glyph: '✕', color: '#f43f5e' },
  { value: 'interrupted',  label: 'interrupted',  glyph: '┄', color: '#6b7280' },
]

export type CtxMenuState =
  | { mode: 'pane'; screenX: number; screenY: number; flowX: number; flowY: number }
  | { mode: 'node'; screenX: number; screenY: number; nodeId: string; nodeX: number; nodeY: number }
  | { mode: 'edge'; screenX: number; screenY: number; edgeId: string; currentState: string }

interface Props {
  menu: CtxMenuState
  onSelect: (value: string) => void
  onClose: () => void
}

export default function ContextMenu({ menu, onSelect, onClose }: Props) {
  const t = useTokens()

  const items = menu.mode === 'edge' ? EDGE_STATES : NODE_TYPES
  const title = menu.mode === 'pane' ? 'add node' : menu.mode === 'node' ? 'add child' : 'edge state'

  const left = Math.min(menu.screenX, window.innerWidth - 200)
  const top = Math.min(menu.screenY, window.innerHeight - items.length * 32 - 44)

  return (
    <>
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 1999 }}
        onMouseDown={onClose}
        onContextMenu={(e) => { e.preventDefault(); onClose() }}
      />
      <div className="fade-up" style={{
        position: 'fixed', left, top, zIndex: 2000,
        background: t.theme === 'dark' ? 'rgba(16,18,24,0.92)' : 'rgba(255,255,255,0.96)',
        backdropFilter: 'blur(14px)',
        border: `1px solid ${t.border}`, borderRadius: 10,
        minWidth: 184, fontFamily: t.fontMono, fontSize: 12,
        overflow: 'hidden', boxShadow: t.shadow,
      }}>
        <div style={{ padding: '8px 12px 7px', color: t.textDim, fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', borderBottom: `1px solid ${t.hairline}` }}>
          ▸ {title}
        </div>
        <div style={{ padding: 5 }}>
          {items.map((item) => {
            const active = menu.mode === 'edge' && item.value === menu.currentState
            return (
              <div
                key={item.value}
                onClick={() => { onSelect(item.value); onClose() }}
                style={{
                  padding: '7px 9px', cursor: 'pointer', borderRadius: 7,
                  color: active ? t.text : t.text,
                  background: active ? t.bgHover : 'transparent',
                  display: 'flex', alignItems: 'center', gap: 10,
                  transition: 'background 0.12s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = t.bgHover)}
                onMouseLeave={(e) => (e.currentTarget.style.background = active ? t.bgHover : 'transparent')}
              >
                <span style={{
                  width: 18, height: 18, borderRadius: 5, flexShrink: 0,
                  display: 'grid', placeItems: 'center',
                  background: `${item.color}1f`, border: `1px solid ${item.color}66`,
                  color: item.color, fontSize: 10, fontWeight: 700,
                }}>
                  {item.glyph}
                </span>
                <span style={{ flex: 1 }}>{item.label}</span>
                {active && <span style={{ color: t.accent, fontSize: 10 }}>✓</span>}
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
