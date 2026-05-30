'use client'

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'

export type RoutePath =
  | 'login'
  | 'landing'
  | 'dashboard'
  | 'complaints'
  | 'complaint-detail'
  | 'escalations'
  | 'sla-breaches'
  | '360-view'
  | 'ai-drafts'
  | 'trends'
  | 'root-cause'
  | 'regulatory'
  | 'pipeline'
  | 'search'
  | 'settings'
  | 'not-found'

const ROUTE_TO_PATH: Record<RoutePath, string> = {
  'login': '/login',
  'landing': '/',
  'dashboard': '/dashboard',
  'complaints': '/complaints',
  'complaint-detail': '/complaint-detail',
  'escalations': '/escalations',
  'sla-breaches': '/sla-breaches',
  '360-view': '/360-view',
  'ai-drafts': '/ai-drafts',
  'trends': '/trends',
  'root-cause': '/root-cause',
  'regulatory': '/regulatory',
  'pipeline': '/pipeline',
  'search': '/search',
  'settings': '/settings',
  'not-found': '/not-found',
}

const PATH_TO_ROUTE: Record<string, RoutePath> = {}
for (const [route, path] of Object.entries(ROUTE_TO_PATH)) {
  PATH_TO_ROUTE[path] = route as RoutePath
}

interface RouterState {
  route: RoutePath
  params: Record<string, string>
}

interface RouterContextValue {
  router: RouterState
  navigate: (route: RoutePath, params?: Record<string, string>) => void
  goBack: () => void
  history: RouterState[]
}

const RouterContext = createContext<RouterContextValue | null>(null)

const DEFAULT_ROUTE: RouterState = { route: 'landing', params: {} }

function getCurrentRoute(): RouterState {
  if (typeof window === 'undefined') return DEFAULT_ROUTE
  const { pathname, search } = window.location
  const route = PATH_TO_ROUTE[pathname] || 'not-found'
  const params: Record<string, string> = {}
  if (search) {
    const searchParams = new URLSearchParams(search)
    searchParams.forEach((value, key) => {
      params[key] = value
    })
  }
  return { route, params }
}

export function RouterProvider({ children, initialRoute }: { children: ReactNode; initialRoute?: RoutePath }) {
  const [router, setRouter] = useState<RouterState>(
    initialRoute ? { route: initialRoute, params: {} } : DEFAULT_ROUTE
  )
  const [history, setHistory] = useState<RouterState[]>([
    initialRoute ? { route: initialRoute, params: {} } : DEFAULT_ROUTE
  ])

  const navigate = useCallback((route: RoutePath, params: Record<string, string> = {}) => {
    const newState: RouterState = { route, params }
    setRouter(newState)
    setHistory((prev) => [...prev, newState])

    let urlPath = ROUTE_TO_PATH[route] || '/not-found'
    if (route === 'complaint-detail' && params.id) {
      urlPath = `/complaint-detail?id=${encodeURIComponent(params.id)}`
    } else if (Object.keys(params).length > 0) {
      const searchParams = new URLSearchParams(params)
      urlPath = `${ROUTE_TO_PATH[route] || '/not-found'}?${searchParams.toString()}`
    }
    window.history.pushState({}, '', urlPath)
  }, [])

  const goBack = useCallback(() => {
    setHistory((prev) => {
      if (prev.length <= 1) return prev
      const newHistory = prev.slice(0, -1)
      const prevState = newHistory[newHistory.length - 1]
      setRouter(prevState)
      return newHistory
    })
    window.history.back()
  }, [])

  useEffect(() => {
    const initialRoute = getCurrentRoute()
    setRouter(initialRoute)
    setHistory([initialRoute])

    const handlePopState = () => {
      const newState = getCurrentRoute()
      setRouter(newState)
      setHistory((prev) => [...prev, newState])
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  return (
    <RouterContext.Provider value={{ router, navigate, goBack, history }}>
      {children}
    </RouterContext.Provider>
  )
}

export function useRouter() {
  const context = useContext(RouterContext)
  if (!context) {
    throw new Error('useRouter must be used inside RouterProvider')
  }
  return context
}
