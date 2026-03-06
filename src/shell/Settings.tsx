import { Box, Eye, EyeOff, RotateCcw, Settings as SettingsIcon } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import * as LucideIcons from 'lucide-react'
import { NAMING_PACKS, type NamingPack } from '../plugins/naming-packs'
import type { ViewPlugin } from '../plugins/schema'

function getIcon(iconName: string): LucideIcon {
  return (LucideIcons as unknown as Record<string, LucideIcon>)[iconName] || Box
}

interface SettingsProps {
  views: ViewPlugin[]
  isEnabled: (id: string) => boolean
  onToggle: (id: string) => void
  onReset: () => void
  currentPack: NamingPack
  onPackChange: (id: number) => void
}

function Settings({ views, isEnabled, onToggle, onReset, currentPack, onPackChange }: SettingsProps) {
  const enabledCount = views.filter(v => isEnabled(v.id)).length
  const totalCount = views.length

  return (
    <>
      {/* Header */}
      <div
        className="hero-banner"
        style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div className="icon-box lg hero">
            <SettingsIcon size={24} />
          </div>
          <div>
            <div style={{ fontSize: '24px', fontWeight: 800 }}>Widget Settings</div>
            <div className="hero-sub">Customize your dashboard</div>
          </div>
        </div>

        <div className="stats-row">
          <div className="stat">
            <div className="stat-value" style={{ fontSize: '28px' }}>{enabledCount}</div>
            <div className="stat-label">Enabled</div>
          </div>
          <div className="stat">
            <div className="stat-value" style={{ fontSize: '28px' }}>{totalCount - enabledCount}</div>
            <div className="stat-label">Hidden</div>
          </div>
          <div className="stat">
            <div className="stat-value" style={{ fontSize: '28px' }}>{totalCount}</div>
            <div className="stat-label">Total</div>
          </div>
        </div>
      </div>

      {/* Naming Pack Picker */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '15px', fontWeight: 700, marginBottom: '10px', color: 'var(--c-text)' }}>Theme</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {NAMING_PACKS.map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => onPackChange(p.id)}
              aria-label={`Theme: ${p.theme}`}
              aria-pressed={currentPack.id === p.id}
              style={{
                padding: '12px 14px',
                borderRadius: '12px',
                border: currentPack.id === p.id ? '2px solid #6366f1' : '2px solid transparent',
                background: currentPack.id === p.id ? '#6366f110' : 'var(--c-secondary-bg)',
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%',
                color: 'inherit',
                font: 'inherit',
              }}
            >
              <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '2px' }}>{p.theme}</div>
              <div style={{ fontSize: '12px', color: 'var(--c-hint)' }}>{p.view} · {p.action} · {p.connector}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Widget List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
        {views.map((view) => {
          const Icon = getIcon(view.icon)
          const enabled = isEnabled(view.id)

          return (
            <button
              type="button"
              key={view.id}
              onClick={() => onToggle(view.id)}
              aria-label={`${enabled ? 'Disable' : 'Enable'} ${view.name}`}
              aria-pressed={enabled}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '14px',
                background: enabled ? `${view.color}10` : 'var(--c-secondary-bg)',
                borderRadius: '14px',
                cursor: 'pointer',
                border: enabled ? `2px solid ${view.color}` : '2px solid transparent',
                transition: 'all 0.2s',
                opacity: enabled ? 1 : 0.6,
                width: '100%',
                textAlign: 'inherit',
                color: 'inherit',
                font: 'inherit',
              }}
            >
              <div
                className="icon-box"
                style={{
                  background: enabled ? view.color : 'var(--c-bg)',
                  color: enabled ? 'white' : 'var(--c-hint)',
                  transition: 'all 0.2s',
                }}
              >
                <Icon size={22} />
              </div>

              <div style={{ flex: 1 }}>
                <div style={{
                  fontWeight: 600,
                  fontSize: '15px',
                  color: enabled ? 'var(--c-text)' : 'var(--c-hint)',
                  marginBottom: '2px',
                }}>
                  {view.name}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--c-hint)' }}>{view.description}</div>
              </div>

              <div
                className="icon-box sm"
                style={{
                  borderRadius: '50%',
                  background: enabled ? view.color : 'var(--c-bg)',
                  color: enabled ? 'white' : 'var(--c-hint)',
                  transition: 'all 0.2s',
                }}
              >
                {enabled ? <Eye size={18} /> : <EyeOff size={18} />}
              </div>
            </button>
          )
        })}
      </div>

      {/* Reset */}
      <div style={{ display: 'flex', gap: '10px' }}>
        <button type="button" onClick={onReset} className="btn btn-secondary" aria-label="Reset to default widgets">
          <RotateCcw size={18} />
          Reset to Defaults
        </button>
      </div>
    </>
  )
}

export default Settings
