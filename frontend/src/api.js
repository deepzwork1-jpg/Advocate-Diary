const TOKEN_KEY = 'hearing-diary-token'

function readToken() {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function saveToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    // Storage can be blocked; the user just signs in again next visit.
  }
}

let onSignedOut = () => {}
export const setSignedOutHandler = (handler) => { onSignedOut = handler }

function errorMessage(body) {
  if (typeof body.detail === 'string') return body.detail
  // FastAPI validation errors arrive as a list, one entry per bad field.
  if (Array.isArray(body.detail) && body.detail[0]) {
    const { loc, msg } = body.detail[0]
    return `${loc[loc.length - 1]}: ${msg.replace(/^Value error, /, '')}`
  }
  return 'Something went wrong. Please try again.'
}

async function request(path, options = {}) {
  const token = readToken()
  const response = await fetch(`/api${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })
  if (response.status === 401 && token) {
    saveToken(null)
    onSignedOut()
  }
  if (!response.ok) {
    throw new Error(errorMessage(await response.json().catch(() => ({}))))
  }
  return response.status === 204 ? null : response.json()
}

const send = (method, body) => ({ method, body: JSON.stringify(body) })

export const api = {
  hasToken: () => Boolean(readToken()),
  register: (details) => request('/auth/register', send('POST', details)),
  login: (details) => request('/auth/login', send('POST', details)),
  me: () => request('/auth/me'),
  list: (params) => request(`/matters?${new URLSearchParams(params)}`),
  create: (matter) => request('/matters', send('POST', matter)),
  update: (id, fields) => request(`/matters/${id}`, send('PATCH', fields)),
  remove: (id) => request(`/matters/${id}`, { method: 'DELETE' }),
  stats: () => request('/stats'),
  upcoming: () => request('/hearings/upcoming'),
}
