import * as LucideIcons from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNamingPack } from '../hooks/useNamingPack'
import { actions, connectors, views } from '../plugins/registry'
import type { PluginManifest } from '../plugins/schema'

function getIcon(iconName: string) {
  return (LucideIcons as unknown as Record<string, LucideIcons.LucideIcon>)[iconName] || LucideIcons.Box
}

interface CommandItem {
  id: string
  name: string
  subtitle: string
  icon: LucideIcons.LucideIcon
  color: string
  action: string
}

interface FlatCommand extends CommandItem {
  group: string
}

interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (command: { name: string; action: string }) => void
  currentView: string
}

function buildCommandsFromRegistry(pack: { view: string; action: string; connector: string }) {
  const groups: { name: string; commands: CommandItem[] }[] = []

  // Group 1: views -> action "widget:<id>"
  if (views.length > 0) {
    groups.push({
      name: pack.view,
      commands: views.map((v) => ({
        id: v.id,
        name: v.name,
        subtitle: v.description,
        icon: getIcon(v.icon),
        color: v.color,
        action: `widget:${v.id}`,
      })),
    })
  }

  // Group 2: actions -> action "tool:<id>"
  if (actions.length > 0) {
    groups.push({
      name: pack.action,
      commands: actions.map((a) => ({
        id: a.id,
        name: a.name,
        subtitle: a.description,
        icon: getIcon(a.icon),
        color: a.color,
        action: `tool:${a.id}`,
      })),
    })
  }

  // Group 3: connectors -> action "connector:<id>"
  if (connectors.length > 0) {
    groups.push({
      name: pack.connector,
      commands: connectors.map((c) => ({
        id: c.id,
        name: c.name,
        subtitle: c.description,
        icon: getIcon(c.icon),
        color: c.color,
        action: `connector:${c.id}`,
      })),
    })
  }

  return groups
}

function CommandPalette({
  isOpen,
  onClose,
  onSelect,
  currentView: _currentView,
}: CommandPaletteProps) {
  const { pack } = useNamingPack()
  const [search, setSearch] = useState<string>('')
  const [selectedIndex, setSelectedIndex] = useState<number>(0)
  const [recentCommands, setRecentCommands] = useState<string[]>([])

  const commandGroups = useMemo(() => buildCommandsFromRegistry(pack), [pack])

  // Flatten all commands for search
  const allCommands = useMemo((): FlatCommand[] => {
    const commands: FlatCommand[] = []
    commandGroups.forEach((group) => {
      group.commands.forEach((cmd) => {
        commands.push({ ...cmd, group: group.name })
      })
    })
    return commands
  }, [commandGroups])

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
  }, [search])

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
          <LucideIcons.Search size={20} style={{ color: 'var(--c-hint)' }} />
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

                    {isSelected && <LucideIcons.ArrowRight size={16} style={{ color: 'var(--c-hint)' }} />}
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
              <div style={{ fontSize: '14px' }}>No commands found</div>
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
              &uarr;&darr;
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
              &crarr;
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
