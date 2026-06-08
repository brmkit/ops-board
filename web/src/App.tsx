import { useState, useEffect } from 'react'
import OpsList from './pages/OpsList'
import OpsBoard from './pages/OpsBoard'
import Login from './pages/Login'
import { useBoardStore } from './store/index'
import { getToken, clearAuth } from './api/client'

function getHashId(): string | null {
  const h = window.location.hash.slice(1)
  return h || null
}

export default function App() {
  const [activeOpsId, setActiveOpsId] = useState<string | null>(() => getHashId())
  const [authed, setAuthed] = useState<boolean>(() => !!getToken())
  const theme = useBoardStore((s) => s.theme)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  // keep hash in sync with active ops
  useEffect(() => {
    window.location.hash = activeOpsId ?? ''
  }, [activeOpsId])

  // handle browser back/forward
  useEffect(() => {
    function onHashChange() {
      setActiveOpsId(getHashId())
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  function handleLogin() {
    setAuthed(true)
  }

  function handleLogout() {
    clearAuth()
    setAuthed(false)
    setActiveOpsId(null)
  }

  if (!authed) {
    return <Login onLogin={handleLogin} />
  }

  if (activeOpsId) {
    return (
      <OpsBoard
        opsId={activeOpsId}
        onClose={() => setActiveOpsId(null)}
        onLogout={handleLogout}
      />
    )
  }

  return <OpsList onOpen={setActiveOpsId} onLogout={handleLogout} />
}
