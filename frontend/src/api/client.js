// In development: VITE_API_BASE_URL is not set → uses '' → Vite proxy forwards /api/* to localhost:5000 → zero CORS issues
// In production:  set VITE_API_BASE_URL=https://your-backend.com in your Vercel / hosting env vars
const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

const getAccessToken = () => localStorage.getItem('accessToken') || ''
const setAccessToken = (token) => localStorage.setItem('accessToken', token)
const clearAccessToken = () => localStorage.removeItem('accessToken')

// Track if a token refresh is already in-flight to avoid duplicate refresh calls
let refreshPromise = null

async function doRefresh() {
  const response = await fetch(`${API_BASE}/api/v1/auth/refresh`, {
    method: 'GET',
    credentials: 'include', // send the refreshToken HttpOnly cookie
  })
  if (!response.ok) {
    // Refresh token is also expired or revoked — force logout
    clearAccessToken()
    // Dispatch a custom event so AuthContext can react and clear user state
    window.dispatchEvent(new CustomEvent('auth:logout'))
    throw new Error('Session expired. Please log in again.')
  }
  const data = await response.json()
  const newToken = data?.data?.accessToken
  if (newToken) setAccessToken(newToken)
  return newToken
}

async function refreshAccessToken() {
  // If a refresh is already in-flight, wait for it instead of firing another request
  if (!refreshPromise) {
    refreshPromise = doRefresh().finally(() => { refreshPromise = null })
  }
  return refreshPromise
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

  // ── Silent token refresh on 401 ──────────────────────────────────────────
  // Only attempt once (_retry flag) and only for authenticated requests
  if (response.status === 401 && auth && !_retry) {
    try {
      await refreshAccessToken()
      // Retry the original request with the new access token
      return apiFetch(path, { method, body, auth, headers, _retry: true })
    } catch {
      // Refresh also failed — the auth:logout event was already dispatched
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
