import { ArrowUpRight, Bell, RefreshCw, TrendingUp } from 'lucide-react'
import { useEffect, useState } from 'react'

interface ExchangeRateApiResponse {
  rates: Record<string, number>
  time_last_update_utc: string
}

function ExchangeRate() {
  const [rate, setRate] = useState<number | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [threshold, setThreshold] = useState<number>(83)
  const [lastUpdate, setLastUpdate] = useState<string | null>(null)

  const fetchRate = async (): Promise<void> => {
    setLoading(true)
    try {
      const res = await fetch('https://open.er-api.com/v6/latest/USD')
      const data: ExchangeRateApiResponse = await res.json()
      setRate(data.rates.ALL)
      setLastUpdate(data.time_last_update_utc)
      setError(null)
    } catch (_err) {
      setError('Failed to fetch')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const doFetch = async (): Promise<void> => {
      setLoading(true)
      try {
        const res = await fetch('https://open.er-api.com/v6/latest/USD')
        const data: ExchangeRateApiResponse = await res.json()
        setRate(data.rates.ALL)
        setLastUpdate(data.time_last_update_utc)
        setError(null)
      } catch (_err) {
        setError('Failed to fetch')
      } finally {
        setLoading(false)
      }
    }
    doFetch()
    const interval = setInterval(doFetch, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const distance: string = rate ? (threshold - rate).toFixed(2) : '0'
  const isNear: boolean = rate !== null && rate >= threshold - 1 && rate < threshold
  const isHit: boolean = rate !== null && rate >= threshold

  return (
    <>
      {/* Rate Display */}
      <div className="rate-card">
        <div className="label">USD → ALL</div>

        {loading ? (
          <div style={{ padding: '20px' }}>
            <RefreshCw size={32} className="spinner" style={{ opacity: 0.7 }} />
          </div>
        ) : error ? (
          <div style={{ fontSize: '16px', opacity: 0.8 }}>{error}</div>
        ) : (
          <>
            <div className="value">{parseFloat(String(rate)).toFixed(2)}</div>
            <div className="sub">1 USD = {parseFloat(String(rate)).toFixed(4)} ALL</div>

            <div className="badge">
              {isHit ? (
                <>
                  <ArrowUpRight size={14} />
                  Target reached!
                </>
              ) : (
                <>
                  <TrendingUp size={14} />
                  {distance} to {threshold}
                </>
              )}
            </div>
          </>
        )}
      </div>

      {/* Alert Settings */}
      <div className="card">
        <div className="card-header">
          <Bell size={14} />
          Alert Threshold
        </div>

        <div className="input-group">
          <input
            type="number"
            value={threshold}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setThreshold(parseFloat(e.target.value) || 0)
            }
            placeholder="83"
          />
          <span>ALL</span>
        </div>

        <div
          className="status"
          style={{
            marginTop: '12px',
            background: isHit
              ? 'rgba(52, 199, 89, 0.1)'
              : isNear
                ? 'rgba(255, 149, 0, 0.1)'
                : 'var(--c-secondary-bg)',
            color: isHit ? 'var(--c-success)' : isNear ? 'var(--c-warning)' : 'var(--c-hint)',
          }}
        >
          {isHit ? (
            <>🎯 Target hit! Check your notifications.</>
          ) : isNear ? (
            <>⚡ Getting close to target</>
          ) : (
            <>📍 {distance} away from target</>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="info-grid">
        <div className="info-item">
          <div className="label">Last Update</div>
          <div className="value">
            {lastUpdate
              ? new Date(lastUpdate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : '—'}
          </div>
        </div>

        <div className="info-item">
          <div className="label">Refresh</div>
          <div className="value">5 min</div>
        </div>
      </div>

      {/* Refresh Button */}
      <button
        type="button"
        onClick={fetchRate}
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
        {loading ? 'Updating...' : 'Refresh Rate'}
      </button>
    </>
  )
}

export default ExchangeRate
