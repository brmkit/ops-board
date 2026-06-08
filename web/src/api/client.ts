const BASE = '/api'

const TOKEN_KEY = 'rb-token'
const USERNAME_KEY = 'rb-username'
const ROLE_KEY = 'rb-role'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function getUsername(): string | null {
  return localStorage.getItem(USERNAME_KEY)
}

export function getRole(): string {
  return localStorage.getItem(ROLE_KEY) ?? 'user'
}

export function saveAuth(token: string, username: string, role: string) {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USERNAME_KEY, username)
  localStorage.setItem(ROLE_KEY, role)
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USERNAME_KEY)
  localStorage.removeItem(ROLE_KEY)
}

export interface OpSummary {
  id: string
  name: string
  created_at: string
  updated_at: string
  node_count: number
}

export interface Operation {
  id: string
  name: string
  created_at: string
  updated_at: string
  nodes: unknown[]
  edges: unknown[]
}

async function req<T>(url: string, init?: RequestInit): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    ...(init?.headers as Record<string, string>),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const r = await fetch(url, { ...init, headers })
  if (r.status === 401) {
    clearAuth()
    window.location.reload()
    throw new Error('unauthorized')
  }
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`)
  if (r.status === 204) return undefined as T
  return r.json()
}

export async function login(username: string, password: string): Promise<void> {
  const r = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  if (!r.ok) throw new Error('invalid credentials')
  const data = await r.json()
  saveAuth(data.token, data.username, data.role ?? 'user')
}

export interface UserSummary {
  id: string
  username: string
  role: string
  created_at: string
}

export function listUsers(): Promise<UserSummary[]> {
  return req(`${BASE}/users`)
}

export function createUser(username: string, password: string, role: string): Promise<UserSummary> {
  return req(`${BASE}/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, role }),
  })
}

export function deleteUser(id: string): Promise<void> {
  return req(`${BASE}/users/${id}`, { method: 'DELETE' })
}

export function listOps(): Promise<OpSummary[]> {
  return req(`${BASE}/ops`)
}

export function createOps(name: string): Promise<Operation> {
  return req(`${BASE}/ops`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  })
}

export function getOps(id: string): Promise<Operation> {
  return req(`${BASE}/ops/${id}`)
}

export function renameOps(id: string, name: string): Promise<Operation> {
  return req(`${BASE}/ops/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  })
}

export function deleteOps(id: string): Promise<void> {
  return req(`${BASE}/ops/${id}`, { method: 'DELETE' })
}

export function saveGraph(
  id: string,
  nodes: unknown[],
  edges: unknown[],
): Promise<{ ok: boolean; updated_at: string }> {
  return req(`${BASE}/ops/${id}/graph`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nodes, edges }),
  })
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export async function exportOps(id: string, name: string): Promise<void> {
  const data = await getOps(id)
  downloadBlob(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), `${name.replace(/\s+/g, '_')}.json`)
}

export async function importOps(file: File): Promise<Operation> {
  const fd = new FormData()
  fd.append('file', file)
  return req(`${BASE}/ops/import`, { method: 'POST', body: fd })
}

