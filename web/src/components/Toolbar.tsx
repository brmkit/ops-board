import { useRef, useState } from 'react'
import { useBoardStore, type SaveStatus } from '../store'
import { useTokens } from '../styles/themes'
import { getUsername } from '../api/client'
import { Logo } from './ui'

const SAVE_META: Record<SaveStatus, { color: string; label: string }> = {
  saved:  { color: '#34d399', label: 'synced' },
  saving: { color: '#fbbf24', label: 'syncing' },
  dirty:  { color: '#8b909c', label: 'pending' },
  error:  { color: '#f43f5e', label: 'error' },
}

interface Summary {
  findings: number
  questions: number
  blocked: number
}

interface Props {
  opsName: string
  search: string
  onSearch: (v: string) => void
  onBack: () => void
  onLogout: () => void
  connectedUsers: string[]
  onExport: (format: 'json' | 'svg') => void
  onAutoLayout: () => void
  summary: Summary
}

export default function Toolbar({ opsName, search, onSearch, onBack, onLogout, connectedUsers, onExport, onAutoLayout, summary }: Props) {
  const t = useTokens()
  const saveStatus = useBoardStore((s) => s.saveStatus)
  const theme = useBoardStore((s) => s.theme)
  const toggleTheme = useBoardStore((s) => s.toggleTheme)
  const edgeStyle = useBoardStore((s) => s.edgeStyle)
  const cycleEdgeStyle = useBoardStore((s) => s.cycleEdgeStyle)
  const edgeLabel = edgeStyle === 'curved' ? '⌒ curved' : edgeStyle === 'straight' ? '╱ straight' : '⌐ step'
  const me = getUsername()
  const [exportOpen, setExportOpen] = useState(false)
  const [searchFocus, setSearchFocus] = useState(false)
  const exportRef = useRef<HTMLDivElement>(null)
  const save = SAVE_META[saveStatus]

  const btn: React.CSSProperties = {
    background: 'transparent', border: `1px solid ${t.border}`, color: t.textDim,
    padding: '5px 11px', borderRadius: 7, fontFamily: t.fontMono, fontSize: 10,
    letterSpacing: 0.5, cursor: 'pointer', transition: 'all 0.14s',
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '9px 16px',
      borderBottom: `1px solid ${t.border}`,
      background: theme === 'dark' ? 'rgba(12,14,19,0.85)' : 'rgba(246,244,238,0.9)',
      backdropFilter: 'blur(12px)',
      fontFamily: t.fontMono, flexShrink: 0, zIndex: 20,
    }}>
      <button
        onClick={onBack}
        title="back to operations"
        style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
      >
        <Logo size={22} />
        <span style={{ color: t.textDim, fontSize: 11 }}>← ops</span>
      </button>

      <span style={{ color: t.border }}>│</span>

      <span style={{ fontFamily: t.fontDisplay, color: t.text, fontWeight: 600, fontSize: 14, letterSpacing: 0.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 280 }}>
        {opsName}
      </span>

      {/* save status */}
      <span style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 2 }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: save.color, boxShadow: `0 0 7px ${save.color}` }} className={saveStatus === 'saving' ? 'pulse-dot' : undefined} />
        <span style={{ fontSize: 10, color: save.color, letterSpacing: 0.5 }}>{save.label}</span>
      </span>

      {/* operational summary */}
      {(summary.findings > 0 || summary.questions > 0 || summary.blocked > 0) && (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginLeft: 4 }}>
          {summary.findings > 0 && <SumChip color={t.types.finding} glyph="F" n={summary.findings} label="findings" t={t} />}
          {summary.questions > 0 && <SumChip color={t.types.question} glyph="?" n={summary.questions} label="open" t={t} />}
          {summary.blocked > 0 && <SumChip color="#f43f5e" glyph="✕" n={summary.blocked} label="blocked" t={t} />}
        </div>
      )}

      <div style={{ flex: 1 }} />

      {/* connected users */}
      {connectedUsers.length > 0 && (
        <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
          {connectedUsers.map((u) => {
            const mine = u === me
            return (
              <span
                key={u}
                title={u}
                style={{
                  fontSize: 10, padding: '3px 9px', borderRadius: 999,
                  display: 'flex', alignItems: 'center', gap: 5,
                  background: mine ? t.accentSoft : t.bgHover,
                  border: `1px solid ${mine ? t.accent : t.border}`,
                  color: mine ? t.accent : t.textDim,
                }}
              >
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: mine ? t.accent : t.success }} />
                {u}
              </span>
            )
          })}
        </div>
      )}

      {/* search */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <span style={{ position: 'absolute', left: 10, color: searchFocus ? t.accent : t.textMuted, fontSize: 11, pointerEvents: 'none' }}>⌕</span>
        <input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="filter nodes..."
          style={{
            background: t.bgInput, border: `1px solid ${searchFocus ? t.accent : t.border}`,
            boxShadow: searchFocus ? `0 0 0 3px ${t.accentSoft}` : 'none',
            padding: '5px 10px 5px 26px', borderRadius: 7, color: t.text,
            fontFamily: t.fontMono, fontSize: 11, outline: 'none', width: 190,
            transition: 'border-color 0.14s, box-shadow 0.14s',
          }}
          onFocus={() => setSearchFocus(true)}
          onBlur={() => setSearchFocus(false)}
        />
      </div>

      {/* edge style */}
      <button onClick={cycleEdgeStyle} style={btn} title="cycle edge style: curved / straight / step">{edgeLabel}</button>

      {/* auto-layout */}
      <button onClick={onAutoLayout} style={btn} title="align and evenly space blocks without recomputing the hierarchy">⊞ ALIGN</button>

      {/* export */}
      <div ref={exportRef} style={{ position: 'relative' }}>
        <button onClick={() => setExportOpen((o) => !o)} style={btn}>↧ EXPORT</button>
        {exportOpen && (
          <>
            <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setExportOpen(false)} />
            <div style={{
              position: 'absolute', top: '100%', right: 0, marginTop: 6,
              background: t.bgSurface, border: `1px solid ${t.border}`, borderRadius: 8,
              zIndex: 100, minWidth: 120, overflow: 'hidden', boxShadow: t.shadow,
            }}>
              {(['json', 'svg'] as const).map((fmt) => (
                <button
                  key={fmt}
                  onClick={() => { setExportOpen(false); onExport(fmt) }}
                  style={{
                    display: 'flex', width: '100%', alignItems: 'center', gap: 8, textAlign: 'left',
                    background: 'none', border: 'none', color: t.textDim,
                    padding: '8px 13px', fontFamily: t.fontMono, fontSize: 11, cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = t.bgHover; e.currentTarget.style.color = t.text }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = t.textDim }}
                >
                  <span style={{ color: t.accent }}>▸</span> {fmt.toUpperCase()}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <button onClick={toggleTheme} style={btn} title="toggle theme">{theme === 'dark' ? '◐' : '◑'}</button>
      <button onClick={onLogout} style={btn}>⏻</button>
    </div>
  )
}

function SumChip({ color, glyph, n, label, t }: { color: string; glyph: string; n: number; label: string; t: ReturnType<typeof useTokens> }) {
  return (
    <span
      title={`${n} ${label}`}
      style={{
        display: 'flex', alignItems: 'center', gap: 5,
        padding: '3px 8px', borderRadius: 999,
        background: `${color}14`, border: `1px solid ${color}55`,
        fontFamily: t.fontMono, fontSize: 10, color: t.text, letterSpacing: 0.3,
      }}
    >
      <span style={{ color, fontWeight: 700 }}>{glyph}</span>
      <span style={{ fontWeight: 600 }}>{n}</span>
      <span style={{ color: t.textDim }}>{label}</span>
    </span>
  )
}
