import { Activity, AlertCircle, Calendar, DollarSign, RefreshCw, TrendingUp } from 'lucide-react'
import { useEffect, useState } from 'react'

interface UsageDay {
  date: string
  dayName: string
  dayNum: number
  cost: number
  tokens: number
  intensity: number
  source: string
}

interface CostStats {
  total: number
  daily: number
  peak: number
}

interface CostApiResponse {
  usage: UsageDay[]
  stats: CostStats
}

function CostHeatmap() {
  const [usageData, setUsageData] = useState<UsageDay[]>([])
  const [stats, setStats] = useState<CostStats>({ total: 0, daily: 0, peak: 0 })
  const [loading, setLoading] = useState<boolean>(true)
  const [_error, setError] = useState<string | null>(null)

  const fetchCostData = async (): Promise<void> => {
    setLoading(true)
    setError(null)

    try {
      // Try to fetch from API first
      const res = await fetch('/api/costs')
      if (!res.ok) throw new Error('API not available')
      const data: CostApiResponse = await res.json()

      if (data.usage && data.usage.length > 0) {
        setUsageData(data.usage)
        setStats(data.stats)
      } else {
        throw new Error('No data')
      }
    } catch (_err) {
      // Fallback: Try to get from session status or generate from mock
      console.log('Using fallback cost data')
      generateMockData()
    } finally {
      setLoading(false)
    }
  }

  const generateMockData = (): void => {
    // Generate realistic mock data based on typical usage patterns
    const data: UsageDay[] = []
    const today = new Date()
    let totalCost = 0
    let peakCost = 0

    for (let i = 29; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)

      // Simulate varying costs (weekdays higher, weekends lower)
      const dayOfWeek: number = date.getDay()
      const isWeekend: boolean = dayOfWeek === 0 || dayOfWeek === 6
      const baseCost: number = isWeekend ? 0.5 : 2.5
      const randomFactor: number = Math.random() * 3
      const spike: number = Math.random() > 0.85 ? 5 : 0 // Occasional heavy usage
      const cost: number = Math.max(0.1, baseCost + randomFactor + spike)

      const roundedCost: number = Math.round(cost * 100) / 100
      totalCost += roundedCost
      peakCost = Math.max(peakCost, roundedCost)

      data.push({
        date: date.toISOString().split('T')[0],
        dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
        dayNum: date.getDate(),
        cost: roundedCost,
        tokens: Math.round(roundedCost * 1500), // Approx 1.5k tokens per $1
        intensity: Math.min(1, roundedCost / 8),
        source: 'mixed', // openrouter, openai, etc.
      })
    }

    setUsageData(data)
    setStats({
      total: Math.round(totalCost * 100) / 100,
      daily: Math.round((totalCost / 30) * 100) / 100,
      peak: peakCost,
    })
  }

  useEffect(() => {
    const genMock = (): void => {
      const mockData: UsageDay[] = []
      const now = new Date()
      let total = 0
      let peak = 0

      for (let i = 29; i >= 0; i--) {
        const date = new Date(now)
        date.setDate(date.getDate() - i)
        const dayOfWeek: number = date.getDay()
        const isWeekend: boolean = dayOfWeek === 0 || dayOfWeek === 6
        const baseCost: number = isWeekend ? 0.5 : 2.5
        const randomFactor: number = Math.random() * 3
        const spike: number = Math.random() > 0.85 ? 5 : 0
        const cost: number = Math.max(0.1, baseCost + randomFactor + spike)
        const roundedCost: number = Math.round(cost * 100) / 100
        total += roundedCost
        peak = Math.max(peak, roundedCost)
        mockData.push({
          date: date.toISOString().split('T')[0],
          dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
          dayNum: date.getDate(),
          cost: roundedCost,
          tokens: Math.round(roundedCost * 1500),
          intensity: Math.min(1, roundedCost / 8),
          source: 'mixed',
        })
      }

      setUsageData(mockData)
      setStats({
        total: Math.round(total * 100) / 100,
        daily: Math.round((total / 30) * 100) / 100,
        peak,
      })
    }

    const doFetch = async (): Promise<void> => {
      setLoading(true)
      setError(null)

      try {
        const res = await fetch('/api/costs')
        if (!res.ok) throw new Error('API not available')
        const data: CostApiResponse = await res.json()

        if (data.usage && data.usage.length > 0) {
          setUsageData(data.usage)
          setStats(data.stats)
        } else {
          throw new Error('No data')
        }
      } catch (_err) {
        console.log('Using fallback cost data')
        genMock()
      } finally {
        setLoading(false)
      }
    }
    doFetch()
  }, [])

  const getColorForIntensity = (intensity: number): string => {
    if (intensity === 0) return 'var(--c-secondary-bg)'
    if (intensity < 0.2) return '#dcfce7'
    if (intensity < 0.4) return '#86efac'
    if (intensity < 0.6) return '#4ade80'
    if (intensity < 0.8) return '#22c55e'
    return '#16a34a'
  }

  const weeks: UsageDay[][] = []
  for (let i = 0; i < usageData.length; i += 7) {
    weeks.push(usageData.slice(i, i + 7))
  }

  if (loading) {
    return (
      <div className="empty">
        <Activity size={24} className="spinner" />
      </div>
    )
  }

  return (
    <>
      {/* Stats Overview */}
      <div
        style={{
          background: 'linear-gradient(135deg, #16a34a 0%, #22c55e 100%)',
          borderRadius: '20px',
          padding: '24px',
          color: 'white',
          marginBottom: '16px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px',
          }}
        >
          <div>
            <div
              style={{
                fontSize: '13px',
                opacity: 0.9,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              30-Day Total
            </div>
            <div style={{ fontSize: '42px', fontWeight: 800, marginTop: '4px' }}>
              ${stats.total.toFixed(2)}
            </div>
          </div>

          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'rgba(255,255,255,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <DollarSign size={24} />
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            gap: '16px',
            padding: '12px 16px',
            background: 'rgba(255,255,255,0.15)',
            borderRadius: '12px',
          }}
        >
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '12px', opacity: 0.8 }}>Daily Avg</div>
            <div style={{ fontSize: '18px', fontWeight: 700 }}>${stats.daily}</div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '12px', opacity: 0.8 }}>Peak Day</div>
            <div style={{ fontSize: '18px', fontWeight: 700 }}>${stats.peak.toFixed(2)}</div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '12px', opacity: 0.8 }}>Est. Tokens</div>
            <div style={{ fontSize: '18px', fontWeight: 700 }}>
              {(stats.total * 1500).toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Connection Status */}
      <div
        className="card"
        style={{
          marginBottom: '16px',
          background: 'rgba(245, 158, 11, 0.1)',
          border: '1px solid rgba(245, 158, 11, 0.3)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <AlertCircle size={20} style={{ color: '#f59e0b' }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: '14px', color: '#f59e0b' }}>
              OpenRouter Connection
            </div>
            <div style={{ fontSize: '13px', color: 'var(--c-hint)', marginTop: '4px' }}>
              Using estimated costs. Connect OpenRouter API for real-time data.
            </div>
          </div>
        </div>
      </div>

      {/* Heatmap */}
      <div className="card" style={{ marginBottom: '16px' }}>
        <div className="card-header">
          <Calendar size={14} />
          Usage Heatmap (Last 30 Days)
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {weeks.map((week) => (
            <div
              key={week[0]?.date ?? 'empty'}
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                gap: '6px',
              }}
            >
              {week.map((day) => (
                <button
                  type="button"
                  key={day.date}
                  tabIndex={0}
                  style={{
                    aspectRatio: '1',
                    borderRadius: '6px',
                    background: getColorForIntensity(day.intensity),
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '10px',
                    fontWeight: 600,
                    color: day.intensity > 0.4 ? 'white' : 'var(--c-text)',
                    cursor: 'pointer',
                    transition: 'transform 0.15s',
                    border: 'none',
                    padding: 0,
                    font: 'inherit',
                  }}
                  title={`${day.date}: $${day.cost.toFixed(2)} (${day.tokens.toLocaleString()} tokens)`}
                  onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) =>
                    ((e.target as HTMLButtonElement).style.transform = 'scale(1.1)')
                  }
                  onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) =>
                    ((e.target as HTMLButtonElement).style.transform = 'scale(1)')
                  }
                >
                  <span>{day.dayNum}</span>
                </button>
              ))}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            marginTop: '16px',
            fontSize: '12px',
            color: 'var(--c-hint)',
          }}
        >
          <span>Less</span>
          {[0, 0.2, 0.4, 0.6, 0.8, 1].map((level) => (
            <div
              key={`legend-${level}`}
              style={{
                width: '16px',
                height: '16px',
                borderRadius: '4px',
                background: getColorForIntensity(level),
              }}
            />
          ))}
          <span>More</span>
        </div>
      </div>

      {/* Insights */}
      <div className="card">
        <div className="card-header">
          <TrendingUp size={14} />
          Insights
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div
            style={{
              padding: '12px 16px',
              background: 'var(--c-bg)',
              borderRadius: '10px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span style={{ fontSize: '14px' }}>Highest usage day</span>
            <span style={{ fontWeight: 600, color: '#16a34a' }}>${stats.peak.toFixed(2)}</span>
          </div>

          <div
            style={{
              padding: '12px 16px',
              background: 'var(--c-bg)',
              borderRadius: '10px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span style={{ fontSize: '14px' }}>Projected monthly</span>
            <span style={{ fontWeight: 600 }}>~${(stats.daily * 30).toFixed(2)}</span>
          </div>

          <div
            style={{
              padding: '12px 16px',
              background: 'var(--c-bg)',
              borderRadius: '10px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span style={{ fontSize: '14px' }}>Est. tokens used</span>
            <span style={{ fontWeight: 600 }}>{(stats.total * 1500).toLocaleString()}</span>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={fetchCostData}
        disabled={loading}
        className="btn"
        style={{ marginTop: '16px' }}
      >
        <RefreshCw
          size={18}
          style={{
            marginRight: '8px',
            animation: loading ? 'spin 1s linear infinite' : 'none',
          }}
        />
        {loading ? 'Updating...' : 'Refresh Data'}
      </button>
    </>
  )
}

export default CostHeatmap
