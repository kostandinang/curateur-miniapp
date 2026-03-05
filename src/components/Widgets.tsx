import {
  Activity,
  BookOpen,
  Briefcase,
  Clock,
  DollarSign,
  FileText,
  Flame,
  FolderKanban,
  Heart,
  type LucideIcon,
  Mic,
  Settings,
  TrendingUp,
} from 'lucide-react'
import { type ComponentType, useEffect, useState } from 'react'
import CostHeatmap from './CostHeatmap'
import CronManager from './CronManager'
import ExchangeRate from './ExchangeRate'
import Flashcards from './Flashcards'
import JobSearch from './JobSearch'
import OMADTracker from './OMADTracker'
import ProjectUpdates from './ProjectUpdates'
import SystemMonitor from './SystemMonitor'
import VoiceNotes from './VoiceNotes'
import VoiceToText from './VoiceToText'
import Wellbeing from './Wellbeing'
import WidgetSettings from './WidgetSettings'

interface WidgetConfig {
  id: string
  label: string
  icon: LucideIcon
  color: string
  component: ComponentType
}

const ALL_WIDGETS: WidgetConfig[] = [
  { id: 'rates', label: 'Rates', icon: TrendingUp, color: '#667eea', component: ExchangeRate },
  { id: 'monitor', label: 'Monitor', icon: Activity, color: '#06b6d4', component: SystemMonitor },
  { id: 'cron', label: 'Scheduler', icon: Clock, color: '#f59e0b', component: CronManager },
  { id: 'omad', label: 'OMAD', icon: Flame, color: '#f97316', component: OMADTracker },
  { id: 'cost', label: 'Cost', icon: DollarSign, color: '#16a34a', component: CostHeatmap },
  { id: 'voice', label: 'Voice', icon: Mic, color: '#8b5cf6', component: VoiceNotes },
  {
    id: 'voicetotext',
    label: 'Transcript',
    icon: FileText,
    color: '#ec4899',
    component: VoiceToText,
  },
  { id: 'jobs', label: 'Jobs', icon: Briefcase, color: '#0ea5e9', component: JobSearch },
  { id: 'flashcards', label: 'Learn 🇩🇪', icon: BookOpen, color: '#ec4899', component: Flashcards },
  { id: 'wellbeing', label: 'Mood', icon: Heart, color: '#f43f5e', component: Wellbeing },
  { id: 'updates', label: 'Projects', icon: FolderKanban, color: '#f97316', component: ProjectUpdates },
]

interface WidgetsProps {
  activeWidget: string
  setActiveWidget: (widget: string) => void
}

function Widgets({ activeWidget, setActiveWidget }: WidgetsProps) {
  const [enabledWidgets, setEnabledWidgets] = useState<string[]>(ALL_WIDGETS.map((w) => w.id))
  const [showSettings, setShowSettings] = useState<boolean>(false)
  const [loaded, setLoaded] = useState<boolean>(false)

  // Load enabled widgets from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('curateur-widgets-enabled')
      if (saved) {
        const parsed: string[] = JSON.parse(saved)
        setEnabledWidgets(parsed)
        // If current active widget is not enabled, switch to first enabled
        if (!parsed.includes(activeWidget) && parsed.length > 0) {
          setActiveWidget(parsed[0])
        }
      }
    } catch (e) {
      console.error('Failed to load widget config:', e)
    }
    setLoaded(true)
  }, [activeWidget, setActiveWidget])

  // Filter widgets based on enabled list
  const visibleWidgets = ALL_WIDGETS.filter((w) => enabledWidgets.includes(w.id))

  const handleSettingsUpdate = (newEnabled: string[]) => {
    setEnabledWidgets(newEnabled)
    // If current widget was disabled, switch to first available
    if (!newEnabled.includes(activeWidget) && newEnabled.length > 0) {
      setActiveWidget(newEnabled[0])
    }
  }

  if (!loaded) {
    return (
      <div className="empty">
        <div className="spinner">Loading...</div>
      </div>
    )
  }

  // Show settings view
  if (showSettings) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowSettings(false)}
          style={{
            padding: '10px 16px',
            border: 'none',
            borderRadius: '10px',
            background: 'var(--c-secondary-bg)',
            color: 'var(--c-text)',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            marginBottom: '16px',
          }}
        >
          ← Back to Widgets
        </button>
        <WidgetSettings onClose={() => setShowSettings(false)} onUpdate={handleSettingsUpdate} />
      </>
    )
  }

  const ActiveComponent = ALL_WIDGETS.find((w) => w.id === activeWidget)?.component

  return (
    <>
      {/* Widget Selector - Horizontal Scroll */}
      <div
        style={{
          marginBottom: '16px',
          marginLeft: '-16px',
          marginRight: '-16px',
          padding: '4px 16px',
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        <style>{`
          div::-webkit-scrollbar {
            display: none;
          }
        `}</style>

        <div
          style={{
            display: 'flex',
            gap: '8px',
            width: 'max-content',
            minWidth: '100%',
          }}
        >
          {visibleWidgets.map((widget) => {
            const Icon = widget.icon
            const isActive = activeWidget === widget.id
            return (
              <button
                type="button"
                key={widget.id}
                onClick={() => setActiveWidget(widget.id)}
                style={{
                  padding: '10px 16px',
                  border: 'none',
                  borderRadius: '10px',
                  background: isActive ? widget.color : 'var(--c-secondary-bg)',
                  color: isActive ? 'white' : 'var(--c-hint)',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'all 0.2s',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                <Icon size={14} />
                {widget.label}
              </button>
            )
          })}

          {/* Settings Button */}
          <button
            type="button"
            onClick={() => setShowSettings(true)}
            style={{
              padding: '10px 16px',
              border: 'none',
              borderRadius: '10px',
              background: activeWidget === 'settings' ? '#6366f1' : 'var(--c-secondary-bg)',
              color: activeWidget === 'settings' ? 'white' : 'var(--c-hint)',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            <Settings size={14} />
            Configure
          </button>
        </div>
      </div>

      {/* Active Widget */}
      {ActiveComponent && <ActiveComponent />}
    </>
  )
}

export default Widgets
