import * as LucideIcons from 'lucide-react'
import { useState } from 'react'
import { apiFetch } from '../lib/api'
import { useNamingPack } from '../hooks/useNamingPack'
import type { TelegramWindow } from '../types/telegram'
import Loader from './Loader'
import { actions, connectors } from '../plugins/registry'
import type { ActionPlugin, SkillInput } from '../plugins/schema'
import TapManager from './TapManager'

function getIcon(iconName: string) {
  return (LucideIcons as unknown as Record<string, LucideIcons.LucideIcon>)[iconName] || LucideIcons.Box
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
      // Build command from manifest
      let command = action.skill.command
      if (action.skill.inputs && action.skill.inputs.length > 0) {
        const inputValues = action.skill.inputs
          .map((i: SkillInput) => actionInputs[i.name] || '')
          .filter(Boolean)
          .join(' ')
        command = `${command} ${inputValues}`
      }

      // Get Telegram user ID from WebApp context if available
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
      // Close window for actions with no inputs
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
        <button
          type="button"
          onClick={handleBack}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 0',
            background: 'none',
            border: 'none',
            color: 'var(--c-text)',
            fontSize: '14px',
            cursor: 'pointer',
            marginBottom: '16px',
          }}
        >
          <LucideIcons.ArrowLeft size={18} />
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
        <button
          type="button"
          onClick={handleBack}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 0',
            background: 'none',
            border: 'none',
            color: 'var(--c-text)',
            fontSize: '14px',
            cursor: 'pointer',
            marginBottom: '16px',
          }}
        >
          <LucideIcons.ArrowLeft size={18} />
          Back
        </button>

        <div
          className="card"
          style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            marginBottom: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
              <SelectedIcon size={24} />
            </div>
            <div>
              <div style={{ fontSize: '20px', fontWeight: 700 }}>{selectedAction.name}</div>
              <div style={{ fontSize: '14px', opacity: 0.9 }}>{selectedAction.description}</div>
            </div>
          </div>
        </div>

        {result && (
          <div
            className="card"
            style={{
              marginBottom: '16px',
              background: result.success
                ? 'rgba(34, 197, 94, 0.1)'
                : 'rgba(239, 68, 68, 0.1)',
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
              {result.success ? <LucideIcons.CheckCircle2 size={18} /> : <LucideIcons.AlertCircle size={18} />}
              {result.message}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {actionInputs.map((input: SkillInput) => (
            <div key={input.name} style={{ marginBottom: '16px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: 600,
                  marginBottom: '6px',
                }}
              >
                {input.label}
              </label>
              <input
                type="text"
                name={input.name}
                placeholder={input.placeholder || ''}
                value={inputs[input.name] || ''}
                onChange={(e) =>
                  setInputs((prev) => ({ ...prev, [input.name]: e.target.value }))
                }
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: '1px solid var(--c-secondary-bg)',
                  background: 'var(--c-bg)',
                  color: 'var(--c-text)',
                  fontSize: '15px',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          ))}

          <button
            type="submit"
            disabled={running || actionInputs.some((i: SkillInput) => i.required && !inputs[i.name])}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: '12px',
              border: 'none',
              background: 'var(--c-primary)',
              color: 'white',
              fontSize: '15px',
              fontWeight: 600,
              cursor: running ? 'not-allowed' : 'pointer',
              opacity: running || actionInputs.some((i: SkillInput) => i.required && !inputs[i.name]) ? 0.6 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            {running ? (
              <>
                <Loader variant="arc" size="sm" white />
                Running...
              </>
            ) : (
              <>
                <LucideIcons.Play size={18} />
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
        style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: '20px',
          padding: '24px',
          color: 'white',
          marginBottom: '20px',
        }}
      >
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'rgba(255,255,255,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '12px',
          }}
        >
          <LucideIcons.Puzzle size={24} />
        </div>
        <div style={{ fontSize: '24px', fontWeight: 800, marginBottom: '4px' }}>
          {pack.action} & {pack.connector}
        </div>
        <div style={{ fontSize: '15px', opacity: 0.9 }}>Run commands and manage integrations</div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '12px',
        }}
      >
        {actions.map((action) => {
          const Icon = getIcon(action.icon)
          return (
            <button
              key={action.id}
              type="button"
              onClick={() => handleActionClick(action)}
              style={{
                padding: '16px',
                borderRadius: '16px',
                border: 'none',
                background: 'var(--c-secondary-bg)',
                color: 'var(--c-text)',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: '12px',
                textAlign: 'left',
                transition: 'transform 0.2s',
              }}
            >
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: 'var(--c-bg)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: action.color,
                }}
              >
                <Icon size={20} />
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '2px' }}>
                  {action.name}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--c-hint)' }}>{action.description}</div>
              </div>
            </button>
          )
        })}

        {/* Taps (Connectors) entry */}
        {connectors.length > 0 && (
          <button
            type="button"
            onClick={() => setShowTaps(true)}
            style={{
              padding: '16px',
              borderRadius: '16px',
              border: 'none',
              background: 'var(--c-secondary-bg)',
              color: 'var(--c-text)',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: '12px',
              textAlign: 'left',
              transition: 'transform 0.2s',
            }}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'var(--c-bg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#6366f1',
              }}
            >
              <LucideIcons.Puzzle size={20} />
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '2px' }}>
                {pack.connector}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--c-hint)' }}>
                Configure external tools and integrations
              </div>
            </div>
          </button>
        )}
      </div>
    </div>
  )
}

export default HookRunner
