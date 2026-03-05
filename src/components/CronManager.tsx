import { type ChangeEvent, useEffect, useState } from 'react'
import { Clock, Calendar, Check, AlertCircle, RotateCcw, Save, Sun, Moon, Briefcase, TrendingUp, BookOpen, Flame, DollarSign, FolderKanban } from 'lucide-react'

interface AgentConfig {
  id: string
  name: string
  icon: typeof Clock
  color: string
  description: string
  defaultSchedule: string
  type: 'daily' | 'hourly' | 'weekly' | 'weekdays'
}

interface CronData {
  minute: number
  hour: number
  dayOfWeek: string
}

interface ScheduleResponse {
  [key: string]: string
}

const AGENT_CONFIG: AgentConfig[] = [
  {
    id: 'usd-rate',
    name: 'USD Rate',
    icon: TrendingUp,
    color: '#667eea',
    description: 'Daily USD/ALL exchange rate',
    defaultSchedule: '0 9 * * *',
    type: 'daily'
  },
  {
    id: 'usd-threshold',
    name: 'USD Alert',
    icon: DollarSign,
    color: '#22c55e',
    description: 'Hourly threshold check',
    defaultSchedule: '0 * * * *',
    type: 'hourly'
  },
  {
    id: 'omad',
    name: 'OMAD Tracker',
    icon: Flame,
    color: '#f97316',
    description: 'Daily fasting check-in',
    defaultSchedule: '30 16 * * *',
    type: 'daily'
  },
  {
    id: 'wellbeing-morning',
    name: 'Wellbeing AM',
    icon: Sun,
    color: '#f59e0b',
    description: 'Morning mood check',
    defaultSchedule: '0 9 * * *',
    type: 'daily'
  },
  {
    id: 'wellbeing-evening',
    name: 'Wellbeing PM',
    icon: Moon,
    color: '#8b5cf6',
    description: 'Evening mood check',
    defaultSchedule: '0 21 * * *',
    type: 'daily'
  },
  {
    id: 'german',
    name: 'German Words',
    icon: BookOpen,
    color: '#ec4899',
    description: 'Daily vocabulary',
    defaultSchedule: '0 22 * * *',
    type: 'daily'
  },
  {
    id: 'jobs',
    name: 'Job Digest',
    icon: Briefcase,
    color: '#0ea5e9',
    description: 'Weekly job summary',
    defaultSchedule: '0 9 * * 1',
    type: 'weekly'
  },
  {
    id: 'projects',
    name: 'Project Updates',
    icon: FolderKanban,
    color: '#f97316',
    description: 'Weekday standup reminder',
    defaultSchedule: '0 17 * * 1-5',
    type: 'weekdays'
  }
]

const HOURS = Array.from({ length: 24 }, (_, i) => i)
const MINUTES = [0, 15, 30, 45]

function parseCron(schedule: string): CronData {
  const parts = schedule.split(' ')
  return {
    minute: parseInt(parts[0]) || 0,
    hour: parseInt(parts[1]) || 0,
    dayOfWeek: parts[4] || '*'
  }
}

function buildCron(minute: number, hour: number, type: string): string {
  switch (type) {
    case 'hourly':
      return `${minute} * * * *`
    case 'daily':
      return `${minute} ${hour} * * *`
    case 'weekly':
      return `${minute} ${hour} * * 1`
    case 'weekdays':
      return `${minute} ${hour} * * 1-5`
    default:
      return `${minute} ${hour} * * *`
  }
}

function formatTime(hour: number, minute: number): string {
  const h = hour.toString().padStart(2, '0')
  const m = minute.toString().padStart(2, '0')
  return `${h}:${m}`
}

function CronManager() {
  const [schedules, setSchedules] = useState<ScheduleResponse>({})
  const [originalSchedules, setOriginalSchedules] = useState<ScheduleResponse>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchSchedules()
  }, [])

  const fetchSchedules = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/crons')
      if (!res.ok) throw new Error('Failed to fetch')
      const data: ScheduleResponse = await res.json()

      // Merge with defaults
      const merged: ScheduleResponse = {}
      AGENT_CONFIG.forEach(agent => {
        merged[agent.id] = data[agent.id] || agent.defaultSchedule
      })

      setSchedules(merged)
      setOriginalSchedules(merged)
    } catch (err) {
      // Use defaults
      const defaults: ScheduleResponse = {}
      AGENT_CONFIG.forEach(agent => {
        defaults[agent.id] = agent.defaultSchedule
      })
      setSchedules(defaults)
      setOriginalSchedules(defaults)
    } finally {
      setLoading(false)
    }
  }

  const updateSchedule = (agentId: string, field: keyof CronData, value: number) => {
    const agent = AGENT_CONFIG.find(a => a.id === agentId)
    if (!agent) return

    const current = parseCron(schedules[agentId])
    const updated = { ...current, [field]: value }

    setSchedules(prev => ({
      ...prev,
      [agentId]: buildCron(updated.minute, updated.hour, agent.type)
    }))
    setSaved(false)
  }

  const saveSchedules = async () => {
    try {
      setSaving(true)
      setError(null)
      const res = await fetch('/api/crons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(schedules)
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to save')
      }

      setOriginalSchedules(schedules)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setSaving(false)
    }
  }

  const resetToDefaults = () => {
    const defaults: ScheduleResponse = {}
    AGENT_CONFIG.forEach(agent => {
      defaults[agent.id] = agent.defaultSchedule
    })
    setSchedules(defaults)
    setSaved(false)
  }

  const hasChanges = JSON.stringify(schedules) !== JSON.stringify(originalSchedules)

  if (loading) {
    return (
      <div className="empty">
        <Clock size={24} className="spinner" />
      </div>
    )
  }

  return (
    <>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
        borderRadius: '20px',
        padding: '24px',
        color: 'white',
        marginBottom: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'rgba(255,255,255,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Clock size={24} />
          </div>
          <div>
            <div style={{ fontSize: '24px', fontWeight: 800 }}>Agent Scheduler</div>
            <div style={{ fontSize: '15px', opacity: 0.9 }}>Customize when agents run</div>
          </div>
        </div>

        <div style={{
          display: 'flex',
          gap: '12px',
          padding: '12px 16px',
          background: 'rgba(255,255,255,0.15)',
          borderRadius: '12px'
        }}>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: '20px', fontWeight: 700 }}>{AGENT_CONFIG.length}</div>
            <div style={{ fontSize: '11px', opacity: 0.8 }}>Agents</div>
          </div>
          <div style={{ flex: 1, textAlign: 'center', borderLeft: '1px solid rgba(255,255,255,0.2)' }}>
            <div style={{ fontSize: '20px', fontWeight: 700 }}>
              {Object.values(schedules).filter(s => {
                const agent = AGENT_CONFIG.find(a => a.defaultSchedule !== s)
                return agent !== undefined
              }).length}
            </div>
            <div style={{ fontSize: '11px', opacity: 0.8 }}>Custom</div>
          </div>
        </div>
      </div>

      {error && (
        <div className="card" style={{
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          marginBottom: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444' }}>
            <AlertCircle size={16} />
            {error}
          </div>
        </div>
      )}

      {/* Agent List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {AGENT_CONFIG.map(agent => {
          const Icon = agent.icon
          const cron = parseCron(schedules[agent.id])
          const isDefault = schedules[agent.id] === agent.defaultSchedule

          return (
            <div key={agent.id} className="card" style={{ marginBottom: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  background: `${agent.color}20`,
                  color: agent.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Icon size={22} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '16px' }}>{agent.name}</div>
                  <div style={{ fontSize: '13px', color: 'var(--c-hint)' }}>{agent.description}</div>
                </div>
                {!isDefault && (
                  <span style={{
                    padding: '4px 8px',
                    background: '#f59e0b20',
                    color: '#f59e0b',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 600
                  }}>
                    Modified
                  </span>
                )}
              </div>

              {/* Time Controls */}
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '12px', color: 'var(--c-hint)', marginBottom: '6px' }}>Hour</div>
                  <select
                    value={cron.hour}
                    onChange={(e: ChangeEvent<HTMLSelectElement>) => updateSchedule(agent.id, 'hour', parseInt(e.target.value))}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '10px',
                      border: '1px solid var(--c-secondary-bg)',
                      background: 'var(--c-bg)',
                      fontSize: '14px'
                    }}
                  >
                    {HOURS.map(h => (
                      <option key={h} value={h}>{h.toString().padStart(2, '0')}:00</option>
                    ))}
                  </select>
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '12px', color: 'var(--c-hint)', marginBottom: '6px' }}>Minute</div>
                  <select
                    value={cron.minute}
                    onChange={(e: ChangeEvent<HTMLSelectElement>) => updateSchedule(agent.id, 'minute', parseInt(e.target.value))}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '10px',
                      border: '1px solid var(--c-secondary-bg)',
                      background: 'var(--c-bg)',
                      fontSize: '14px'
                    }}
                  >
                    {MINUTES.map(m => (
                      <option key={m} value={m}>{m.toString().padStart(2, '0')}</option>
                    ))}
                  </select>
                </div>

                <div style={{
                  padding: '10px 16px',
                  background: 'var(--c-secondary-bg)',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: 'var(--c-text)'
                }}>
                  {formatTime(cron.hour, cron.minute)}
                </div>
              </div>

              {/* Cron Preview */}
              <div style={{
                marginTop: '12px',
                padding: '8px 12px',
                background: 'var(--c-bg)',
                borderRadius: '8px',
                fontSize: '12px',
                fontFamily: 'monospace',
                color: 'var(--c-hint)'
              }}>
                {schedules[agent.id]}
              </div>
            </div>
          )
        })}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
        <button
          onClick={saveSchedules}
          disabled={saving || !hasChanges}
          style={{
            flex: 1,
            padding: '14px',
            border: 'none',
            borderRadius: '12px',
            background: saved ? '#22c55e' : hasChanges ? '#6366f1' : 'var(--c-secondary-bg)',
            color: saved || hasChanges ? 'white' : 'var(--c-hint)',
            fontSize: '15px',
            fontWeight: 600,
            cursor: saving || !hasChanges ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          {saved ? <Check size={18} /> : saving ? <Clock size={18} className="spinner" /> : <Save size={18} />}
          {saved ? 'Saved!' : saving ? 'Saving...' : 'Save Changes'}
        </button>

        <button
          onClick={resetToDefaults}
          style={{
            padding: '14px',
            border: 'none',
            borderRadius: '12px',
            background: 'var(--c-secondary-bg)',
            color: 'var(--c-text)',
            fontSize: '15px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          <RotateCcw size={18} />
          Reset
        </button>
      </div>

      {/* Info */}
      <div className="card" style={{ marginTop: '16px', fontSize: '13px', color: 'var(--c-hint)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <Calendar size={14} />
          <span>Cron format: minute hour day month weekday</span>
        </div>
        <div>Changes apply immediately after saving</div>
      </div>
    </>
  )
}

export default CronManager
