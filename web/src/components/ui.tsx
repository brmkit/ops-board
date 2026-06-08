import { useTokens } from '../styles/themes'

/* Brand mark: a bare connected-node graph (red dots, ink links, no background) */
export function Logo({ size = 30 }: { size?: number }) {
  const t = useTokens()
  const ink = t.theme === 'dark' ? '#e8eaee' : '#16140f'
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" style={{ display: 'block', overflow: 'visible' }}>
      <g stroke={ink} strokeWidth={2.3} strokeLinecap="round">
        <line x1="11" y1="14" x2="29" y2="9" />
        <line x1="11" y1="14" x2="20" y2="31" />
        <line x1="29" y1="9" x2="20" y2="31" />
      </g>
      <g fill={t.accent}>
        <circle cx="11" cy="14" r="4.5" />
        <circle cx="29" cy="9" r="4.5" />
        <circle cx="20" cy="31" r="4.5" />
      </g>
    </svg>
  )
}

/* Wordmark: logo + name on one row, optional subtitle centered below */
export function Wordmark({ size = 22, sub }: { size?: number; sub?: string }) {
  const t = useTokens()
  const gap = Math.round(size * 0.42)
  const subSize = Math.max(9, Math.round(size * 0.28))

  const row = (
    <div style={{ display: 'flex', alignItems: 'center', gap }}>
      <Logo size={Math.round(size * 1.35)} />
      <div
        style={{
          fontFamily: t.fontDisplay,
          fontWeight: 700,
          fontSize: size,
          letterSpacing: size * 0.02,
          lineHeight: 1,
          color: t.text,
          display: 'flex',
          alignItems: 'baseline',
        }}
      >
        ops<span style={{ color: t.accent }}>·</span>board
      </div>
    </div>
  )

  if (!sub) return row

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: Math.round(size * 0.26) }}>
      {row}
      <div
        style={{
          fontFamily: t.fontMono,
          fontSize: subSize,
          letterSpacing: Math.max(2, subSize * 0.36),
          textTransform: 'uppercase',
          color: t.textMuted,
          whiteSpace: 'nowrap',
          textAlign: 'center',
        }}
      >
        {sub}
      </div>
    </div>
  )
}

/* Brand lockup: big logo left, name over subtitle filling the logo height */
export function WordmarkLockup({ logo = 42 }: { logo?: number }) {
  const t = useTokens()
  const nameSize = Math.round(logo * 0.52)
  const subSize = Math.max(9, Math.round(logo * 0.21))
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: Math.round(logo * 0.3) }}>
      <Logo size={logo} />
      <div style={{ height: logo, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '1px 0' }}>
        <div
          style={{
            fontFamily: t.fontDisplay,
            fontWeight: 700,
            fontSize: nameSize,
            letterSpacing: nameSize * 0.01,
            lineHeight: 1,
            color: t.text,
            display: 'flex',
            alignItems: 'baseline',
          }}
        >
          ops<span style={{ color: t.accent }}>·</span>board
        </div>
        <div
          style={{
            fontFamily: t.fontMono,
            fontSize: subSize,
            letterSpacing: Math.max(1.5, subSize * 0.32),
            textTransform: 'uppercase',
            color: t.textMuted,
            lineHeight: 1,
            whiteSpace: 'nowrap',
          }}
        >
          operations graph manager
        </div>
      </div>
    </div>
  )
}

/* HUD corner brackets: wraps any positioned container */
export function Corners({ color, gap = 0, len = 12, w = 1.5 }: { color?: string; gap?: number; len?: number; w?: number }) {
  const t = useTokens()
  const c = color ?? t.border
  const base: React.CSSProperties = { position: 'absolute', width: len, height: len, pointerEvents: 'none' }
  return (
    <>
      <span style={{ ...base, top: gap, left: gap, borderTop: `${w}px solid ${c}`, borderLeft: `${w}px solid ${c}` }} />
      <span style={{ ...base, top: gap, right: gap, borderTop: `${w}px solid ${c}`, borderRight: `${w}px solid ${c}` }} />
      <span style={{ ...base, bottom: gap, left: gap, borderBottom: `${w}px solid ${c}`, borderLeft: `${w}px solid ${c}` }} />
      <span style={{ ...base, bottom: gap, right: gap, borderBottom: `${w}px solid ${c}`, borderRight: `${w}px solid ${c}` }} />
    </>
  )
}

/* ── status pulse dot ── */
export function Dot({ color, size = 7 }: { color: string; size?: number }) {
  return (
    <span
      className="pulse-dot"
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: color,
        boxShadow: `0 0 8px ${color}`,
        display: 'inline-block',
        flexShrink: 0,
      }}
    />
  )
}

/* ── small uppercase section label ── */
export function Kicker({ children, color }: { children: React.ReactNode; color?: string }) {
  const t = useTokens()
  return (
    <span
      style={{
        fontFamily: t.fontMono,
        fontSize: 10,
        letterSpacing: 2.5,
        textTransform: 'uppercase',
        color: color ?? t.textDim,
      }}
    >
      {children}
    </span>
  )
}
