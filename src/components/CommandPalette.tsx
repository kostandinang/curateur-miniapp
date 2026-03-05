import {
  Activity,
  ArrowRight,
  Bell,
  BookOpen,
  Briefcase,
  Clock,
  Command,
  DollarSign,
  FileText,
  Flame,
  FolderKanban,
  Heart,
  LayoutGrid,
  type LucideIcon,
  Mic,
  Puzzle,
  Search,
  Settings,
  Sun,
  TrendingUp,
  Video,
  Zap,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'

interface CommandItem {
  id: string
  name: string
  subtitle: string
  icon: LucideIcon
  color: string
  action: string
}

interface CommandGroup {
  id: string
  name: string
  icon: LucideIcon
  commands: CommandItem[]
}

interface FlatCommand extends CommandItem {
  group: string
  groupIcon: LucideIcon
}

// Command palette items - connects to all agents, tools, and widgets
const COMMAND_GROUPS: CommandGroup[] = [
  {
    id: 'widgets',
    name: 'Widgets',
    icon: LayoutGrid,
    commands: [
      {
        id: 'rates',
        name: 'Exchange Rates',
        subtitle: 'USD to ALL currency',
        icon: TrendingUp,
        color: '#667eea',
        action: 'widget:rates',
      },
      {
        id: 'omad',
        name: 'OMAD Tracker',
        subtitle: 'Fasting streak tracker',
        icon: Flame,
        color: '#f97316',
        action: 'widget:omad',
      },
      {
        id: 'cost',
        name: 'Cost Heatmap',
        subtitle: 'LLM usage analytics',
        icon: DollarSign,
        color: '#16a34a',
        action: 'widget:cost',
      },
      {
        id: 'voice',
        name: 'Voice Notes',
        subtitle: 'Recordings & transcripts',
        icon: Mic,
        color: '#8b5cf6',
        action: 'widget:voice',
      },
      {
        id: 'voicetotext',
        name: 'Voice to Text',
        subtitle: 'Transcribe voice messages',
        icon: FileText,
        color: '#ec4899',
        action: 'widget:voicetotext',
      },
      {
        id: 'jobs',
        name: 'Job Search',
        subtitle: 'Full stack positions',
        icon: Briefcase,
        color: '#0ea5e9',
        action: 'widget:jobs',
      },
      {
        id: 'flashcards',
        name: 'Learn German',
        subtitle: 'A2/B1 flashcards',
        icon: BookOpen,
        color: '#ec4899',
        action: 'widget:flashcards',
      },
      {
        id: 'wellbeing',
        name: 'Mood Tracker',
        subtitle: 'Daily wellbeing',
        icon: Heart,
        color: '#f43f5e',
        action: 'widget:wellbeing',
      },
      {
        id: 'projects',
        name: 'Project Updates',
        subtitle: 'Daily standup notes',
        icon: FolderKanban,
        color: '#f97316',
        action: 'widget:projects',
      },
    ],
  },
  {
    id: 'tools',
    name: 'Tools',
    icon: Zap,
    commands: [
      {
        id: 'loom',
        name: 'Loom Summary',
        subtitle: 'Get video transcript',
        icon: Video,
        color: '#6366f1',
        action: 'tool:loom',
      },
      {
        id: 'memory',
        name: 'Search Memory',
        subtitle: 'Search MEMORY.md',
        icon: FileText,
        color: '#8b5cf6',
        action: 'tool:memory',
      },
      {
        id: 'status',
        name: 'System Status',
        subtitle: 'Gateway health check',
        icon: Activity,
        color: '#22c55e',
        action: 'tool:status',
      },
      {
        id: 'mcp',
        name: 'MCP Tools',
        subtitle: 'Configure agent tools',
        icon: Puzzle,
        color: '#6366f1',
        action: 'tool:mcp',
      },
      {
        id: 'new',
        name: 'New Session',
        subtitle: 'Start fresh conversation',
        icon: Command,
        color: '#0ea5e9',
        action: 'tool:new',
      },
      {
        id: 'reset',
        name: 'Reset Session',
        subtitle: 'Clear context',
        icon: Clock,
        color: '#f59e0b',
        action: 'tool:reset',
      },
    ],
  },
  {
    id: 'agents',
    name: 'Quick Actions',
    icon: Bell,
    commands: [
      {
        id: 'check-usd',
        name: 'Check USD Rate',
        subtitle: 'Get current USD/ALL rate',
        icon: TrendingUp,
        color: '#667eea',
        action: 'agent:usd',
      },
      {
        id: 'log-mood',
        name: 'Log Mood',
        subtitle: 'Quick wellbeing check',
        icon: Heart,
        color: '#f43f5e',
        action: 'agent:mood',
      },
      {
        id: 'voice-note',
        name: 'New Voice Note',
        subtitle: 'Record audio note',
        icon: Mic,
        color: '#8b5cf6',
        action: 'agent:voice',
      },
      {
        id: 'german-word',
        name: 'German Word',
        subtitle: 'Show random flashcard',
        icon: BookOpen,
        color: '#ec4899',
        action: 'agent:german',
      },
      {
        id: 'project-update',
        name: 'Add Project Update',
        subtitle: 'Log daily progress',
        icon: FolderKanban,
        color: '#f97316',
        action: 'agent:project',
      },
    ],
  },
  {
    id: 'settings',
    name: 'Settings',
    icon: Settings,
    commands: [
      {
        id: 'theme',
        name: 'Toggle Theme',
        subtitle: 'Switch light/dark mode',
        icon: Sun,
        color: '#f59e0b',
        action: 'setting:theme',
      },
      {
        id: 'notifications',
        name: 'Notifications',
        subtitle: 'Configure alerts',
        icon: Bell,
        color: '#ec4899',
        action: 'setting:notifications',
      },
    ],
  },
]

interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (command: { name: string; action: string }) => void
  currentView: string
}

function CommandPalette({
  isOpen,
  onClose,
  onSelect,
  currentView: _currentView,
}: CommandPaletteProps) {
  const [search, setSearch] = useState<string>('')
  const [selectedIndex, setSelectedIndex] = useState<number>(0)
  const [recentCommands, setRecentCommands] = useState<string[]>([])

  // Flatten all commands for search
  const allCommands = useMemo((): FlatCommand[] => {
    const commands: FlatCommand[] = []
    COMMAND_GROUPS.forEach((group) => {
      group.commands.forEach((cmd) => {
        commands.push({ ...cmd, group: group.name, groupIcon: group.icon })
      })
    })
    return commands
  }, [])

  // Filter commands based on search
  const filteredCommands = useMemo((): FlatCommand[] => {
    if (!search.trim()) {
      // Show recent commands first, then all
      const recent = recentCommands
        .map((id) => allCommands.find((c) => c.id === id))
        .filter((c): c is FlatCommand => Boolean(c))
      const others = allCommands.filter((c) => !recentCommands.includes(c.id))
      return [...recent, ...others]
    }

    const query = search.toLowerCase()
    return allCommands.filter(
      (cmd) =>
        cmd.name.toLowerCase().includes(query) ||
        cmd.subtitle.toLowerCase().includes(query) ||
        cmd.group.toLowerCase().includes(query),
    )
  }, [search, allCommands, recentCommands])

  // Group filtered commands
  const groupedCommands = useMemo((): Record<string, FlatCommand[]> => {
    const groups: Record<string, FlatCommand[]> = {}
    filteredCommands.forEach((cmd) => {
      if (!groups[cmd.group]) groups[cmd.group] = []
      groups[cmd.group].push(cmd)
    })
    return groups
  }, [filteredCommands])

  const handleSelect = useCallback(
    (command: FlatCommand) => {
      // Add to recent commands
      setRecentCommands((prev) => {
        const updated = [command.id, ...prev.filter((id) => id !== command.id)].slice(0, 5)
        return updated
      })

      onSelect(command)
      onClose()
      setSearch('')
    },
    [onSelect, onClose],
  )

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((prev) => Math.min(prev + 1, filteredCommands.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((prev) => Math.max(prev - 1, 0))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        const selected = filteredCommands[selectedIndex]
        if (selected) handleSelect(selected)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, filteredCommands, selectedIndex, onClose, handleSelect])

  // Reset selection when search changes
  useEffect(() => {
    setSelectedIndex(0)
  }, [])

  if (!isOpen) return null

  let globalIndex = 0

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: overlay backdrop dismisses dialog on click
    <div
      role="presentation"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(4px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '15vh',
      }}
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          onClose()
        }
      }}
    >
      <div
        role="dialog"
        style={{
          width: '90%',
          maxWidth: '600px',
          background: 'var(--c-bg)',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          animation: 'slideIn 0.15s ease-out',
        }}
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.stopPropagation()
          }
        }}
      >
        <style>{`
          @keyframes slideIn {
            from { opacity: 0; transform: scale(0.95) translateY(-10px); }
            to { opacity: 1; transform: scale(1) translateY(0); }
          }
        `}</style>

        {/* Search Input */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '16px 20px',
            borderBottom: '1px solid var(--c-secondary-bg)',
          }}
        >
          <Search size={20} style={{ color: 'var(--c-hint)' }} />
          <input
            type="text"
            placeholder="Search commands..."
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
            style={{
              flex: 1,
              border: 'none',
              background: 'transparent',
              fontSize: '16px',
              color: 'var(--c-text)',
              outline: 'none',
            }}
          />
          <div
            style={{
              padding: '4px 8px',
              background: 'var(--c-secondary-bg)',
              borderRadius: '6px',
              fontSize: '12px',
              color: 'var(--c-hint)',
              fontWeight: 500,
            }}
          >
            ESC
          </div>
        </div>

        {/* Commands List */}
        <div
          style={{
            maxHeight: '400px',
            overflowY: 'auto',
            padding: '8px',
          }}
        >
          {Object.entries(groupedCommands).map(([groupName, commands]) => (
            <div key={groupName} style={{ marginBottom: '8px' }}>
              <div
                style={{
                  padding: '8px 12px',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'var(--c-hint)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                {groupName}
              </div>

              {commands.map((cmd) => {
                const Icon = cmd.icon
                const isSelected = globalIndex === selectedIndex
                const index = globalIndex++

                return (
                  <button
                    type="button"
                    key={cmd.id}
                    tabIndex={0}
                    onClick={() => handleSelect(cmd)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        handleSelect(cmd)
                      }
                    }}
                    onMouseEnter={() => setSelectedIndex(index)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      background: isSelected ? 'var(--c-secondary-bg)' : 'transparent',
                      transition: 'background 0.1s',
                      border: 'none',
                      width: '100%',
                      textAlign: 'inherit',
                      color: 'inherit',
                      font: 'inherit',
                    }}
                  >
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '8px',
                        background: `${cmd.color}15`,
                        color: cmd.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <Icon size={18} />
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: '14px',
                          fontWeight: 600,
                          color: 'var(--c-text)',
                          marginBottom: '2px',
                        }}
                      >
                        {cmd.name}
                      </div>
                      <div
                        style={{
                          fontSize: '12px',
                          color: 'var(--c-hint)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {cmd.subtitle}
                      </div>
                    </div>

                    {isSelected && <ArrowRight size={16} style={{ color: 'var(--c-hint)' }} />}
                  </button>
                )
              })}
            </div>
          ))}

          {filteredCommands.length === 0 && (
            <div
              style={{
                padding: '40px',
                textAlign: 'center',
                color: 'var(--c-hint)',
              }}
            >
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>🔍</div>
              <div>No commands found</div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            padding: '10px 16px',
            borderTop: '1px solid var(--c-secondary-bg)',
            fontSize: '12px',
            color: 'var(--c-hint)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span
              style={{
                padding: '2px 6px',
                background: 'var(--c-secondary-bg)',
                borderRadius: '4px',
              }}
            >
              ↑↓
            </span>
            <span>Navigate</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span
              style={{
                padding: '2px 6px',
                background: 'var(--c-secondary-bg)',
                borderRadius: '4px',
              }}
            >
              ↵
            </span>
            <span>Select</span>
          </div>
          <div style={{ marginLeft: 'auto' }}>Curateur Command Palette</div>
        </div>
      </div>
    </div>
  )
}

export default CommandPalette
