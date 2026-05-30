'use client'

import { lazy, Suspense, use } from 'react'
import { useRouter, RouterProvider, type RoutePath } from '@/hooks/use-router'
import { AuthProvider, useAuth } from '@/hooks/use-auth'
import { LoginPage } from '@/components/login-page'
import { AiDraftsPage } from '@/components/ai-drafts-page'

const LandingPage = lazy(() => import('@/components/landing-page').then(m => ({ default: m.LandingPage })))
const DashboardPage = lazy(() => import('@/components/dashboard-page').then(m => ({ default: m.DashboardPage })))
const ComplaintsPage = lazy(() => import('@/components/complaints-page').then(m => ({ default: m.ComplaintsPage })))
const ComplaintDetailPage = lazy(() => import('@/components/complaint-detail-page').then(m => ({ default: m.ComplaintDetailPage })))
const EscalationsPage = lazy(() => import('@/components/escalations-page').then(m => ({ default: m.EscalationsPage })))
const SlaBreachesPage = lazy(() => import('@/components/sla-breaches-page').then(m => ({ default: m.SlaBreachesPage })))
const ThreeSixtyViewPage = lazy(() => import('@/components/three-sixty-view-page').then(m => ({ default: m.ThreeSixtyViewPage })))
const TrendsPage = lazy(() => import('@/components/trends-page').then(m => ({ default: m.TrendsPage })))
const RootCausePage = lazy(() => import('@/components/root-cause-page').then(m => ({ default: m.RootCausePage })))
const RegulatoryReportsPage = lazy(() => import('@/components/regulatory-reports-page').then(m => ({ default: m.RegulatoryReportsPage })))
const PipelineShowcasePage = lazy(() => import('@/components/pipeline-showcase-page').then(m => ({ default: m.PipelineShowcasePage })))
const SearchPage = lazy(() => import('@/components/search-page').then(m => ({ default: m.SearchPage })))
const SettingsPage = lazy(() => import('@/components/settings-page').then(m => ({ default: m.SettingsPage })))
const NotFoundPage = lazy(() => import('@/components/not-found').then(m => ({ default: m.NotFoundPage })))

function PageLoader() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-muted-foreground">Loading...</div>
    </div>
  )
}

function AppRouter() {
  const { router } = useRouter()
  const { isAuthenticated } = useAuth()

  if (!isAuthenticated && router.route !== 'landing') {
    return <LoginPage />
  }

  return (
    <Suspense fallback={<PageLoader />}>
      {router.route === 'login' && <LoginPage />}
      {router.route === 'landing' && <LandingPage />}
      {router.route === 'dashboard' && <DashboardPage />}
      {router.route === 'complaints' && <ComplaintsPage />}
      {router.route === 'complaint-detail' && <ComplaintDetailPage />}
      {router.route === 'escalations' && <EscalationsPage />}
      {router.route === 'sla-breaches' && <SlaBreachesPage />}
      {router.route === '360-view' && <ThreeSixtyViewPage />}
      {router.route === 'ai-drafts' && <AiDraftsPage />}
      {router.route === 'trends' && <TrendsPage />}
      {router.route === 'root-cause' && <RootCausePage />}
      {router.route === 'regulatory' && <RegulatoryReportsPage />}
      {router.route === 'pipeline' && <PipelineShowcasePage />}
      {router.route === 'search' && <SearchPage />}
      {router.route === 'settings' && <SettingsPage />}
      {!['login','landing','dashboard','complaints','complaint-detail','escalations','sla-breaches','360-view','ai-drafts','trends','root-cause','regulatory','pipeline','search','settings'].includes(router.route) && <NotFoundPage />}
    </Suspense>
  )
}

function getRouteFromSlug(slug: string[]): RoutePath {
  const path = '/' + slug.join('/')
  switch (path) {
    case '/login': return 'login'
    case '/dashboard': return 'dashboard'
    case '/complaints': return 'complaints'
    case '/complaint-detail': return 'complaint-detail'
    case '/escalations': return 'escalations'
    case '/sla-breaches': return 'sla-breaches'
    case '/360-view': return '360-view'
    case '/ai-drafts': return 'ai-drafts'
    case '/trends': return 'trends'
    case '/root-cause': return 'root-cause'
    case '/regulatory': return 'regulatory'
    case '/pipeline': return 'pipeline'
    case '/search': return 'search'
    case '/settings': return 'settings'
    default: return 'not-found'
  }
}

export default function CatchAllPage({
  params,
}: {
  params: Promise<{ slug: string[] }>
}) {
  const { slug } = use(params)
  const initialRoute = getRouteFromSlug(slug)

  return (
    <RouterProvider initialRoute={initialRoute}>
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </RouterProvider>
  )
}
