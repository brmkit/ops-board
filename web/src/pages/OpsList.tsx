import { useEffect, useRef, useState } from 'react'
import {
  listOps, createOps, deleteOps, renameOps, exportOps, importOps, type OpSummary,
  listUsers, createUser, deleteUser, getRole, getUsername, type UserSummary,
} from '../api/client'
import { useBoardStore } from '../store'
import { useTokens } from '../styles/themes'
import { WordmarkLockup, Corners, Dot, Kicker } from '../components/ui'

interface Props {
  onOpen: (id: string) => void
  onLogout: () => void
}

export default function OpsList({ onOpen, onLogout }: Props) {
  const t = useTokens()
  const theme = useBoardStore((s) => s.theme)
  const toggleTheme = useBoardStore((s) => s.toggleTheme)

  const isAdmin = getRole() === 'admin'
  const me = getUsername()

  const [ops, setOps] = useState<OpSummary[]>([])
  const [newName, setNewName] = useState('')
  const [renaming, setRenaming] = useState<string | null>(null)
  const [renamingVal, setRenamingVal] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null)
  const [page, setPage] = useState(0)
  const [createFocus, setCreateFocus] = useState(false)
  const [hovered, setHovered] = useState<string | null>(null)
  const importRef = useRef<HTMLInputElement>(null)

  // users panel (admin only)
  const [showUsers, setShowUsers] = useState(false)
  const [users, setUsers] = useState<UserSummary[]>([])
  const [newUsername, setNewUsername] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newRole, setNewRole] = useState<'user' | 'admin'>('user')
  const [userError, setUserError] = useState('')
  const [userCreating, setUserCreating] = useState(false)
  const [confirmDeleteUser, setConfirmDeleteUser] = useState<{ id: string; username: string } | null>(null)

  const loadUsers = () => listUsers().then(setUsers).catch(() => {})

  useEffect(() => {
    if (showUsers) loadUsers()
  }, [showUsers])

  const PAGE_SIZE = 8

  const load = () => listOps().then(setOps).catch(() => setError('api irraggiungibile'))
  useEffect(() => { load() }, [])

  const handleCreate = async () => {
    const name = newName.trim()
    if (!name) return
    try { await createOps(name); setNewName(''); setPage(0); load() }
    catch { setError('create failed') }
  }

  const handleDelete = async (id: string, name: string) => {
    setConfirmDelete({ id, name })
  }

  const confirmDoDelete = async () => {
    if (!confirmDelete) return
    await deleteOps(confirmDelete.id)
    setConfirmDelete(null)
    load()
  }

  const handleRename = async (id: string) => {
    const v = renamingVal.trim()
    if (!v) { setRenaming(null); return }
    await renameOps(id, v); setRenaming(null); load()
  }

  const handleCreateUser = async () => {
    if (!newUsername.trim() || !newPassword.trim()) return
    setUserError('')
    setUserCreating(true)
    try {
      await createUser(newUsername.trim(), newPassword.trim(), newRole)
      setNewUsername(''); setNewPassword(''); setNewRole('user')
      loadUsers()
    } catch (e: unknown) {
      setUserError(e instanceof Error ? e.message : 'errore')
    } finally {
      setUserCreating(false)
    }
  }

  const handleDeleteUser = async (id: string) => {
    await deleteUser(id).catch(() => {})
    loadUsers()
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try { await importOps(file); load() }
    catch { setError('import failed') }
    e.target.value = ''
  }

  const WEEK_MS = 7 * 24 * 60 * 60 * 1000
  const nowTs = Date.now()
  const activeCount = ops.filter((o) => o.updated_at && nowTs - new Date(o.updated_at).getTime() < WEEK_MS).length

  const topBtn: React.CSSProperties = {
    background: 'transparent', border: `1px solid ${t.border}`, color: t.textDim,
    padding: '6px 12px', borderRadius: 7, fontFamily: t.fontMono, fontSize: 10,
    letterSpacing: 1, cursor: 'pointer', transition: 'all 0.15s ease',
  }

  const inp: React.CSSProperties = {
    background: t.bgInput, border: `1px solid ${t.border}`, borderRadius: 8,
    padding: '10px 12px', color: t.text, fontFamily: t.fontMono, fontSize: 13,
    outline: 'none', flex: 1,
  }

  return (
    <div style={{ minHeight: '100vh', position: 'relative', background: t.bg, color: t.text, fontFamily: t.fontMono }}>
      <div className="atmosphere" />

      {/* ── top bar ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 24px',
        borderBottom: `1px solid ${t.border}`,
        background: theme === 'dark' ? 'rgba(8,9,12,0.72)' : 'rgba(236,234,227,0.78)',
        backdropFilter: 'blur(12px)',
      }}>
        <WordmarkLockup logo={44} />
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 7, marginRight: 8 }}>
            <Dot color={t.success} size={6} />
            <span style={{ fontSize: 10, color: t.textDim, letterSpacing: 1 }}>{me ?? 'operator'}</span>
          </span>
          {isAdmin && (
            <button
              onClick={() => setShowUsers((v) => !v)}
              style={{ ...topBtn, ...(showUsers ? { borderColor: t.accent, color: t.accent } : {}) }}
            >
              ◇ USERS
            </button>
          )}
          <button onClick={toggleTheme} style={topBtn}>{theme === 'dark' ? '◐ LIGHT' : '◑ DARK'}</button>
          <button onClick={onLogout} style={topBtn}>⏻ LOGOUT</button>
        </div>
      </div>

      {/* ── content ── */}
      <div style={{ position: 'relative', zIndex: 2, width: '100%', maxWidth: 880, margin: '0 auto', padding: '48px 24px 64px' }}>

        {/* hero / stats */}
        <div className="fade-up" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 20, marginBottom: 36 }}>
          <div>
            <Kicker color={t.accent}>// active engagements</Kicker>
            <h1 style={{
              fontFamily: t.fontDisplay, fontWeight: 700, fontSize: 40,
              letterSpacing: -0.5, margin: '10px 0 0', lineHeight: 1, color: t.text,
            }}>
              Operations
            </h1>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <Stat t={t} value={ops.length} label="operations" accent={t.accent} />
            <Stat t={t} value={activeCount} label="active · 7d" accent={t.info} />
          </div>
        </div>

        {error && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            color: t.accent, fontSize: 12, marginBottom: 22,
            border: `1px solid ${t.accentDim}`, background: t.accentSoft,
            borderRadius: 8, padding: '10px 14px',
          }}>
            <span style={{ fontWeight: 700 }}>⚠</span> {error} ·{' '}
            <span style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={() => { setError(null); load() }}>retry</span>
          </div>
        )}

        {/* ── users panel ── */}
        {isAdmin && showUsers && (
          <div style={{ position: 'relative', marginBottom: 32, border: `1px solid ${t.border}`, borderRadius: t.radius, background: t.bgSurface, padding: '22px 24px' }}>
            <Corners color={t.accent} gap={8} len={10} />
            <div style={{ marginBottom: 18 }}>
              <Kicker color={t.accent}>◇ access control</Kicker>
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
              <input
                style={{ ...inp, flex: '1 1 140px', minWidth: 140 }}
                placeholder="username"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateUser()}
              />
              <input
                type="password"
                style={{ ...inp, flex: '1 1 140px', minWidth: 140 }}
                placeholder="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateUser()}
              />
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as 'user' | 'admin')}
                style={{ ...inp, flex: '0 0 auto', cursor: 'pointer' }}
              >
                <option value="user">user</option>
                <option value="admin">admin</option>
              </select>
              <button
                onClick={handleCreateUser}
                disabled={userCreating}
                style={{
                  background: t.accent, border: `1px solid ${t.accent}`, color: '#fff',
                  padding: '10px 16px', borderRadius: 8, fontFamily: t.fontDisplay, fontSize: 12,
                  letterSpacing: 1, cursor: 'pointer', opacity: userCreating ? 0.6 : 1,
                }}
              >
                + CREATE
              </button>
            </div>
            {userError && <div style={{ color: t.accent, fontSize: 11, marginBottom: 12 }}>{userError}</div>}

            {users.length === 0 ? (
              <div style={{ color: t.textMuted, fontSize: 12 }}>no users.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {users.map((u) => (
                  <div key={u.id} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '9px 10px', borderRadius: 7,
                    background: u.username === me ? t.accentSoft : 'transparent',
                  }}
                    onMouseEnter={(e) => { if (u.username !== me) e.currentTarget.style.background = t.bgHover }}
                    onMouseLeave={(e) => { if (u.username !== me) e.currentTarget.style.background = 'transparent' }}
                  >
                    <span style={{ flex: 1, fontSize: 13, color: t.text }}>{u.username}</span>
                    <span style={{
                      fontSize: 9, padding: '2px 8px', borderRadius: 999, letterSpacing: 1, textTransform: 'uppercase',
                      border: `1px solid ${u.role === 'admin' ? t.accent : t.border}`,
                      color: u.role === 'admin' ? t.accent : t.textDim,
                    }}>
                      {u.role}
                    </span>
                    <span style={{ color: t.textMuted, fontSize: 10 }}>
                      {new Date(u.created_at).toLocaleDateString('en-US')}
                    </span>
                    <button
                      onClick={() => setConfirmDeleteUser({ id: u.id, username: u.username })}
                      style={{ color: t.textMuted, cursor: 'pointer', fontSize: 11, background: 'none', border: 'none' }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = t.accent)}
                      onMouseLeave={(e) => (e.currentTarget.style.color = t.textMuted)}
                    >
                      ✕ del
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── command bar ── */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 28 }}>
          <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center' }}>
            <span style={{ position: 'absolute', left: 13, color: createFocus ? t.accent : t.textMuted, fontSize: 13, pointerEvents: 'none' }}>▸</span>
            <input
              style={{
                ...inp, paddingLeft: 30,
                borderColor: createFocus ? t.accent : t.border,
                boxShadow: createFocus ? `0 0 0 3px ${t.accentSoft}` : 'none',
                transition: 'border-color 0.15s, box-shadow 0.15s',
              }}
              placeholder="new operation codename..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              onFocus={() => setCreateFocus(true)}
              onBlur={() => setCreateFocus(false)}
            />
          </div>
          <button
            onClick={handleCreate}
            style={{
              background: t.accent, border: `1px solid ${t.accent}`, color: '#fff',
              padding: '0 20px', borderRadius: 8, fontFamily: t.fontDisplay, fontSize: 13,
              letterSpacing: 1, cursor: 'pointer', boxShadow: `0 8px 22px -10px ${t.accentGlow}`,
            }}
          >
            + DEPLOY
          </button>
          <button
            onClick={() => importRef.current?.click()}
            style={{ ...topBtn, padding: '0 16px', fontSize: 11 }}
          >
            ↥ IMPORT
          </button>
          <input ref={importRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImport} />
        </div>

        {/* ── ops list ── */}
        {ops.length === 0 ? (
          <div style={{
            border: `1px dashed ${t.border}`, borderRadius: t.radius, padding: '52px 20px',
            textAlign: 'center', color: t.textMuted, fontSize: 13,
          }}>
            <div style={{ fontSize: 26, marginBottom: 10, opacity: 0.5 }}>⊘</div>
            no active operations. deploy one above.
          </div>
        ) : (() => {
          const totalPages = Math.ceil(ops.length / PAGE_SIZE)
          const pageOps = ops.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
          return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {pageOps.map((op, i) => {
              const isHovered = hovered === op.id
              return (
              <div
                key={op.id}
                className="fade-up"
                style={{
                  position: 'relative',
                  display: 'flex', alignItems: 'center', gap: 16,
                  padding: '16px 18px',
                  border: `1px solid ${isHovered ? t.borderFocus : t.border}`,
                  borderRadius: t.radius,
                  background: isHovered ? t.bgHover : t.bgSurface,
                  animationDelay: `${i * 35}ms`,
                  transition: 'border-color 0.15s, background 0.15s, transform 0.12s',
                  transform: isHovered ? 'translateY(-1px)' : 'none',
                }}
                onMouseEnter={() => setHovered(op.id)}
                onMouseLeave={() => setHovered(null)}
              >
                {isHovered && <Corners color={t.accent} gap={6} len={9} />}

                {/* index marker */}
                <span style={{ fontFamily: t.fontMono, fontSize: 11, color: t.textMuted, width: 28, flexShrink: 0 }}>
                  {String(page * PAGE_SIZE + i + 1).padStart(2, '0')}
                </span>

                {/* name */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  {renaming === op.id ? (
                    <input
                      style={{ background: t.bgInput, border: `1px solid ${t.accent}`, borderRadius: 6, color: t.text, fontFamily: t.fontMono, fontSize: 14, outline: 'none', width: '100%', padding: '4px 8px' }}
                      value={renamingVal}
                      autoFocus
                      onChange={(e) => setRenamingVal(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRename(op.id)
                        if (e.key === 'Escape') setRenaming(null)
                      }}
                      onBlur={() => handleRename(op.id)}
                    />
                  ) : (
                    <div
                      onClick={() => onOpen(op.id)}
                      style={{ cursor: 'pointer', fontFamily: t.fontDisplay, fontSize: 16, fontWeight: 600, color: isHovered ? t.accent : t.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', transition: 'color 0.15s' }}
                    >
                      {op.name}
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 5 }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      fontSize: 10, color: t.textDim,
                      border: `1px solid ${t.border}`, borderRadius: 999, padding: '1px 8px',
                    }}>
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: op.node_count ? t.info : t.textMuted }} />
                      {op.node_count} nodes
                    </span>
                  </div>
                </div>

                {/* actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  {[
                    { label: '↦ open',   primary: true,  fn: () => onOpen(op.id) },
                    { label: 'rename',   primary: false, fn: () => { setRenaming(op.id); setRenamingVal(op.name) } },
                    { label: 'export',   primary: false, fn: () => exportOps(op.id, op.name).catch(console.error) },
                    { label: 'del',      primary: false, danger: true, fn: () => handleDelete(op.id, op.name) },
                  ].map(({ label, primary, danger, fn }) => (
                    <button
                      key={label}
                      onClick={fn}
                      style={{
                        background: primary ? t.accent : 'transparent',
                        border: `1px solid ${primary ? t.accent : t.border}`,
                        color: primary ? '#fff' : danger ? t.textMuted : t.textDim,
                        padding: '5px 11px', borderRadius: 7, fontFamily: t.fontMono, fontSize: 11,
                        cursor: 'pointer', transition: 'all 0.13s',
                      }}
                      onMouseEnter={(e) => { if (!primary) { e.currentTarget.style.borderColor = danger ? t.accent : t.borderFocus; e.currentTarget.style.color = danger ? t.accent : t.text } }}
                      onMouseLeave={(e) => { if (!primary) { e.currentTarget.style.borderColor = t.border; e.currentTarget.style.color = danger ? t.textMuted : t.textDim } }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )})}

            {totalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 18 }}>
                <button
                  onClick={() => setPage((p) => p - 1)}
                  disabled={page === 0}
                  style={{ ...topBtn, opacity: page === 0 ? 0.4 : 1, cursor: page === 0 ? 'default' : 'pointer' }}
                >
                  ← PREV
                </button>
                <span style={{ color: t.textMuted, fontSize: 11, letterSpacing: 1 }}>
                  {String(page + 1).padStart(2, '0')} / {String(totalPages).padStart(2, '0')}
                </span>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page === totalPages - 1}
                  style={{ ...topBtn, opacity: page === totalPages - 1 ? 0.4 : 1, cursor: page === totalPages - 1 ? 'default' : 'pointer' }}
                >
                  NEXT →
                </button>
              </div>
            )}
          </div>
          )
        })()}
      </div>

      {/* ── delete confirm dialog ── */}
      {confirmDelete && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.66)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={() => setConfirmDelete(null)}
        >
          <div
            className="fade-up"
            style={{ position: 'relative', background: t.bgSurface, border: `1px solid ${t.border}`, borderRadius: t.radius + 2, padding: '30px 30px 26px', minWidth: 360, maxWidth: 460, boxShadow: t.shadow }}
            onClick={(e) => e.stopPropagation()}
          >
            <Corners color={t.accent} gap={8} len={12} />
            <Kicker color={t.accent}>⚠ destructive action</Kicker>
            <div style={{ fontFamily: t.fontDisplay, fontSize: 18, fontWeight: 600, margin: '12px 0 10px', color: t.text }}>
              Delete operation
            </div>
            <div style={{ color: t.textDim, fontSize: 13, marginBottom: 26, lineHeight: 1.6 }}>
              You are about to delete <span style={{ color: t.text, fontWeight: 600 }}>"{confirmDelete.name}"</span>. This action cannot be undone.
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setConfirmDelete(null)}
                style={{ background: 'transparent', border: `1px solid ${t.border}`, color: t.textDim, padding: '9px 18px', borderRadius: 8, fontFamily: t.fontMono, fontSize: 12, cursor: 'pointer' }}
              >
                cancel
              </button>
              <button
                onClick={confirmDoDelete}
                style={{ background: t.accent, border: `1px solid ${t.accent}`, color: '#fff', padding: '9px 18px', borderRadius: 8, fontFamily: t.fontDisplay, fontSize: 12, letterSpacing: 1, cursor: 'pointer' }}
              >
                DELETE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── delete user confirm dialog ── */}
      {confirmDeleteUser && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.66)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={() => setConfirmDeleteUser(null)}
        >
          <div
            className="fade-up"
            style={{ position: 'relative', background: t.bgSurface, border: `1px solid ${t.border}`, borderRadius: t.radius + 2, padding: '30px 30px 26px', minWidth: 360, maxWidth: 460, boxShadow: t.shadow }}
            onClick={(e) => e.stopPropagation()}
          >
            <Corners color={t.accent} gap={8} len={12} />
            <Kicker color={t.accent}>⚠ destructive action</Kicker>
            <div style={{ fontFamily: t.fontDisplay, fontSize: 18, fontWeight: 600, margin: '12px 0 10px', color: t.text }}>
              Delete user
            </div>
            <div style={{ color: t.textDim, fontSize: 13, marginBottom: 26, lineHeight: 1.6 }}>
              You are about to delete the account <span style={{ color: t.text, fontWeight: 600 }}>"{confirmDeleteUser.username}"</span>. This action cannot be undone.
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setConfirmDeleteUser(null)}
                style={{ background: 'transparent', border: `1px solid ${t.border}`, color: t.textDim, padding: '9px 18px', borderRadius: 8, fontFamily: t.fontMono, fontSize: 12, cursor: 'pointer' }}
              >
                cancel
              </button>
              <button
                onClick={() => { handleDeleteUser(confirmDeleteUser.id); setConfirmDeleteUser(null) }}
                style={{ background: t.accent, border: `1px solid ${t.accent}`, color: '#fff', padding: '9px 18px', borderRadius: 8, fontFamily: t.fontDisplay, fontSize: 12, letterSpacing: 1, cursor: 'pointer' }}
              >
                DELETE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Stat({ t, value, label, accent }: { t: ReturnType<typeof useTokens>; value: number; label: string; accent: string }) {
  return (
    <div style={{ position: 'relative', minWidth: 92, border: `1px solid ${t.border}`, borderRadius: t.radius, background: t.bgSurface, padding: '12px 16px' }}>
      <div style={{ position: 'absolute', top: 0, left: 12, right: 12, height: 2, background: accent, borderRadius: 2, opacity: 0.7 }} />
      <div style={{ fontFamily: t.fontDisplay, fontSize: 26, fontWeight: 700, color: t.text, lineHeight: 1 }}>
        {String(value).padStart(2, '0')}
      </div>
      <div style={{ fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', color: t.textMuted, marginTop: 6 }}>{label}</div>
    </div>
  )
}
