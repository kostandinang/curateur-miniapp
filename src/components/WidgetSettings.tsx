import {
  Activity,
  BookOpen,
  Briefcase,
  CheckCircle2,
  Clock,
  DollarSign,
  Eye,
  EyeOff,
  FileText,
  Flame,
  FolderKanban,
  Heart,
  type LucideIcon,
  Mic,
  RotateCcw,
  Save,
  Settings,
  TrendingUp,
} from 'lucide-react'
import { useEffect, useState } from 'react'

interface WidgetDefinition {
  id: string
  label: string
  icon: LucideIcon
  color: string
  agent: string | null
  description: string
}

const ALL_WIDGETS: WidgetDefinition[] = [
  {
    id: 'rates',
    label: 'Exchange Rates',
    icon: TrendingUp,
    color: '#667eea',
    agent: 'usd-all-rate',
    description: 'USD/ALL currency tracker',
  },
  {
    id: 'monitor',
    label: 'System Monitor',
    icon: Activity,
    color: '#06b6d4',
    agent: 'system-monitor',
    description: 'CPU, RAM, Disk, Network stats',
  },
  {
    id: 'omad',
    label: 'OMAD Tracker',
    icon: Flame,
    color: '#f97316',
    agent: 'omad-tracker',
    description: 'Fasting streak tracker',
  },
  {
    id: 'cost',
    label: 'Cost Heatmap',
    icon: DollarSign,
    color: '#16a34a',
    agent: null,
    description: 'LLM usage analytics',
  },
  {
    id: 'voice',
    label: 'Voice Notes',
    icon: Mic,
    color: '#8b5cf6',
    agent: 'voice-notes',
    description: 'Voice recordings & transcripts',
  },
  {
    id: 'voicetotext',
    label: 'Voice to Text',
    icon: FileText,
    color: '#ec4899',
    agent: 'voice-to-text',
    description: 'Transcribe voice messages',
  },
  {
    id: 'jobs',
    label: 'Job Search',
    icon: Briefcase,
    color: '#0ea5e9',
    agent: 'job-search',
    description: 'Full stack job positions',
  },
  {
    id: 'flashcards',
    label: 'Learn German',
    icon: BookOpen,
    color: '#ec4899',
    agent: 'german-flashcards',
    description: 'A2/B1 vocabulary flashcards',
  },
  {
    id: 'wellbeing',
    label: 'Mood Tracker',
    icon: Heart,
    color: '#f43f5e',
    agent: 'wellbeing',
    description: 'Daily wellbeing check-ins',
  },
  {
    id: 'updates',
    label: 'Project Updates',
    icon: FolderKanban,
    color: '#f97316',
    agent: 'project-updates',
    description: 'Daily standup notes',
  },
  {
    id: 'cron',
    label: 'Scheduler',
    icon: Clock,
    color: '#f59e0b',
    agent: null,
    description: 'Manage agent cron schedules',
  },
]

interface WidgetSettingsProps {
  onClose: () => void
  onUpdate: (enabledWidgets: string[]) => void
}

function WidgetSettings({ onClose: _onClose, onUpdate }: WidgetSettingsProps) {
  const [enabledWidgets, setEnabledWidgets] = useState<string[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [saved, setSaved] = useState<boolean>(false)

  // Load saved configuration
  useEffect(() => {
    const loadConfig = () => {
      try {
        const saved = localStorage.getItem('curateur-widgets-enabled')
        if (saved) {
          setEnabledWidgets(JSON.parse(saved))
        } else {
          // Default: all enabled
          setEnabledWidgets(ALL_WIDGETS.map((w) => w.id))
        }
      } catch (_e) {
        setEnabledWidgets(ALL_WIDGETS.map((w) => w.id))
      }
      setLoading(false)
    }
    loadConfig()
  }, [])

  const toggleWidget = (widgetId: string) => {
    setEnabledWidgets((prev) => {
      if (prev.includes(widgetId)) {
        return prev.filter((id) => id !== widgetId)
      } else {
        return [...prev, widgetId]
      }
    })
    setSaved(false)
  }

  const saveConfig = () => {
    try {
      localStorage.setItem('curateur-widgets-enabled', JSON.stringify(enabledWidgets))
      setSaved(true)
      if (onUpdate) onUpdate(enabledWidgets)
      setTimeout(() => setSaved(false), 2000)
    } catch (e) {
      console.error('Failed to save:', e)
    }
  }

  const resetToDefault = () => {
    const allIds = ALL_WIDGETS.map((w) => w.id)
    setEnabledWidgets(allIds)
    localStorage.setItem('curateur-widgets-enabled', JSON.stringify(allIds))
    if (onUpdate) onUpdate(allIds)
  }

  const enabledCount = enabledWidgets.length
  const totalCount = ALL_WIDGETS.length

  if (loading) {
    return (
      <div className="empty">
        <Settings size={24} className="spinner" />
      </div>
    )
  }

  return (
    <>
      {/* Header */}
      <div
        style={{
          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
          borderRadius: '20px',
          padding: '24px',
          color: 'white',
          marginBottom: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
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
            <Settings size={24} />
          </div>
          <div>
            <div style={{ fontSize: '24px', fontWeight: 800 }}>Widget Settings</div>
            <div style={{ fontSize: '15px', opacity: 0.9 }}>Customize your dashboard</div>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            gap: '12px',
            padding: '12px 16px',
            background: 'rgba(255,255,255,0.15)',
            borderRadius: '12px',
          }}
        >
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: '28px', fontWeight: 700 }}>{enabledCount}</div>
            <div style={{ fontSize: '11px', opacity: 0.8 }}>Enabled</div>
          </div>
          <div
            style={{ flex: 1, textAlign: 'center', borderLeft: '1px solid rgba(255,255,255,0.2)' }}
          >
            <div style={{ fontSize: '28px', fontWeight: 700 }}>{totalCount - enabledCount}</div>
            <div style={{ fontSize: '11px', opacity: 0.8 }}>Hidden</div>
          </div>
          <div
            style={{ flex: 1, textAlign: 'center', borderLeft: '1px solid rgba(255,255,255,0.2)' }}
          >
            <div style={{ fontSize: '28px', fontWeight: 700 }}>{totalCount}</div>
            <div style={{ fontSize: '11px', opacity: 0.8 }}>Total</div>
          </div>
        </div>
      </div>

      {/* Widget List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
        {ALL_WIDGETS.map((widget) => {
          const Icon = widget.icon
          const isEnabled = enabledWidgets.includes(widget.id)

          return (
            <button
              type="button"
              key={widget.id}
              onClick={() => toggleWidget(widget.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '14px',
                background: isEnabled ? `${widget.color}10` : 'var(--c-secondary-bg)',
                borderRadius: '14px',
                cursor: 'pointer',
                border: isEnabled ? `2px solid ${widget.color}` : '2px solid transparent',
                transition: 'all 0.2s',
                opacity: isEnabled ? 1 : 0.6,
                width: '100%',
                textAlign: 'inherit',
                color: 'inherit',
                font: 'inherit',
              }}
            >
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  background: isEnabled ? widget.color : 'var(--c-bg)',
                  color: isEnabled ? 'white' : 'var(--c-hint)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s',
                }}
              >
                <Icon size={22} />
              </div>

              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontWeight: 600,
                    fontSize: '15px',
                    color: isEnabled ? 'var(--c-text)' : 'var(--c-hint)',
                    marginBottom: '2px',
                  }}
                >
                  {widget.label}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--c-hint)' }}>{widget.description}</div>
                {widget.agent && (
                  <div
                    style={{
                      fontSize: '10px',
                      color: widget.color,
                      marginTop: '4px',
                      fontWeight: 600,
                    }}
                  >
                    Agent: {widget.agent}
                  </div>
                )}
              </div>

              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: isEnabled ? widget.color : 'var(--c-bg)',
                  color: isEnabled ? 'white' : 'var(--c-hint)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s',
                }}
              >
                {isEnabled ? <Eye size={18} /> : <EyeOff size={18} />}
              </div>
            </button>
          )
        })}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '10px' }}>
        <button
          type="button"
          onClick={saveConfig}
          style={{
            flex: 1,
            padding: '14px',
            border: 'none',
            borderRadius: '12px',
            background: saved ? '#22c55e' : '#6366f1',
            color: 'white',
            fontSize: '15px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}
        >
          {saved ? <CheckCircle2 size={18} /> : <Save size={18} />}
          {saved ? 'Saved!' : 'Save Changes'}
        </button>

        <button
          type="button"
          onClick={resetToDefault}
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
            gap: '8px',
          }}
        >
          <RotateCcw size={18} />
          Reset
        </button>
      </div>
    </>
  )
}

export default WidgetSettings
