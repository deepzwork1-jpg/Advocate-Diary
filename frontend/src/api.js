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
    const message = msg.replace(/^Value error, /, '')
    const field = loc[loc.length - 1]
    return field === 'body' ? message : `${field}: ${message}`
  }
  return 'Something went wrong. Please try again.'
}

async function send(path, options = {}) {
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
  return response
}

async function request(path, options) {
  const response = await send(path, options)
  return response.status === 204 ? null : response.json()
}

const withBody = (method, body) => ({ method, body: JSON.stringify(body) })
const query = (params) => new URLSearchParams(params).toString()

export const api = {
  hasToken: () => Boolean(readToken()),
  register: (details) => request('/auth/register', withBody('POST', details)),
  login: (details) => request('/auth/login', withBody('POST', details)),
  me: () => request('/auth/me'),

  listMatters: (params) => request(`/matters?${query(params)}`),
  getMatter: (id) => request(`/matters/${id}`),
  createMatter: (matter) => request('/matters', withBody('POST', matter)),
  updateMatter: (id, fields) => request(`/matters/${id}`, withBody('PATCH', fields)),
  deleteMatter: (id) => request(`/matters/${id}`, { method: 'DELETE' }),
  exportMatters: async (params) => (await send(`/matters/export?${query(params)}`)).blob(),

  listHearings: (id) => request(`/matters/${id}/hearings`),
  recordHearing: (id, hearing) => request(`/matters/${id}/hearings`, withBody('POST', hearing)),

  listTasks: (params = {}) => request(`/tasks?${query(params)}`),
  createTask: (id, task) => request(`/matters/${id}/tasks`, withBody('POST', task)),
  updateTask: (id, fields) => request(`/tasks/${id}`, withBody('PATCH', fields)),
  deleteTask: (id) => request(`/tasks/${id}`, { method: 'DELETE' }),

  stats: () => request('/stats'),
  upcoming: (days = 7) => request(`/hearings/upcoming?days=${days}`),
  activity: (limit = 8) => request(`/activity?limit=${limit}`),
  matterActivity: (id) => request(`/matters/${id}/activity`),
  calendar: (start, end) => request(`/calendar?${query({ start, end })}`),
  analytics: () => request('/analytics'),
}
