import { useState, FormEvent } from 'react'
import { login } from '../api/client'
import { useBoardStore } from '../store'
import { useTokens } from '../styles/themes'
import { Wordmark, Corners, Kicker } from '../components/ui'

interface Props {
  onLogin: () => void
}

export default function Login({ onLogin }: Props) {
  const t = useTokens()
  const theme = useBoardStore((s) => s.theme)
  const toggleTheme = useBoardStore((s) => s.toggleTheme)

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [focus, setFocus] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(username, password)
      onLogin()
    } catch {
      setError('invalid credentials - access denied')
    } finally {
      setLoading(false)
    }
  }

  const inp = (name: string): React.CSSProperties => ({
    background: t.bgInput,
    border: `1px solid ${focus === name ? t.accent : t.border}`,
    boxShadow: focus === name ? `0 0 0 3px ${t.accentSoft}` : 'none',
    borderRadius: 8,
    padding: '11px 13px',
    color: t.text,
    fontFamily: t.fontMono,
    fontSize: 13,
    outline: 'none',
    width: '100%',
    transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
  })

  return (
    <div style={{ minHeight: '100vh', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', background: t.bg, overflow: 'hidden' }}>
      <div className="atmosphere" />

      {/* theme toggle */}
      <button
        onClick={toggleTheme}
        style={{
          position: 'fixed', top: 18, right: 22, zIndex: 5,
          background: 'transparent', border: `1px solid ${t.border}`, color: t.textDim,
          padding: '6px 12px', borderRadius: 7, fontFamily: t.fontMono, fontSize: 10,
          letterSpacing: 1, cursor: 'pointer',
        }}
      >
        {theme === 'dark' ? '◐ LIGHT' : '◑ DARK'}
      </button>

      <div className="fade-up" style={{ position: 'relative', zIndex: 2, width: 360, padding: '0 20px' }}>
        {/* wordmark: the central mark */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 34 }}>
          <Wordmark size={46} sub="operations graph manager" />
        </div>

        {/* glass auth card */}
        <form
          onSubmit={handleSubmit}
          style={{
            position: 'relative',
            display: 'flex', flexDirection: 'column', gap: 12,
            padding: '30px 26px 26px',
            border: `1px solid ${t.border}`,
            borderRadius: t.radius + 4,
            background: theme === 'dark' ? 'rgba(16,18,24,0.6)' : 'rgba(255,255,255,0.7)',
            backdropFilter: 'blur(14px)',
            boxShadow: t.shadow,
          }}
        >
          <Corners color={t.borderFocus} gap={9} len={13} />

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <Kicker>// authenticate</Kicker>
            <span style={{ fontFamily: t.fontMono, fontSize: 9, color: t.textMuted, letterSpacing: 1 }}>AES · JWT</span>
          </div>

          <input
            style={inp('u')}
            placeholder="operator id"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onFocus={() => setFocus('u')}
            onBlur={() => setFocus(null)}
            required
          />
          <input
            type="password"
            style={inp('p')}
            placeholder="passphrase"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onFocus={() => setFocus('p')}
            onBlur={() => setFocus(null)}
            required
          />

          {error && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              color: t.accent, fontSize: 11, fontFamily: t.fontMono,
              border: `1px solid ${t.accentDim}`, background: t.accentSoft,
              borderRadius: 7, padding: '8px 11px',
            }}>
              <span style={{ fontWeight: 700 }}>✕</span> {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: 4,
              background: t.accent,
              border: `1px solid ${t.accent}`,
              color: '#fff',
              padding: '11px 16px',
              borderRadius: 8,
              fontFamily: t.fontDisplay,
              fontWeight: 600,
              fontSize: 13,
              letterSpacing: 1.5,
              textTransform: 'uppercase',
              cursor: loading ? 'wait' : 'pointer',
              opacity: loading ? 0.7 : 1,
              boxShadow: `0 8px 22px -8px ${t.accentGlow}`,
              transition: 'transform 0.1s ease, box-shadow 0.15s ease',
            }}
            onMouseDown={(e) => (e.currentTarget.style.transform = 'translateY(1px)')}
            onMouseUp={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
          >
            {loading ? 'verifying...' : '▸ sign in'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 18, fontFamily: t.fontMono, fontSize: 9, letterSpacing: 1.5, color: t.textMuted }}>
          UNAUTHORIZED ACCESS IS PROHIBITED · ALL ACTIVITY LOGGED
        </div>
      </div>
    </div>
  )
}
