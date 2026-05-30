import type {
  AgentListItem,
  AgentLoad,
  CategoryBreakdown,
  ChannelDistribution,
  ClustersResponse,
  Complaint,
  ComplaintFilters,
  ComplaintHistoryResponse,
  ComplaintListResponse,
  CustomerProfile,
  DashboardKpis,
  DraftResponse,
  LoginRequest,
  LoginResponse,
  MyQueueResponse,
  RecentComplaintsResponse,
  TrendsResponse,
} from '@/types/complaint'

/**
 * Smart API base URL detection:
 *
 * 1. If NEXT_PUBLIC_API_BASE_URL is explicitly set → use it (highest priority)
 * 2. If running on the preview server (not localhost) → call backend directly
 *    at http://localhost:8888 (browser can reach it, but needs CORS on backend)
 * 3. If running locally → use empty string = same-origin, proxied through
 *    the Next.js API route (just like the original Vite dev server proxy)
 */
const API_BASE_URL: string = (() => {
  // 1. Explicit env override
  const envUrl = process.env.NEXT_PUBLIC_API_BASE_URL
  if (envUrl !== undefined && envUrl !== '') return envUrl

  // 2. Preview server: browser must call backend directly (server-side proxy can't reach localhost)
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return 'http://localhost:8888'
  }

  // 3. Local development: use same-origin proxy through Next.js API route
  return ''
})()
const TOKEN_KEY = 'uccd.access_token'
const USER_KEY = 'uccd.user'

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export interface StoredUser {
  role: LoginResponse['role']
  user_id: string
  name: string
  email: string
  expires_at: string
}

export function getStoredToken() {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(TOKEN_KEY)
}

export function getStoredUser(): StoredUser | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem(USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as StoredUser
  } catch {
    return null
  }
}

export function storeSession(token: string, user: StoredUser) {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

function toQuery(params: object) {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    query.set(key, String(value))
  })
  const text = query.toString()
  return text ? `?${text}` : ''
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken()
  const headers = new Headers(options.headers)
  headers.set('Content-Type', 'application/json')
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const url = `${API_BASE_URL}${path}`

  let response: Response
  try {
    response = await fetch(url, {
      ...options,
      headers,
      mode: API_BASE_URL ? 'cors' : undefined, // Explicit CORS for cross-origin calls
    })
  } catch (networkErr) {
    const backend = API_BASE_URL || 'same-origin (proxy)'
    const hint = API_BASE_URL
      ? 'Make sure your backend is running on localhost:8888 and has CORS enabled for the preview origin.'
      : 'Make sure your backend is running and the Next.js proxy can reach it.'
    throw new ApiError(
      0,
      `Cannot reach backend at ${backend}. ${hint} ` +
      `Error: ${networkErr instanceof Error ? networkErr.message : String(networkErr)}`
    )
  }

  if (response.status === 401) {
    clearSession()
    window.location.href = '/'
    throw new ApiError(401, 'Session expired')
  }

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`
    try {
      const payload = await response.json()
      message = payload.detail ?? message
    } catch {
      // keep default message
    }
    throw new ApiError(response.status, message)
  }

  return response.json() as Promise<T>
}

export const api = {
  async login(body: LoginRequest) {
    const response = await request<LoginResponse>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    })
    storeSession(response.access_token, {
      role: response.role,
      user_id: response.user_id,
      name: response.name,
      email: body.email,
      expires_at: response.expires_at,
    })
    return response
  },

  listComplaints(filters: ComplaintFilters = {}) {
    return request<ComplaintListResponse>(`/api/v1/complaints${toQuery(filters)}`)
  },

  getComplaint(id: string) {
    return request<Complaint>(`/api/v1/complaints/${id}`)
  },

  getCustomerProfile(customerId: string) {
    return request<CustomerProfile>(`/api/v1/complaints/customer/${encodeURIComponent(customerId)}`)
  },

  getComplaintHistory(id: string) {
    return request<ComplaintHistoryResponse>(`/api/v1/complaints/${id}/history`)
  },

  getDraft(id: string, tone = 'apologetic') {
    return request<DraftResponse>(`/api/v1/ai/draft/${id}${toQuery({ tone })}`)
  },

  respond(id: string, responseText: string) {
    return request<{ status: string; message: string; complaint_id: string; telegram_sent: boolean }>(
      `/api/v1/complaints/${id}/respond`,
      {
        method: 'POST',
        body: JSON.stringify({ response_text: responseText }),
      },
    )
  },

  assign(id: string) {
    return request<Complaint>(`/api/v1/complaints/${id}/assign`, { method: 'PUT' })
  },

  autoAssign(complaintIds: string[], department?: string) {
    return request<{ assigned: number; failed: number; assignments: Record<string, string | null> }>(
      '/api/v1/complaints/auto-assign',
      { method: 'POST', body: JSON.stringify({ complaint_ids: complaintIds, department }) },
    )
  },

  listDepartments() {
    return request<{ departments: string[] }>('/api/v1/complaints/departments')
  },

  getKpis() {
    return request<DashboardKpis>('/api/v1/dashboard/kpis')
  },

  getCategories() {
    return request<CategoryBreakdown>('/api/v1/dashboard/categories')
  },

  getChannels() {
    return request<ChannelDistribution>('/api/v1/dashboard/channels')
  },

  getRecentComplaints(limit = 10) {
    return request<RecentComplaintsResponse>(`/api/v1/dashboard/recent${toQuery({ limit })}`)
  },

  getMyQueue(limit = 20) {
    return request<MyQueueResponse>(`/api/v1/dashboard/my-queue${toQuery({ limit })}`)
  },

  getClusters() {
    return request<ClustersResponse>('/api/v1/dashboard/clusters')
  },

  updateStatus(id: string, newStatus: string) {
    return request<Complaint>(`/api/v1/complaints/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ new_status: newStatus }),
    })
  },

  getEscalations(filters: Pick<ComplaintFilters, 'page' | 'limit'> = {}) {
    return request<ComplaintListResponse>(`/api/v1/escalations${toQuery(filters)}`)
  },

  getAgentLoad() {
    return request<AgentLoad>('/api/v1/agents/load')
  },

  getAgentList() {
    return request<{ status: string; agents: AgentListItem[] }>('/api/v1/agents/list')
  },

  getPipelineRuns(limit = 20) {
    return request<{ status: string; runs: Record<string, unknown>[] }>(`/api/v1/pipeline/recent?limit=${limit}`)
  },

  getTrends(window = 7) {
    return request<TrendsResponse>(`/api/v1/analytics/trends${toQuery({ window })}`)
  },

  requestDetails(id: string) {
    return request<{ message: string; translated_message?: string }>(
      `/api/v1/complaints/${id}/request-details`,
      { method: 'POST' },
    )
  },

  updateUserDetails(id: string, details: {
    customer_name?: string
    customer_email?: string
    customer_phone?: string
    account_number?: string
  }) {
    return request<Complaint>(`/api/v1/complaints/${id}/details`, {
      method: 'PUT',
      body: JSON.stringify(details),
    })
  },
}

export { API_BASE_URL }
