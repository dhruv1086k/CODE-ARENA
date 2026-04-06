// In development: VITE_API_BASE_URL is not set → uses '' → Vite proxy forwards /api/* to localhost:5000 → zero CORS issues
// In production:  set VITE_API_BASE_URL=https://your-backend.com in your Vercel / hosting env vars
const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

const getAccessToken = () => localStorage.getItem('accessToken') || ''

export async function apiFetch(path, { method = 'GET', body, auth = false, headers = {} } = {}) {
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

  const isJson = response.headers.get('content-type')?.includes('application/json')
  const data = isJson ? await response.json() : null

  if (!response.ok) {
    const message = data?.message || data?.error || response.statusText
    throw new Error(message || 'Request failed')
  }

  return data
}
