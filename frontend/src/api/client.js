const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

const AUTH_CHANNEL = 'codearena-auth'
const authChannel = typeof BroadcastChannel !== 'undefined'
  ? new BroadcastChannel(AUTH_CHANNEL)
  : null

const getAccessToken = () => localStorage.getItem('accessToken') || ''
const setAccessToken = (token) => localStorage.setItem('accessToken', token)
const clearAccessToken = () => localStorage.removeItem('accessToken')

export function isAccessTokenExpired(token, bufferSec = 90) {
  if (!token) return true
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.exp * 1000 <= Date.now() + bufferSec * 1000
  } catch {
    return true
  }
}

let refreshPromise = null

function broadcastToken(accessToken) {
  authChannel?.postMessage({ type: 'token', accessToken })
  window.dispatchEvent(new CustomEvent('auth:tokenRefreshed', { detail: { accessToken } }))
}

authChannel?.addEventListener('message', (event) => {
  const token = event.data?.accessToken
  if (event.data?.type === 'token' && token) {
    setAccessToken(token)
    window.dispatchEvent(new CustomEvent('auth:tokenRefreshed', { detail: { accessToken: token } }))
  }
})

async function doRefresh(retry = false) {
  const response = await fetch(`${API_BASE}/api/v1/auth/refresh`, {
    method: 'GET',
    credentials: 'include',
  })

  if (response.status === 401 && !retry) {
    await new Promise((r) => setTimeout(r, 200))
    return doRefresh(true)
  }

  if (!response.ok) {
    clearAccessToken()
    window.dispatchEvent(new CustomEvent('auth:logout'))
    throw new Error('Session expired. Please log in again.')
  }

  const data = await response.json()
  const newToken = data?.data?.accessToken
  if (newToken) {
    setAccessToken(newToken)
    broadcastToken(newToken)
  }
  return newToken
}

export async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = doRefresh().finally(() => { refreshPromise = null })
  }
  return refreshPromise
}

export async function ensureValidAccessToken() {
  const token = getAccessToken()
  if (token && !isAccessTokenExpired(token)) return token
  return refreshAccessToken()
}

export async function apiFetch(path, { method = 'GET', body, auth = false, headers = {}, _retry = false } = {}) {
  const finalHeaders = {
    'Content-Type': 'application/json',
    ...headers,
  }

  if (auth) {
    const token = getAccessToken()
    if (token) finalHeaders.Authorization = `Bearer ${token}`
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: finalHeaders,
    credentials: 'include',
    body: body ? JSON.stringify(body) : undefined,
  })

  if (response.status === 401 && auth && !_retry) {
    try {
      await refreshAccessToken()
      return apiFetch(path, { method, body, auth, headers, _retry: true })
    } catch {
      throw new Error('Session expired. Please log in again.')
    }
  }

  const isJson = response.headers.get('content-type')?.includes('application/json')
  const data = isJson ? await response.json() : null

  if (!response.ok) {
    const message = data?.message || data?.error || response.statusText
    throw new Error(message || 'Request failed')
  }

  return data
}
