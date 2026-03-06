import { Activity, Clock, Cpu, HardDrive, Layers, RefreshCw, Server, Wifi, Zap } from 'lucide-react'
import { useEffect, useState } from 'react'
import { apiFetch } from '../../lib/api'
import Loader from '../../shell/Loader'

interface CpuStats {
  usage: number
}

interface MemoryStats {
  total: number
  used: number
  percent: number
}

interface DiskStats {
  total: string
  used: string
  available: string
  percent: number
}

interface NetworkStats {
  interface: string
  rx: string
  tx: string
}

interface LoadStats {
  load1: string
}

interface UptimeStats {
  days: number
  hours: number
  minutes: number
}

interface ProcessInfo {
  pid: number
  user: string
  cpu: number
  mem: number
  command: string
}

interface SystemStats {
  timestamp: string
  cpu: CpuStats
  memory: MemoryStats
  disk: DiskStats
  network: NetworkStats
  load: LoadStats
  uptime: UptimeStats
  processes: number
  topProcesses: ProcessInfo[]
}

function SystemMonitor() {
  const [stats, setStats] = useState<SystemStats | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  const fetchStats = async (): Promise<void> => {
    try {
      setLoading(true)
      const res = await apiFetch('/api/system')
      if (!res.ok) throw new Error('Failed')
      const data: SystemStats = await res.json()
      setStats(data)
      setLastUpdate(new Date())
    } catch (err) {
      console.error('Error fetching system stats:', err)
      // Fallback mock data
      setStats({
        timestamp: new Date().toISOString(),
        cpu: { usage: 23.5 },
        memory: { total: 4096, used: 2048, percent: 50 },
        disk: { total: '50G', used: '25G', available: '25G', percent: 50 },
        network: { interface: 'eth0', rx: '1.2GB', tx: '500MB' },
        load: { load1: '0.45' },
        uptime: { days: 15, hours: 3, minutes: 42 },
        processes: 142,
        topProcesses: [
          { pid: 1234, user: 'root', cpu: 5.2, mem: 3.1, command: 'node' },
          { pid: 5678, user: 'root', cpu: 2.1, mem: 2.5, command: 'nginx' },
          { pid: 9012, user: 'root', cpu: 1.8, mem: 1.9, command: 'python3' },
        ],
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
    const interval = setInterval(fetchStats, 5000) // Refresh every 5 seconds
    return () => clearInterval(interval)
  }, [])

  const getUsageColor = (percent: number): string => {
    if (percent < 50) return '#22c55e' // green
    if (percent < 75) return '#f59e0b' // yellow
    return '#ef4444' // red
  }

  const getUsageGradient = (percent: number): string => {
    if (percent < 50) return 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
    if (percent < 75) return 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
    return 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
  }

  if (loading || !stats) {
    return (
      <div className="empty">
        <Loader />
      </div>
    )
  }

  const cpuPercent: number = Math.round(stats.cpu.usage)
  const memPercent: number = Math.round(stats.memory.percent)
  const diskPercent: number = Math.round(stats.disk.percent)

  return (
    <>
      {/* Header */}
      <div
        style={{
          background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 50%, #0e7490 100%)',
          borderRadius: '20px',
          padding: '24px',
          color: 'white',
          marginBottom: '16px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Animated background circles */}
        <div
          style={{
            position: 'absolute',
            top: '-30%',
            right: '-20%',
            width: '200px',
            height: '200px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.08)',
            animation: 'pulse 4s ease-in-out infinite',
          }}
        />

        <div
          style={{
            position: 'absolute',
            bottom: '-40%',
            left: '-10%',
            width: '150px',
            height: '150px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.05)',
            animation: 'pulse 5s ease-in-out infinite reverse',
          }}
        />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '12px',
              opacity: 0.9,
            }}
          >
            <Server size={20} />
            <span
              style={{
                fontSize: '13px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                fontWeight: 600,
              }}
            >
              System Monitor
            </span>
            <span
              style={{
                marginLeft: 'auto',
                padding: '4px 10px',
                background: 'rgba(255,255,255,0.2)',
                borderRadius: '12px',
                fontSize: '11px',
                fontWeight: 600,
              }}
            >
              LIVE
            </span>
          </div>

          <div style={{ fontSize: '36px', fontWeight: 800, marginBottom: '8px' }}>
            {stats.uptime.days}d {stats.uptime.hours}h
          </div>

          <div style={{ fontSize: '15px', opacity: 0.9, marginBottom: '16px' }}>System Uptime</div>

          <div
            style={{
              display: 'flex',
              gap: '12px',
              padding: '12px 16px',
              background: 'rgba(255,255,255,0.15)',
              borderRadius: '12px',
              backdropFilter: 'blur(10px)',
            }}
          >
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: 700 }}>{stats.processes}</div>
              <div style={{ fontSize: '11px', opacity: 0.8 }}>Processes</div>
            </div>
            <div
              style={{
                flex: 1,
                textAlign: 'center',
                borderLeft: '1px solid rgba(255,255,255,0.2)',
              }}
            >
              <div style={{ fontSize: '20px', fontWeight: 700 }}>{stats.load.load1}</div>
              <div style={{ fontSize: '11px', opacity: 0.8 }}>Load</div>
            </div>
            <div
              style={{
                flex: 1,
                textAlign: 'center',
                borderLeft: '1px solid rgba(255,255,255,0.2)',
              }}
            >
              <div style={{ fontSize: '20px', fontWeight: 700 }}>{stats.network.interface}</div>
              <div style={{ fontSize: '11px', opacity: 0.8 }}>Interface</div>
            </div>
          </div>
        </div>
      </div>

      {/* Resource Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
        {/* CPU */}
        <div className="card" style={{ marginBottom: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: getUsageGradient(cpuPercent),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
              }}
            >
              <Cpu size={22} />
            </div>
            <div style={{ flex: 1 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '4px',
                }}
              >
                <span style={{ fontWeight: 600, fontSize: '15px' }}>CPU</span>
                <span
                  style={{ fontWeight: 700, fontSize: '18px', color: getUsageColor(cpuPercent) }}
                >
                  {cpuPercent}%
                </span>
              </div>

              <div
                style={{
                  width: '100%',
                  height: '8px',
                  background: 'var(--c-secondary-bg)',
                  borderRadius: '4px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${cpuPercent}%`,
                    height: '100%',
                    background: getUsageGradient(cpuPercent),
                    borderRadius: '4px',
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Memory */}
        <div className="card" style={{ marginBottom: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: getUsageGradient(memPercent),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
              }}
            >
              <Zap size={22} />
            </div>
            <div style={{ flex: 1 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '4px',
                }}
              >
                <span style={{ fontWeight: 600, fontSize: '15px' }}>Memory</span>
                <span
                  style={{ fontWeight: 700, fontSize: '18px', color: getUsageColor(memPercent) }}
                >
                  {memPercent}%
                </span>
              </div>

              <div
                style={{
                  width: '100%',
                  height: '8px',
                  background: 'var(--c-secondary-bg)',
                  borderRadius: '4px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${memPercent}%`,
                    height: '100%',
                    background: getUsageGradient(memPercent),
                    borderRadius: '4px',
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginTop: '6px',
                  fontSize: '12px',
                  color: 'var(--c-hint)',
                }}
              >
                <span>{stats.memory.used} MB used</span>
                <span>{stats.memory.total} MB total</span>
              </div>
            </div>
          </div>
        </div>

        {/* Disk */}
        <div className="card" style={{ marginBottom: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: getUsageGradient(diskPercent),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
              }}
            >
              <HardDrive size={22} />
            </div>
            <div style={{ flex: 1 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '4px',
                }}
              >
                <span style={{ fontWeight: 600, fontSize: '15px' }}>Disk</span>
                <span
                  style={{ fontWeight: 700, fontSize: '18px', color: getUsageColor(diskPercent) }}
                >
                  {diskPercent}%
                </span>
              </div>

              <div
                style={{
                  width: '100%',
                  height: '8px',
                  background: 'var(--c-secondary-bg)',
                  borderRadius: '4px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${diskPercent}%`,
                    height: '100%',
                    background: getUsageGradient(diskPercent),
                    borderRadius: '4px',
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginTop: '6px',
                  fontSize: '12px',
                  color: 'var(--c-hint)',
                }}
              >
                <span>{stats.disk.used} used</span>
                <span>{stats.disk.available} free</span>
              </div>
            </div>
          </div>
        </div>

        {/* Network */}
        <div className="card" style={{ marginBottom: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
              }}
            >
              <Wifi size={22} />
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: '15px', marginBottom: '8px' }}>Network</div>

              <div style={{ display: 'flex', gap: '16px' }}>
                <div
                  style={{
                    flex: 1,
                    padding: '10px',
                    background: 'var(--c-secondary-bg)',
                    borderRadius: '10px',
                  }}
                >
                  <div style={{ fontSize: '11px', color: 'var(--c-hint)', marginBottom: '2px' }}>
                    Download
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '16px', color: '#22c55e' }}>
                    ↓ {stats.network.rx}
                  </div>
                </div>

                <div
                  style={{
                    flex: 1,
                    padding: '10px',
                    background: 'var(--c-secondary-bg)',
                    borderRadius: '10px',
                  }}
                >
                  <div style={{ fontSize: '11px', color: 'var(--c-hint)', marginBottom: '2px' }}>
                    Upload
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '16px', color: '#0ea5e9' }}>
                    ↑ {stats.network.tx}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Top Processes */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <Layers size={16} />
          <span style={{ fontWeight: 600, fontSize: '14px' }}>Top Processes</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {stats.topProcesses?.slice(0, 5).map((proc) => (
            <div
              key={proc.pid}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 12px',
                background: 'var(--c-secondary-bg)',
                borderRadius: '10px',
              }}
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: `${getUsageColor(proc.cpu)}20`,
                  color: getUsageColor(proc.cpu),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '11px',
                  fontWeight: 700,
                }}
              >
                {proc.cpu}%
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '2px' }}>
                  {proc.command}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--c-hint)' }}>
                  PID: {proc.pid} • {proc.mem}% RAM
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Last Update */}
      <div
        style={{
          marginTop: '16px',
          padding: '12px 16px',
          background: 'var(--c-secondary-bg)',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '13px',
            color: 'var(--c-hint)',
          }}
        >
          <Clock size={14} />
          Updated{' '}
          {lastUpdate?.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })}
        </div>

        <button
          type="button"
          onClick={fetchStats}
          disabled={loading}
          style={{
            padding: '8px 14px',
            border: 'none',
            borderRadius: '8px',
            background: 'var(--c-accent)',
            color: 'white',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? <Loader variant="arc" size="sm" /> : <RefreshCw size={14} />}
          Refresh
        </button>
      </div>
    </>
  )
}

export default SystemMonitor
