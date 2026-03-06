import { AlertCircle, ArrowLeft, Box, CheckCircle2, Play, Puzzle } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import * as LucideIcons from 'lucide-react'
import { useState } from 'react'
import { apiFetch } from '../lib/api'
import { useNamingPack } from '../hooks/useNamingPack'
import type { TelegramWindow } from '../types/telegram'
import { actions, connectors } from '../plugins/registry'
import type { ActionPlugin, SkillInput } from '../plugins/schema'
import TapManager from './TapManager'

function getIcon(iconName: string): LucideIcon {
  return (LucideIcons as unknown as Record<string, LucideIcon>)[iconName] || Box
}

interface SkillResult {
  success: boolean
  message: string
}

interface MessageResponse {
  success: boolean
  error?: string
  message?: string
}

function HookRunner() {
  const { pack } = useNamingPack()
  const [selectedAction, setSelectedAction] = useState<ActionPlugin | null>(null)
  const [showTaps, setShowTaps] = useState<boolean>(false)
  const [inputs, setInputs] = useState<Record<string, string>>({})
  const [running, setRunning] = useState<boolean>(false)
  const [result, setResult] = useState<SkillResult | null>(null)

  const handleActionClick = (action: ActionPlugin) => {
    setResult(null)

    if (!action.skill.inputs || action.skill.inputs.length === 0) {
      runAction(action, {})
    } else {
      setSelectedAction(action)
      setInputs({})
    }
  }

  const runAction = async (action: ActionPlugin, actionInputs: Record<string, string>) => {
    setRunning(true)
    setResult(null)

    try {
      let command = action.skill.command
      if (action.skill.inputs && action.skill.inputs.length > 0) {
        const inputValues = action.skill.inputs
          .map((i: SkillInput) => actionInputs[i.name] || '')
          .filter(Boolean)
          .join(' ')
        command = `${command} ${inputValues}`
      }

      const tg = (window as unknown as TelegramWindow).Telegram?.WebApp
      const chatId = tg?.initDataUnsafe?.user?.id || tg?.initDataUnsafe?.chat?.id

      const response = await apiFetch('/api/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: command,
          chat_id: chatId || '',
        }),
      })

      const data: MessageResponse = await response.json()

      if (data.success) {
        setResult({ success: true, message: data.message || 'Done!' })
      } else {
        setResult({ success: false, message: data.error || 'Something went wrong' })
      }
    } catch {
      setResult({ success: false, message: 'Failed to run skill. Try again.' })
    } finally {
      setRunning(false)
      if (!action.skill.inputs || action.skill.inputs.length === 0) {
        setSelectedAction(null)
      }
    }
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (selectedAction) runAction(selectedAction, inputs)
  }

  const handleBack = () => {
    setSelectedAction(null)
    setShowTaps(false)
    setResult(null)
    setInputs({})
  }

  // Render TapManager
  if (showTaps) {
    return (
      <div style={{ padding: '8px 0' }}>
        <button type="button" onClick={handleBack} className="back-btn">
          <ArrowLeft size={18} />
          Back to {pack.action}
        </button>
        <TapManager />
      </div>
    )
  }

  // Render action form
  if (selectedAction) {
    const SelectedIcon = getIcon(selectedAction.icon)
    const actionInputs = selectedAction.skill.inputs || []

    return (
      <div style={{ padding: '8px 0' }}>
        <button type="button" onClick={handleBack} className="back-btn">
          <ArrowLeft size={18} />
          Back
        </button>

        <div
          className="hero-banner"
          style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="icon-box lg hero">
              <SelectedIcon size={24} />
            </div>
            <div>
              <div style={{ fontSize: '20px', fontWeight: 700 }}>{selectedAction.name}</div>
              <div className="hero-sub">{selectedAction.description}</div>
            </div>
          </div>
        </div>

        {result && (
          <div
            className="card"
            style={{
              marginBottom: '16px',
              background: result.success ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              border: `1px solid ${result.success ? '#22c55e' : '#ef4444'}`,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: result.success ? '#22c55e' : '#ef4444',
              }}
            >
              {result.success ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
              {result.message}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {actionInputs.map((input: SkillInput) => (
            <div key={input.name} style={{ marginBottom: '16px' }}>
              <label className="form-label" htmlFor={`input-${input.name}`}>
                {input.label}
              </label>
              <input
                id={`input-${input.name}`}
                type="text"
                name={input.name}
                placeholder={input.placeholder || ''}
                value={inputs[input.name] || ''}
                onChange={(e) =>
                  setInputs((prev) => ({ ...prev, [input.name]: e.target.value }))
                }
                className="form-input"
              />
            </div>
          ))}

          <button
            type="submit"
            className="btn"
            disabled={running || actionInputs.some((i: SkillInput) => i.required && !inputs[i.name])}
            style={{
              opacity: running || actionInputs.some((i: SkillInput) => i.required && !inputs[i.name]) ? 0.6 : 1,
              cursor: running ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            {running ? (
              <>
                <div
                  style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderTopColor: 'white',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                  }}
                />
                Running...
              </>
            ) : (
              <>
                <Play size={18} />
                Run Skill
              </>
            )}
          </button>
        </form>
      </div>
    )
  }

  // Render actions grid
  return (
    <div style={{ padding: '8px 0' }}>
      <div
        className="hero-banner"
        style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', marginBottom: '20px' }}
      >
        <div className="icon-box lg hero" style={{ marginBottom: '12px' }}>
          <Puzzle size={24} />
        </div>
        <div style={{ fontSize: '24px', fontWeight: 800, marginBottom: '4px' }}>
          {pack.action} & {pack.connector}
        </div>
        <div className="hero-sub">Run commands and manage integrations</div>
      </div>

      <div className="action-grid">
        {actions.map((action) => {
          const Icon = getIcon(action.icon)
          return (
            <button
              key={action.id}
              type="button"
              onClick={() => handleActionClick(action)}
              className="action-tile"
              aria-label={`${action.name}: ${action.description}`}
            >
              <div
                className="icon-box"
                style={{ background: 'var(--c-bg)', color: action.color, width: '40px', height: '40px', borderRadius: '10px' }}
              >
                <Icon size={20} />
              </div>
              <div>
                <div className="tile-title">{action.name}</div>
                <div className="tile-desc">{action.description}</div>
              </div>
            </button>
          )
        })}

        {/* Taps (Connectors) entry */}
        {connectors.length > 0 && (
          <button
            type="button"
            onClick={() => setShowTaps(true)}
            className="action-tile"
            aria-label={`${pack.connector}: Configure external tools and integrations`}
          >
            <div
              className="icon-box"
              style={{ background: 'var(--c-bg)', color: '#6366f1', width: '40px', height: '40px', borderRadius: '10px' }}
            >
              <Puzzle size={20} />
            </div>
            <div>
              <div className="tile-title">{pack.connector}</div>
              <div className="tile-desc">Configure external tools and integrations</div>
            </div>
          </button>
        )}
      </div>
    </div>
  )
}

export default HookRunner
