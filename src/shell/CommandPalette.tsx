import { ArrowRight, Search } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNamingPack } from '../hooks/useNamingPack'
import { getIcon } from '../lib/icons'
import { actions, connectors, views } from '../plugins/registry'

interface CommandItem {
  id: string
  name: string
  subtitle: string
  icon: LucideIcon
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
}

function buildCommandsFromRegistry(pack: { view: string; action: string; connector: string }) {
  const groups: { name: string; commands: CommandItem[] }[] = []

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
}: CommandPaletteProps) {
  const { pack } = useNamingPack()
  const [search, setSearch] = useState<string>('')
  const [selectedIndex, setSelectedIndex] = useState<number>(0)
  const [recentCommands, setRecentCommands] = useState<string[]>([])

  const commandGroups = useMemo(() => buildCommandsFromRegistry(pack), [pack])

  const allCommands = useMemo((): FlatCommand[] => {
    const commands: FlatCommand[] = []
    commandGroups.forEach((group) => {
      group.commands.forEach((cmd) => {
        commands.push({ ...cmd, group: group.name })
      })
    })
    return commands
  }, [commandGroups])

  const filteredCommands = useMemo((): FlatCommand[] => {
    if (!search.trim()) {
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

  useEffect(() => {
    setSelectedIndex(0)
  }, [search])

  if (!isOpen) return null

  let globalIndex = 0

  return (
    <div
      role="presentation"
      className="cmd-overlay"
      onClick={onClose}
      onKeyDown={(e) => { if (e.key === 'Escape') onClose() }}
    >
      <div
        role="dialog"
        aria-label="Command palette"
        className="cmd-dialog"
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') e.stopPropagation() }}
      >
        {/* Search Input */}
        <div className="cmd-search">
          <Search size={20} style={{ color: 'var(--c-hint)' }} />
          <input
            type="text"
            placeholder="Search commands..."
            aria-label="Search commands"
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
          />
          <span className="cmd-esc">ESC</span>
        </div>

        {/* Commands List */}
        <div className="cmd-list">
          {Object.entries(groupedCommands).map(([groupName, commands]) => (
            <div key={groupName} style={{ marginBottom: '8px' }}>
              <div className="cmd-group-label">{groupName}</div>

              {commands.map((cmd) => {
                const Icon = cmd.icon
                const isSelected = globalIndex === selectedIndex
                const index = globalIndex++

                return (
                  <button
                    type="button"
                    key={cmd.id}
                    tabIndex={0}
                    aria-label={`${cmd.name}: ${cmd.subtitle}`}
                    onClick={() => handleSelect(cmd)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        handleSelect(cmd)
                      }
                    }}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`cmd-item ${isSelected ? 'selected' : ''}`}
                  >
                    <div
                      className="icon-box sm"
                      style={{ background: `${cmd.color}15`, color: cmd.color }}
                    >
                      <Icon size={18} />
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="cmd-item-title">{cmd.name}</div>
                      <div className="cmd-item-sub">{cmd.subtitle}</div>
                    </div>

                    {isSelected && <ArrowRight size={16} style={{ color: 'var(--c-hint)' }} />}
                  </button>
                )
              })}
            </div>
          ))}

          {filteredCommands.length === 0 && (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--c-hint)', fontSize: '14px' }}>
              No commands found
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="cmd-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span className="cmd-kbd">&uarr;&darr;</span>
            <span>Navigate</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span className="cmd-kbd">&crarr;</span>
            <span>Select</span>
          </div>
          <div style={{ marginLeft: 'auto' }}>Curateur Command Palette</div>
        </div>
      </div>
    </div>
  )
}

export default CommandPalette
