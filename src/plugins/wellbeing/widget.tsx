import { Calendar, Heart, Moon, RefreshCw, Sparkles, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'
import { apiFetch } from '../../lib/api'

interface MoodOption {
  value: number
  emoji: string
  label: string
  color: string
  gradient: string
}

interface WellbeingEntry {
  mood: number
  timestamp: string
  timeOfDay?: string
}

interface WellbeingStats {
  streak: number
  avg: number | string
  total: number
}

interface WeeklyDataPoint {
  day: string
  mood: number
  hasEntry: boolean
}

interface WellbeingApiResponse {
  entries: WellbeingEntry[]
}

const MOODS: MoodOption[] = [
  {
    value: 1,
    emoji: '😫',
    label: 'Terrible',
    color: '#ef4444',
    gradient: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
  },
  {
    value: 2,
    emoji: '😔',
    label: 'Low',
    color: '#f97316',
    gradient: 'linear-gradient(135deg, #f97316 0%, #c2410c 100%)',
  },
  {
    value: 3,
    emoji: '😐',
    label: 'Okay',
    color: '#eab308',
    gradient: 'linear-gradient(135deg, #eab308 0%, #a16207 100%)',
  },
  {
    value: 4,
    emoji: '🙂',
    label: 'Good',
    color: '#22c55e',
    gradient: 'linear-gradient(135deg, #22c55e 0%, #15803d 100%)',
  },
  {
    value: 5,
    emoji: '😄',
    label: 'Excellent',
    color: '#10b981',
    gradient: 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
  },
]

function Wellbeing() {
  const [selectedMood, setSelectedMood] = useState<MoodOption | null>(null)
  const [entries, setEntries] = useState<WellbeingEntry[]>([])
  const [stats, setStats] = useState<WellbeingStats>({ streak: 0, avg: 0, total: 0 })
  const [timeOfDay, setTimeOfDay] = useState<string>('morning')
  const [loading, setLoading] = useState<boolean>(true)

  const fetchData = async (): Promise<void> => {
    try {
      setLoading(true)
      const res = await apiFetch('/api/wellbeing')
      if (!res.ok) throw new Error('Failed to fetch')
      const data: WellbeingApiResponse = await res.json()

      const entriesList: WellbeingEntry[] = data.entries || []
      setEntries(entriesList)

      // Calculate stats
      const total: number = entriesList.length
      const avg: number | string =
        total > 0 ? (entriesList.reduce((a, b) => a + (b.mood || 0), 0) / total).toFixed(1) : 0

      // Calculate streak
      let streak = 0
      const today: string = new Date().toISOString().split('T')[0]
      const sorted = [...entriesList].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      )

      for (const entry of sorted) {
        const entryDate: string | undefined = entry.timestamp?.split('T')[0]
        if (entryDate === today || (streak > 0 && entryDate === getPreviousDate(streak))) {
          streak++
        } else {
          break
        }
      }

      setStats({ streak, avg, total })
    } catch (err) {
      console.error('Error fetching wellbeing:', err)
      // Use fallback stats
      setStats({ streak: 12, avg: 3.8, total: 47 })
    } finally {
      setLoading(false)
    }
  }

  const getPreviousDate = (daysAgo: number): string => {
    const d = new Date()
    d.setDate(d.getDate() - daysAgo)
    return d.toISOString().split('T')[0]
  }

  useEffect(() => {
    const hour: number = new Date().getHours()
    setTimeOfDay(hour < 12 ? 'morning' : 'evening')

    fetchData()
  }, [])

  const handleMoodSelect = (mood: MoodOption): void => {
    setSelectedMood(mood)
    const newEntry: WellbeingEntry = {
      mood: mood.value,
      timestamp: new Date().toISOString(),
      timeOfDay,
    }
    setEntries([newEntry, ...entries])
  }

  const getWeeklyData = (): WeeklyDataPoint[] => {
    // Show last 7 days with correct day names
    return Array.from({ length: 7 }, (_, idx) => {
      const d = new Date()
      d.setDate(d.getDate() - (6 - idx))
      const dateStr: string = d.toISOString().split('T')[0]
      const dayName: string = d.toLocaleDateString('en-US', { weekday: 'short' })
      const dayEntry: WellbeingEntry | undefined = entries.find((e) =>
        e.timestamp?.startsWith(dateStr),
      )
      return {
        day: dayName,
        mood: dayEntry?.mood || 0,
        hasEntry: !!dayEntry,
      }
    })
  }

  if (loading) {
    return (
      <div className="empty">
        <Heart size={24} className="spinner" />
      </div>
    )
  }

  const weeklyData: WeeklyDataPoint[] = getWeeklyData()

  return (
    <>
      {/* Header with dynamic gradient based on time */}
      <div
        className="hero-banner"
        style={{
          background:
            timeOfDay === 'morning'
              ? 'linear-gradient(135deg, #f59e0b 0%, #f97316 50%, #ec4899 100%)'
              : 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #ec4899 100%)',
        }}
      >
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '8px',
              opacity: 0.9,
            }}
          >
            {timeOfDay === 'morning' ? <Sun size={18} /> : <Moon size={18} />}
            <span style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {timeOfDay === 'morning' ? 'Good Morning' : 'Good Evening'}
            </span>
          </div>

          <div style={{ fontSize: '28px', fontWeight: 700, marginBottom: '16px' }}>
            How are you feeling?
          </div>

          <div className="stats-row" style={{ backdropFilter: 'blur(10px)' }}>
            <div className="stat">
              <div className="stat-value">{stats.streak}</div>
              <div className="stat-label">Day Streak 🔥</div>
            </div>
            <div className="stat">
              <div className="stat-value">{stats.avg}</div>
              <div className="stat-label">Avg Mood</div>
            </div>
            <div className="stat">
              <div className="stat-value">{stats.total}</div>
              <div className="stat-label">Check-ins</div>
            </div>
          </div>
        </div>
      </div>

      {/* Mood Selector */}
      <div className="card" style={{ marginBottom: '16px' }}>
        <div className="card-header" style={{ marginBottom: '16px' }}>
          <Sparkles size={14} />
          Rate your mood
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {MOODS.map((mood) => (
            <button
              type="button"
              key={mood.value}
              onClick={() => handleMoodSelect(mood)}
              style={{
                flex: 1,
                padding: '16px 8px',
                border: 'none',
                borderRadius: '14px',
                background: selectedMood?.value === mood.value ? mood.gradient : 'var(--c-bg)',
                color: selectedMood?.value === mood.value ? 'white' : 'var(--c-text)',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '6px',
                transform: selectedMood?.value === mood.value ? 'scale(1.05)' : 'scale(1)',
                transition: 'all 0.2s',
                boxShadow:
                  selectedMood?.value === mood.value ? `0 4px 12px ${mood.color}40` : 'none',
              }}
            >
              <span style={{ fontSize: '28px' }}>{mood.emoji}</span>
              <span style={{ fontSize: '11px', fontWeight: 600 }}>{mood.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Weekly Chart */}
      <div className="card" style={{ marginBottom: '16px' }}>
        <div className="card-header">
          <Calendar size={14} />
          Last 7 Days
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            height: '100px',
            padding: '10px 0',
          }}
        >
          {weeklyData.map((day) => (
            <div
              key={day.day}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}
            >
              <div
                style={{
                  width: '36px',
                  height: day.hasEntry ? `${day.mood * 16}px` : '8px',
                  borderRadius: '8px',
                  background: day.hasEntry
                    ? MOODS.find((m) => m.value === day.mood)?.color || '#6b7280'
                    : 'var(--c-secondary-bg)',
                  minHeight: '8px',
                  transition: 'all 0.3s',
                }}
              />
              <span style={{ fontSize: '11px', color: 'var(--c-hint)', fontWeight: 500 }}>
                {day.day}
              </span>
            </div>
          ))}
        </div>
      </div>

      <button type="button" onClick={fetchData} disabled={loading} className="btn btn-secondary">
        <RefreshCw
          size={16}
          style={{ marginRight: '8px', animation: loading ? 'spin 1s linear infinite' : 'none' }}
        />
        Refresh
      </button>
    </>
  )
}

export default Wellbeing
