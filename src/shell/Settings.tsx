import * as LucideIcons from 'lucide-react'
import type { ViewPlugin } from '../plugins/schema'

function getIcon(iconName: string) {
  return (LucideIcons as unknown as Record<string, LucideIcons.LucideIcon>)[iconName] || LucideIcons.Box
}

interface SettingsProps {
  views: ViewPlugin[]
  isEnabled: (id: string) => boolean
  onToggle: (id: string) => void
  onReset: () => void
}

function Settings({ views, isEnabled, onToggle, onReset }: SettingsProps) {
  const enabledCount = views.filter(v => isEnabled(v.id)).length
  const totalCount = views.length

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
            <LucideIcons.Settings size={24} />
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
        {views.map((view) => {
          const Icon = getIcon(view.icon)
          const enabled = isEnabled(view.id)

          return (
            <button
              type="button"
              key={view.id}
              onClick={() => onToggle(view.id)}
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
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  background: enabled ? view.color : 'var(--c-bg)',
                  color: enabled ? 'white' : 'var(--c-hint)',
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
                    color: enabled ? 'var(--c-text)' : 'var(--c-hint)',
                    marginBottom: '2px',
                  }}
                >
                  {view.name}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--c-hint)' }}>{view.description}</div>
              </div>

              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: enabled ? view.color : 'var(--c-bg)',
                  color: enabled ? 'white' : 'var(--c-hint)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s',
                }}
              >
                {enabled ? <LucideIcons.Eye size={18} /> : <LucideIcons.EyeOff size={18} />}
              </div>
            </button>
          )
        })}
      </div>

      {/* Reset */}
      <div style={{ display: 'flex', gap: '10px' }}>
        <button
          type="button"
          onClick={onReset}
          style={{
            flex: 1,
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
          <LucideIcons.RotateCcw size={18} />
          Reset to Defaults
        </button>
      </div>
    </>
  )
}

export default Settings
