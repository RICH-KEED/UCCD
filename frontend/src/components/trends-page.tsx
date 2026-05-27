'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api-client'
import type { TrendPoint } from '@/types/complaint'
import { DashboardShell } from '@/components/dashboard-shell'
import type { ShellTab } from '@/components/dashboard-shell'
import { AppBreadcrumb } from '@/components/app-breadcrumb'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart, Bar } from 'recharts'
import { ArrowRight, Circle, Flame, Loader2, Search, TrendingUp, Zap } from 'lucide-react'

const SUPERVISOR_TABS: ShellTab[] = [
  { label: 'Dashboard', route: 'dashboard' },
  { label: 'Complaints', route: 'complaints' },
  { label: 'Escalations', route: 'escalations' },
  { label: 'SLA', route: 'sla-breaches' },
  { label: 'Trends', route: 'trends' },
]

const COMPLIANCE_TABS: ShellTab[] = [
  { label: 'Dashboard', route: 'dashboard' },
  { label: 'Regulatory', route: 'regulatory' },
  { label: 'SLA', route: 'sla-breaches' },
  { label: 'Trends', route: 'trends' },
]

type CategoryEntry = { name: string; count: number }

export function TrendsPage() {
  const [dateRange, setDateRange] = useState('Last 7d')
  const [compare, setCompare] = useState('Week vs Week')
  const [data, setData] = useState<TrendPoint[]>([])
  const [categories, setCategories] = useState<CategoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeFilter, setActiveFilter] = useState('All')
  const [activeView, setActiveView] = useState('Charts')

  const tabs = SUPERVISOR_TABS

  const filterOptions = ['All', 'UPI', 'Cards', 'NetBanking', 'Loans', 'Critical', 'Negative', 'Premium']
  const viewOptions = ['Charts', 'Heatmaps', 'Tables', 'Forecast']

  useEffect(() => {
    setLoading(true); setError(null)
    const days = dateRange === 'Last 24h' ? 1 : dateRange === 'Last 30d' ? 30 : 7
    api.getTrends(days)
      .then((res) => {
        setData(res.daily_volume)
        setCategories(Object.entries(res.category_distribution).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count))
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load trends'))
      .finally(() => setLoading(false))
  }, [dateRange])

  const totalComplaints = data.reduce((sum, d) => sum + d.count, 0)
  const lastData = data.length >= 2 ? data[data.length - 1] : null
  const prevData = data.length >= 2 ? data[data.length - 2] : null
  const trendGrowth = lastData && prevData && prevData.count > 0 ? Math.round(((lastData.count - prevData.count) / prevData.count) * 100) : 0

  if (loading) return <DashboardShell activeItem="Trends" tabs={tabs} activeTab="Trends"><div className="flex items-center justify-center min-h-[400px]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></DashboardShell>
  if (error) return <DashboardShell activeItem="Trends" tabs={tabs} activeTab="Trends"><div className="flex flex-col items-center justify-center min-h-[400px] gap-4"><div className="text-sm text-destructive">{error}</div><Button onClick={() => window.location.reload()}>Retry</Button></div></DashboardShell>

  return (
    <DashboardShell
      activeItem="Trends"
      tabs={tabs}
      activeTab="Trends"
      searchPlaceholder="Search trend, product, complaint type..."
      breadcrumb={
        <AppBreadcrumb
          current="Trends"
          meta={`${totalComplaints.toLocaleString()} complaints`}
          actions={<select value={dateRange} onChange={(e) => setDateRange(e.target.value)} className="px-3 py-1.5 rounded-lg border border-border text-xs font-semibold text-foreground/80 bg-background cursor-pointer outline-none">{['Last 24h', 'Last 7d', 'Last 30d', 'Custom Range'].map((o) => <option key={o} value={o}>{o}</option>)}</select>}
        />
      }
    >
      <div className="p-5">
        {/* Filter Bar */}
        <div className="bg-card border border-border rounded-lg px-4 py-2.5 flex items-center gap-2.5 flex-wrap mb-5">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[.3px]">Filter</span>
          {filterOptions.map((f) => <button key={f} type="button" onClick={() => setActiveFilter(f)} className={`px-3 py-1 rounded-full text-[11px] font-semibold border cursor-pointer whitespace-nowrap transition-all ${activeFilter === f ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-card text-muted-foreground'}`}>{f}</button>)}
          <div className="w-px h-6 bg-border mx-1" />
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[.3px]">Compare</span>
          <select value={compare} onChange={(e) => setCompare(e.target.value)} className="px-2 py-1 rounded-md border border-border text-xs font-medium text-foreground/80 bg-muted cursor-pointer outline-none">{['Today vs Yesterday', 'Week vs Week', 'Month vs Month'].map((o) => <option key={o} value={o}>{o}</option>)}</select>
          <div className="flex border border-border rounded-md overflow-hidden ml-auto">{viewOptions.map((m) => <button key={m} type="button" onClick={() => setActiveView(m)} className={`px-2.5 py-1 text-[11px] font-medium border-none cursor-pointer ${activeView === m ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground'}`}>{m}</button>)}</div>
        </div>

        <div className="flex flex-col gap-6">
          {/* Main Chart */}
          <Card className="p-5 bg-card border-border shadow-sm">
            <h4 className="text-[13px] font-semibold text-foreground/80 mb-1">Complaint Volume Over Time</h4>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={data}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" /><XAxis dataKey="date" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} /><YAxis tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} /><Tooltip /><Area type="monotone" dataKey="count" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.08} strokeWidth={2} /></AreaChart>
            </ResponsiveContainer>
          </Card>

          {/* 3 columns */}
          <div className="grid grid-cols-3 gap-5 items-start">
            <Card className="p-5 bg-card border-border shadow-sm"><CardTitle className="text-sm font-bold text-foreground mb-4">Category Trends</CardTitle>
              <div className="flex flex-col gap-3">
                {categories.slice(0, 6).map((cat, _i) => {
                  const maxCount = categories[0]?.count ?? 1; const pct = Math.round((cat.count / maxCount) * 100)
                  const colors = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))', 'hsl(var(--primary))']
                  return <div key={cat.name} className="flex items-center gap-2.5"><span className="flex-1 text-xs font-semibold text-foreground">{cat.name}</span><span className="text-[13px] font-bold" style={{ color: colors[_i % colors.length] }}>{pct}%</span></div>
                })}
              </div>
            </Card>

            <Card className="p-5 bg-card border-border shadow-sm"><CardTitle className="text-sm font-bold text-foreground mb-4">Channel Trends</CardTitle>
              <div className="flex flex-col gap-2.5">
                {[{ ch: 'WhatsApp', pct: 42, color: 'hsl(var(--success))' }, { ch: 'App', pct: 31, color: 'hsl(var(--primary))' }, { ch: 'Email', pct: 17, color: 'hsl(var(--chart-1))' }, { ch: 'IVR', pct: 10, color: 'hsl(var(--warning))' }].map((item) => (
                  <div key={item.ch}><div className="flex justify-between mb-1 text-[11px]"><span className="text-muted-foreground">{item.ch}</span><span className="font-bold text-foreground">{item.pct}%</span></div><div className="h-1.5 rounded bg-muted overflow-hidden"><div className="h-full rounded" style={{ width: `${item.pct}%`, background: item.color }} /></div></div>
                ))}
              </div>
            </Card>

            <Card className="p-5 bg-card border-border shadow-sm"><CardTitle className="text-sm font-bold text-foreground mb-3">Sentiment Trends</CardTitle>
              <div className="flex justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Circle aria-hidden="true" className="h-3 w-3 text-success" style={{ fill: 'hsl(var(--success))' }} />
                  <ArrowRight aria-hidden="true" className="h-3 w-3 text-muted-foreground" />
                  <Circle aria-hidden="true" className="h-3 w-3 text-warning" style={{ fill: 'hsl(var(--warning))' }} />
                  <ArrowRight aria-hidden="true" className="h-3 w-3 text-muted-foreground" />
                  <Circle aria-hidden="true" className="h-3 w-3 text-destructive" style={{ fill: 'hsl(var(--destructive))' }} />
                </div>
                <span className="text-xs font-bold text-destructive">+18% this week</span>
              </div>
              <ResponsiveContainer width="100%" height={80}>
                <LineChart data={[20, 35, 50, 55, 65, 78, 82].map((v, i) => ({ day: i, val: v }))}><Line type="monotone" dataKey="val" stroke="hsl(var(--destructive))" strokeWidth={2} dot={false} /></LineChart>
              </ResponsiveContainer>
              <div className="mt-2 text-[11px] text-destructive font-semibold">Negative sentiment: +18% this week</div>
            </Card>
          </div>

          {/* Bottom 3 columns */}
          <div className="grid grid-cols-3 gap-5 items-start">
            <Card className="p-5 bg-card border-border shadow-sm">
              <div className="flex items-center gap-1.5 mb-4"><div className="w-[22px] h-[22px] rounded-md bg-primary flex items-center justify-center"><TrendingUp className="h-3 w-3 text-primary-foreground" /></div><h3 className="text-[13px] font-bold text-foreground m-0">Trend Intelligence</h3></div>
              <div className="flex flex-col gap-3">
                <div><div className="text-[10px] font-bold text-muted-foreground uppercase tracking-[.3px] mb-1">Emerging Pattern</div><p className="text-[11px] text-muted-foreground leading-relaxed m-0">Volume trend: <strong className={trendGrowth > 0 ? 'text-destructive' : 'text-success'}>{trendGrowth > 0 ? '+' : ''}{trendGrowth}%</strong> change from previous period</p></div>
                <div className="bg-muted border border-border rounded-lg p-3">
                  <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-[.3px] mb-1.5">Recommendation</div>
                  <ul className="list-disc pl-4 text-[11px] text-foreground/80 leading-relaxed m-0"><li>Monitor volume trends daily</li><li>Alert on category spikes</li><li>Track sentiment shifts</li></ul>
                </div>
              </div>
            </Card>

            <Card className="p-5 bg-card border-border shadow-sm"><CardTitle className="text-sm font-bold text-foreground mb-4">Category Breakdown</CardTitle>
              <div className="flex flex-col gap-3">
                {categories.slice(0, 5).map((cat, _i) => {
                  const maxCount = categories[0]?.count ?? 1; const pct = Math.min(Math.round((cat.count / Math.max(maxCount, 1)) * 100), 100)
                  const severityLabels = ['Critical', 'High', 'Medium', 'High', 'Low']
                  return (
                    <div key={cat.name} className="p-3 rounded-lg border border-border">
                      <div className="flex justify-between mb-1"><span className="text-xs font-semibold text-foreground">{cat.name}</span><Badge variant="outline" className="text-[10px] font-bold text-destructive bg-destructive/10 border-transparent">{severityLabels[_i] || 'Medium'}</Badge></div>
                      <div className="text-[11px] text-muted-foreground mb-1">{cat.count} complaints</div>
                      <div className="h-[5px] rounded bg-muted overflow-hidden mb-1"><div className="h-full rounded bg-destructive" style={{ width: `${pct}%` }} /></div>
                      <div className="flex justify-between text-[10px]">
                        <span className="text-destructive font-bold">{pct}% of total</span>
                        <span className="inline-flex items-center gap-1">
                          {cat.count > 20 ? (
                            <><Flame aria-hidden="true" className="h-3 w-3 text-destructive" /> Rising</>
                          ) : (
                            <><Zap aria-hidden="true" className="h-3 w-3 text-warning" /> Stable</>
                          )}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </Card>

            <Card className="p-5 bg-card border-border shadow-sm"><CardTitle className="text-sm font-bold text-foreground mb-3">Forecasting</CardTitle>
              {data.length > 0 ? (
                <ResponsiveContainer width="100%" height={120}>
                  <ComposedChart data={[...data, ...Array.from({ length: 3 }, (_, i) => ({ date: `f+${i + 1}`, count: Math.round(data.slice(-3).reduce((s, d) => s + d.count, 0) / 3) }))].map((d, i) => ({ ...d, idx: i }))}>
                    <Bar dataKey="count" fill="hsl(var(--primary))" opacity={0.8} />
                    <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} />
                    <Tooltip />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : <div className="h-[100px] flex items-center justify-center text-muted-foreground text-[13px]">No data</div>}
              <div className="mt-2.5 p-2.5 rounded-lg bg-muted border border-border text-[11px] text-muted-foreground leading-relaxed">
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-[.3px] mb-1">Contributors</div>
                Historical spikes · Current escalation growth · Sentiment deterioration
              </div>
            </Card>
          </div>
        </div>
      </div>
    </DashboardShell>
  )
}
