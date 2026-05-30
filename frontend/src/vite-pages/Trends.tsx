import { useState, useEffect } from 'react'
import { AppSidebar } from '../layout/AppSidebar'
import { api } from '../api/client'
import type { TrendPoint } from '../types/complaint'

function Sparkline({ growth }: { growth: number }) {
  const w = 80; const h = 24; const pad = 4; const points = 6
  const seg = (w - pad * 2) / (points - 1)
  const mid = (h - pad * 2) / 2 + pad
  const vals = Array.from({ length: points }, (_, i) => {
    const t = i / (points - 1)
    return growth > 0
      ? mid - (h - pad * 2) * 0.35 * t - Math.sin(t * Math.PI) * (h - pad * 2) * 0.3 * (growth / 100)
      : mid + (h - pad * 2) * 0.35 * t * (-growth / 100) + Math.sin(t * Math.PI) * (h - pad * 2) * 0.2 * (-growth / 100)
  })
  const d = vals.map((v, i) => `${i === 0 ? 'M' : 'L'} ${pad + i * seg} ${v}`).join(' ')
  const c = growth > 0 ? '#DC2626' : growth < 0 ? '#16A34A' : '#6B7280'
  return <svg width={w} height={h}><path d={d} fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
}

function MainTrendChart({ data }: { data: TrendPoint[] }) {
  const w = 700; const h = 200; const pad = 30
  const maxVal = Math.max(...data.map((d) => d.count), 1) * 1.3
  const chH = h - pad * 2
  const chW = w - pad * 2
  const labels = data.map((d) => {
    const dt = new Date(d.date)
    return dt.toLocaleDateString('en-US', { weekday: 'short' })
  })
  const xStep = chW / Math.max(data.length - 1, 1)

  const yPos = (v: number) => pad + chH * (1 - v / maxVal)
  const lineD = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${pad + i * xStep} ${yPos(d.count)}`).join(' ')

  const yTicks = 4
  const ySteps = Array.from({ length: yTicks + 1 }, (_, i) => Math.round((maxVal / yTicks) * i))

  return (
    <div>
      <h4 style={{ margin: '0 0 4px 0', fontSize: 13, fontWeight: 600, color: '#374151' }}>Complaint Volume Over Time</h4>
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid meet" style={{ width: '100%', height: 'auto' }}>
        {ySteps.map((v) => {
          const y = yPos(v)
          return <g key={v}>
            <line x1={pad} y1={y} x2={w - pad} y2={y} stroke="#F3F4F6" strokeWidth="1" />
            <text x={pad - 4} y={y + 3} textAnchor="end" fontSize="9" fill="#9CA3AF">{v}</text>
          </g>
        })}
        {labels.map((l, i) => (
          <text key={`${l}-${i}`} x={pad + i * xStep} y={h - 6} textAnchor="middle" fontSize="9" fill="#9CA3AF">{l}</text>
        ))}
        <path d={lineD} fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d={`${lineD} L${pad + (data.length - 1) * xStep} ${pad + chH} L${pad} ${pad + chH} Z`} fill="rgba(59,130,246,.08)" stroke="none" />
      </svg>
    </div>
  )
}

function SentimentChart() {
  const w = 280; const h = 80; const pad = 16; const points = 7
  const vals = [20, 35, 50, 55, 65, 78, 82]
  const chW = w - pad * 2; const chH = h - pad * 2
  const d = vals.map((v, i) => `${i === 0 ? 'M' : 'L'} ${pad + (i * chW) / (points - 1)} ${pad + chH * (1 - v / 100)}`).join(' ')
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ display: 'flex', gap: 8, fontSize: 13 }}>
          <span>🟢</span><span style={{ color: '#9CA3AF' }}>→</span><span>🟡</span><span style={{ color: '#9CA3AF' }}>→</span><span>🔴</span>
        </div>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#DC2626' }}>+18% this week</span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h}>
        <line x1={pad} y1={pad + chH} x2={w - pad} y2={pad + chH} stroke="#F3F4F6" strokeWidth="1" />
        <path d={d} fill="url(#sentGrad)" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <defs>
          <linearGradient id="sentGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#DC2626" stopOpacity=".15" />
            <stop offset="100%" stopColor="#DC2626" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  )
}

function ForecastChart({ data }: { data: TrendPoint[] }) {
  const w = 280; const h = 80; const pad = 12
  const baseVals = data.map((d) => d.count)
  const forecastLen = Math.min(3, Math.max(2, Math.floor(data.length / 3)))
  const forecast: number[] = []
  if (baseVals.length >= 3) {
    for (let i = 0; i < forecastLen; i++) {
      const window = baseVals.length >= 3 ? baseVals.slice(-3) : baseVals
      const avg = window.reduce((a, b) => a + b, 0) / window.length
      forecast.push(Math.round(avg))
    }
  }

  const maxVal = Math.max(...baseVals, ...forecast) * 1.2
  const chW = w - pad * 2; const chH = h - pad * 2
  const dx = chW / (baseVals.length + forecast.length - 1)

  const actD = baseVals.map((v, i) => `${i === 0 ? 'M' : 'L'} ${pad + i * dx} ${pad + chH * (1 - v / maxVal)}`).join(' ')
  const foreD = forecast.map((v, i) => `L ${pad + (baseVals.length + i) * dx} ${pad + chH * (1 - v / maxVal)}`).join(' ')

  return (
    <div>
      <div style={{ marginBottom: 4, fontSize: 11, color: '#6B7280' }}>
        Forecast: next {forecastLen} {data[0]?.date ? `periods` : 'days'}
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h}>
        <line x1={pad} y1={pad + chH} x2={w - pad} y2={pad + chH} stroke="#F3F4F6" strokeWidth="1" />
        <path d={`${actD} L${pad + (baseVals.length - 1) * dx} ${pad + chH} L${pad} ${pad + chH} Z`} fill="rgba(59,130,246,.08)" stroke="none" />
        <path d={actD} fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" />
        <path d={`M ${pad + (baseVals.length - 1) * dx} ${pad + chH * (1 - baseVals[baseVals.length - 1] / maxVal)}` + foreD}
          fill="none" stroke="#DC2626" strokeWidth="2" strokeDasharray="4 3" strokeLinecap="round" />
        <line x1={pad + (baseVals.length - 1) * dx} y1={pad} x2={pad + (baseVals.length - 1) * dx} y2={pad + chH} stroke="#E5E7EB" strokeWidth="1" strokeDasharray="3 3" />
        <text x={pad + (baseVals.length - 1) * dx + 4} y={10} fontSize="8" fill="#9CA3AF">Now</text>
      </svg>
    </div>
  )
}

type CategoryEntry = { name: string; count: number }

export function Trends() {
  const [dateRange, setDateRange] = useState('Last 7d')
  const [compare, setCompare] = useState('Week vs Week')
  const [data, setData] = useState<TrendPoint[]>([])
  const [categories, setCategories] = useState<CategoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeFilter, setActiveFilter] = useState('All')
  const [activeView, setActiveView] = useState('Charts')
  
  // SLA compliance data
  const [slaCompliance, setSlaCompliance] = useState<{ met: number; breached: number; complianceRate: number } | null>(null)

  const filterOptions = ['All', 'UPI', 'Cards', 'NetBanking', 'Loans', 'Critical', 'Negative', 'Premium']
  const viewOptions = ['Charts', 'Heatmaps', 'Tables', 'Forecast']

   useEffect(() => {
     setLoading(true)
     setError(null)
     const days = dateRange === 'Last 24h' ? 1 : dateRange === 'Last 30d' ? 30 : 7
     api.getTrends(days)
       .then((res) => {
         setData(res.daily_volume)
         const cats: CategoryEntry[] = Object.entries(res.category_distribution)
           .map(([name, count]) => ({ name, count }))
           .sort((a, b) => b.count - a.count)
         setCategories(cats)
         // Store SLA compliance data
         if (res.sla_compliance) {
           setSlaCompliance({
             met: res.sla_compliance.met,
             breached: res.sla_compliance.breached,
             complianceRate: res.sla_compliance.compliance_rate
           })
         }
       })
       .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load trends'))
       .finally(() => setLoading(false))
   }, [dateRange])

  const totalComplaints = data.reduce((sum, d) => sum + d.count, 0)

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
        <AppSidebar activeItem="Trends" />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F5F6FA' }}>
          <div style={{ width: 32, height: 32, border: '3px solid #E5E7EB', borderTopColor: '#3B82F6', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
        <AppSidebar activeItem="Trends" />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#F5F6FA', gap: 16 }}>
          <div style={{ fontSize: 14, color: '#DC2626' }}>{error}</div>
          <button onClick={() => window.location.reload()} style={{ padding: '8px 20px', borderRadius: 8, background: '#3B82F6', color: 'white', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Retry</button>
        </div>
      </div>
    )
  }

  const lastData = data.length >= 2 ? data[data.length - 1] : null
  const prevData = data.length >= 2 ? data[data.length - 2] : null
  const trendGrowth = lastData && prevData && prevData.count > 0
    ? Math.round(((lastData.count - prevData.count) / prevData.count) * 100)
    : 0

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <AppSidebar activeItem="Trends" />
      <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', background: '#F5F6FA' }}>
        <header style={{
          height: 56, background: 'white', borderBottom: '1px solid #E5E7EB',
          display: 'flex', alignItems: 'center', padding: '0 28px', gap: 16,
        }}>
          <h1 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: 0, whiteSpace: 'nowrap', flexShrink: 0 }}>Trends</h1>
          <div style={{ flex: 1, minWidth: 0, maxWidth: 460, height: 36, borderRadius: 20, background: '#F3F4F6', display: 'flex', alignItems: 'center', padding: '0 14px', gap: 8 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.3-4.3" />
            </svg>
            <input type="text" placeholder="Search trend, product, complaint type..."
              style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: 13, color: '#374151' }} />
          </div>
          <select value={dateRange} onChange={(e) => setDateRange(e.target.value)}
            style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 12, fontWeight: 600, color: '#374151', background: 'white', cursor: 'pointer', flexShrink: 0, outline: 'none' }}>
            {['Last 24h', 'Last 7d', 'Last 30d', 'Custom Range'].map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </header>

        <div style={{
          background: 'white', borderBottom: '1px solid #E5E7EB',
          padding: '10px 28px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
          position: 'sticky', top: 0, zIndex: 10,
        }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '.3px' }}>Filter</span>
          {filterOptions.map((f) => (
            <button key={f} type="button" onClick={() => setActiveFilter(f)}
              style={{
                padding: '4px 12px', borderRadius: 999, fontSize: 11, fontWeight: 600,
                border: `1px solid ${activeFilter === f ? '#4F46E5' : '#E5E7EB'}`,
                background: activeFilter === f ? '#EEF2FF' : 'white',
                color: activeFilter === f ? '#4F46E5' : '#6B7280',
                cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all .15s',
              }}>{f}</button>
          ))}
          <div style={{ width: 1, height: 24, background: '#E5E7EB', margin: '0 4px' }} />
          <span style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '.3px' }}>Compare</span>
          <select value={compare} onChange={(e) => setCompare(e.target.value)}
            style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #E5E7EB', fontSize: 12, fontWeight: 500, color: '#374151', background: '#F9FAFB', cursor: 'pointer', outline: 'none' }}>
            {['Today vs Yesterday', 'Week vs Week', 'Month vs Month'].map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
          <div style={{ display: 'flex', border: '1px solid #E5E7EB', borderRadius: 6, overflow: 'hidden', marginLeft: 'auto' }}>
            {viewOptions.map((m) => (
              <button key={m} type="button" onClick={() => setActiveView(m)}
                style={{
                  padding: '4px 10px', fontSize: 11, fontWeight: 500,
                  background: activeView === m ? '#3B82F6' : 'white',
                  color: activeView === m ? 'white' : '#6B7280',
                  border: 'none', cursor: 'pointer',
                  borderRight: m !== 'Forecast' ? '1px solid #E5E7EB' : 'none',
                }}>{m}</button>
            ))}
          </div>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#6B7280' }}>{totalComplaints.toLocaleString()} complaints</span>
        </div>

        <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{
            background: 'white', borderRadius: 16, padding: 20,
            boxShadow: '0 2px 10px rgba(0,0,0,.03)',
          }}>
            <MainTrendChart data={data} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)', gap: 20, alignItems: 'start' }}>
             <div style={{ background: 'white', borderRadius: 16, padding: 20, boxShadow: '0 2px 10px rgba(0,0,0,.03)' }}>
               <h3 style={{ margin: '0 0 16px 0', fontSize: 14, fontWeight: 700, color: '#111827' }}>Category Trends</h3>
               <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                 {categories.slice(0, 6).map((cat, _i) => {
                   const maxCount = categories[0]?.count ?? 1
                   const pct = Math.round((cat.count / maxCount) * 100)
                   const colors = ['#DC2626', '#EA580C', '#3B82F6', '#16A34A', '#8B5CF6', '#F59E0B']
                   return (
                     <div key={cat.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                       <Sparkline growth={trendGrowth > 0 ? trendGrowth - _i * 5 : trendGrowth} />
                       <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: '#1F2937' }}>{cat.name}</span>
                       <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                         <span style={{ fontSize: 13, fontWeight: 700, color: colors[_i % colors.length] }}>{pct}%</span>
                         <div style={{ height: 4, width: 80, background: '#F3F4F6', borderRadius: 2, overflow: 'hidden' }}>
                           <div style={{ height: '100%', width: `${pct}%`, background: colors[_i % colors.length], borderRadius: 2 }} />
                         </div>
                       </div>
                     </div>
                   )
                 })}
               </div>
             </div>

            <div style={{ background: 'white', borderRadius: 16, padding: 20, boxShadow: '0 2px 10px rgba(0,0,0,.03)' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: 14, fontWeight: 700, color: '#111827' }}>Channel Trends</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {['WhatsApp', 'App', 'Email', 'IVR'].map((ch, i) => {
                  const pcts = [42, 31, 17, 10]
                  const colorz = ['#25D366', '#3B82F6', '#8B5CF6', '#F59E0B']
                  return (
                    <div key={ch}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 11 }}>
                        <span style={{ color: '#6B7280' }}>{ch}</span>
                        <span style={{ fontWeight: 700, color: '#111827' }}>{pcts[i]}%</span>
                      </div>
                      <div style={{ height: 6, borderRadius: 3, background: '#F3F4F6', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pcts[i]}%`, borderRadius: 3, background: colorz[i] }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div style={{ background: 'white', borderRadius: 16, padding: 20, boxShadow: '0 2px 10px rgba(0,0,0,.03)' }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: 14, fontWeight: 700, color: '#111827' }}>Sentiment Trends</h3>
              <SentimentChart />
              <div style={{ marginTop: 8, fontSize: 11, color: '#DC2626', fontWeight: 600 }}>
                Negative sentiment: +18% this week
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)', gap: 20, alignItems: 'start' }}>
            <div style={{ background: 'white', borderRadius: 16, padding: 20, boxShadow: '0 2px 10px rgba(0,0,0,.03)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
                <div style={{ width: 22, height: 22, borderRadius: 6, background: '#3B82F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a4 4 0 014 4c0 2-2 3-2 5h-4c0-2-2-3-2-5a4 4 0 014-4zM9 18h6M10 22h4" /></svg>
                </div>
                <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#111827' }}>Trend Intelligence</h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                 <div>
                   <div style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '.3px', marginBottom: 4 }}>Emerging Pattern</div>
                   <p style={{ margin: 0, fontSize: 11, color: '#4B5563', lineHeight: 1.5 }}>
                     Volume trend: <strong style={{ color: trendGrowth > 0 ? '#DC2626' : '#16A34A' }}>{trendGrowth > 0 ? '+' : ''}{trendGrowth}%</strong> change from previous period
                   </p>
                   <div style={{ fontSize: 11, fontWeight: 600, color: '#16A34A', marginTop: 2 }}>Total complaints: {totalComplaints.toLocaleString()}</div>
                   {slaCompliance && (
                     <div style={{ display: 'flex', gap: 16, marginTop: 12, fontSize: 10, color: '#6B7280' }}>
                       <div>
                         <div style={{ fontSize: 10, fontWeight: 600, color: '#16A34A' }}>{slaCompliance.met}</div>
                         <div style={{ fontSize: 9 }}>Met SLA</div>
                       </div>
                       <div>
                         <div style={{ fontSize: 10, fontWeight: 600, color: '#DC2626' }}>{slaCompliance.breached}</div>
                         <div style={{ fontSize: 9 }}>Breached SLA</div>
                       </div>
                       <div>
                         <div style={{ fontSize: 10, fontWeight: 600, color: '#10B981' }}>{slaCompliance.complianceRate}%</div>
                         <div style={{ fontSize: 9 }}>Compliance Rate</div>
                       </div>
                     </div>
                   )}
                 </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '.3px', marginBottom: 4 }}>Top Categories</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: 11 }}>
                    {categories.slice(0, 3).map((cat) => (
                      <div key={cat.name} style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>{cat.name}</span>
                        <span style={{ color: '#DC2626', fontWeight: 600 }}>{cat.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 8, padding: 12 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '.3px', marginBottom: 6 }}>Recommendation</div>
                  <ul style={{ margin: '0 0 10px 0', paddingLeft: 16, fontSize: 11, color: '#374151', lineHeight: 1.5 }}>
                    <li>Monitor volume trends daily</li>
                    <li>Alert on category spikes</li>
                    <li>Track sentiment shifts</li>
                  </ul>
                </div>
              </div>
            </div>

            <div style={{ background: 'white', borderRadius: 16, padding: 20, boxShadow: '0 2px 10px rgba(0,0,0,.03)' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: 14, fontWeight: 700, color: '#111827' }}>Category Breakdown</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {categories.slice(0, 5).map((cat, _i) => {
                  const maxCount = categories[0]?.count ?? 1
                  const pct = Math.min(Math.round((cat.count / Math.max(maxCount, 1)) * 100), 100)
                  const severityLabels = ['Critical', 'High', 'Medium', 'High', 'Low']
                  return (
                    <div key={cat.name} style={{ padding: 12, borderRadius: 10, border: '1px solid #F0F0F0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#1F2937' }}>{cat.name}</span>
                        <span style={{ fontSize: 10, fontWeight: 700, color: '#DC2626', background: '#FEE2E2', padding: '1px 6px', borderRadius: 4 }}>{severityLabels[_i] || 'Medium'}</span>
                      </div>
                      <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 4 }}>
                        {cat.count} complaints
                      </div>
                      <div style={{ height: 5, borderRadius: 3, background: '#F3F4F6', overflow: 'hidden', marginBottom: 4 }}>
                        <div style={{ height: '100%', width: `${pct}%`, borderRadius: 3, background: '#DC2626' }} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10 }}>
                        <span style={{ color: '#DC2626', fontWeight: 700 }}>{pct}% of total</span>
                        <span>{cat.count > 20 ? '🔥 Rising' : '⚡ Stable'}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div style={{ background: 'white', borderRadius: 16, padding: 20, boxShadow: '0 2px 10px rgba(0,0,0,.03)' }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: 14, fontWeight: 700, color: '#111827' }}>Forecasting</h3>
              <ForecastChart data={data} />
              <div style={{ marginTop: 10, padding: 10, borderRadius: 8, background: '#F9FAFB', border: '1px solid #E5E7EB', fontSize: 11, color: '#4B5563', lineHeight: 1.5 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '.3px', marginBottom: 4 }}>Contributors</div>
                Historical spikes · Current escalation growth · Sentiment deterioration · Volume patterns
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}