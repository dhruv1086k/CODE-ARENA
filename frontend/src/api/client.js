const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const getAccessToken = () => {
  return localStorage.getItem('accessToken') || '';
};

export async function apiFetch(path, { method = 'GET', body, auth = false, headers = {} } = {}) {
  const finalHeaders = {
    'Content-Type': 'application/json',
    ...headers,
  };

  if (auth) {
    const token = getAccessToken();
    if (token) {
      finalHeaders.Authorization = `Bearer ${token}`;
    }
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: finalHeaders,
    credentials: 'include',
    body: body ? JSON.stringify(body) : undefined,
  });

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await response.json() : null;

  if (!response.ok) {
    const message = data?.message || data?.error || response.statusText;
    throw new Error(message || 'Request failed');
  }

  return data;
}

