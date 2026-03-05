import {
  Activity,
  AlertCircle,
  ArrowLeft,
  type LucideIcon,
  Play,
  Plus,
  Puzzle,
  RotateCcw,
  Search,
  Video,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import MCPTools from './MCPTools'

interface SkillInput {
  name: string
  label: string
  placeholder: string
}

interface Skill {
  id: string
  name: string
  icon: LucideIcon
  description: string
  inputs: SkillInput[]
  component?: boolean
}

interface SkillResult {
  success: boolean
  message: string
}

interface MessageResponse {
  success: boolean
  error?: string
}

const SKILLS: Skill[] = [
  {
    id: 'loom',
    name: 'Loom Transcript',
    icon: Video,
    description: 'Get video summaries',
    inputs: [{ name: 'url', label: 'Loom URL', placeholder: 'https://loom.com/share/...' }],
  },
  {
    id: 'memory',
    name: 'Search Memory',
    icon: Search,
    description: 'Find past notes',
    inputs: [{ name: 'query', label: 'Search', placeholder: 'What are you looking for?' }],
  },
  {
    id: 'mcp',
    name: 'MCP Tools',
    icon: Puzzle,
    description: 'Configure agent tools',
    inputs: [],
    component: true,
  },
  {
    id: 'status',
    name: 'System Status',
    icon: Activity,
    description: 'Check health',
    inputs: [],
  },
  {
    id: 'new',
    name: 'New Session',
    icon: Plus,
    description: 'Start fresh',
    inputs: [],
  },
  {
    id: 'reset',
    name: 'Reset',
    icon: RotateCcw,
    description: 'Clear context',
    inputs: [],
  },
]

// Re-use the TelegramWebApp type loosely
interface TelegramWebApp {
  showPopup?: (params: {
    title: string
    message: string
    buttons: { id: string; text: string }[]
  }) => void
  initDataUnsafe?: { chat?: { id: number }; user?: { id: number } }
}

interface SkillsRunnerProps {
  tg: TelegramWebApp | null
}

function SkillsRunner({ tg }: SkillsRunnerProps) {
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null)
  const [inputs, setInputs] = useState<Record<string, string>>({})
  const [running, setRunning] = useState<boolean>(false)
  const [result, setResult] = useState<SkillResult | null>(null)
  const [chatId, setChatId] = useState<number | null>(null)

  useEffect(() => {
    if ((window as unknown as { Telegram?: { WebApp?: TelegramWebApp } }).Telegram?.WebApp) {
      const initData = (window as unknown as { Telegram: { WebApp: TelegramWebApp } }).Telegram
        .WebApp.initDataUnsafe
      const id: number | undefined = initData?.chat?.id || initData?.user?.id
      if (id) setChatId(id)
    }
  }, [])

  const handleSkillClick = (skill: Skill) => {
    if (skill.component) {
      setSelectedSkill(skill)
      return
    }

    if (!chatId) {
      setResult({
        success: false,
        message: 'Open from direct message for full access',
      })
      return
    }

    if (skill.inputs.length === 0) {
      runSkill(skill.id, {})
    } else {
      setSelectedSkill(skill)
      setInputs({})
      setResult(null)
    }
  }

  const runSkill = async (skillId: string, skillInputs: Record<string, string>) => {
    setRunning(true)

    try {
      let command = skillId
      switch (skillId) {
        case 'loom':
          command = `summarize loom ${skillInputs.url}`
          break
        case 'memory':
          command = `search memory ${skillInputs.query}`
          break
        case 'status':
          command = '/status'
          break
        case 'new':
          command = '/new'
          break
        case 'reset':
          command = '/reset'
          break
      }

      const response = await fetch('/api/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: command,
          chat_id: chatId,
        }),
      })

      const data: MessageResponse = await response.json()

      if (data.success) {
        setResult({ success: true, message: 'Sent! Check your chat.' })
        if (tg) {
          tg.showPopup?.({
            title: 'Done',
            message: 'Processing your request.',
            buttons: [{ id: 'ok', text: 'OK' }],
          })
        }
      } else {
        setResult({ success: false, message: data.error || 'Failed' })
      }
    } catch (err) {
      setResult({ success: false, message: (err as Error).message })
    } finally {
      setRunning(false)
      setSelectedSkill(null)
    }
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (selectedSkill?.id) runSkill(selectedSkill.id, inputs)
  }

  // Render MCP Tools component
  if (selectedSkill?.id === 'mcp') {
    return (
      <>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => setSelectedSkill(null)}
          style={{ marginBottom: '16px' }}
        >
          <ArrowLeft size={16} style={{ marginRight: '8px' }} />
          Back to Tools
        </button>
        <MCPTools />
      </>
    )
  }

  if (selectedSkill) {
    const Icon = selectedSkill.icon
    return (
      <>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => setSelectedSkill(null)}
          style={{ marginBottom: '16px' }}
        >
          <ArrowLeft size={16} style={{ marginRight: '8px' }} />
          Back
        </button>

        <div className="card" style={{ textAlign: 'center', padding: '24px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'var(--c-accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 12px',
              color: 'white',
            }}
          >
            <Icon size={24} />
          </div>
          <div style={{ fontWeight: 700, fontSize: '17px', marginBottom: '4px' }}>
            {selectedSkill.name}
          </div>
          <div style={{ fontSize: '14px', color: 'var(--c-hint)' }}>
            {selectedSkill.description}
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {selectedSkill.inputs.map((input) => (
            <div key={input.name} style={{ marginBottom: '16px' }}>
              <div className="card-header" style={{ marginBottom: '8px' }}>
                {input.label}
              </div>
              <div className="input-group">
                <input
                  type="text"
                  value={inputs[input.name] || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setInputs({ ...inputs, [input.name]: e.target.value })
                  }
                  placeholder={input.placeholder}
                  style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none' }}
                  required
                />
              </div>
            </div>
          ))}

          <button type="submit" className="btn" disabled={running}>
            <Play size={16} style={{ marginRight: '8px' }} />
            {running ? 'Running...' : 'Run'}
          </button>
        </form>
      </>
    )
  }

  return (
    <>
      {result && (
        <div
          className="card"
          style={{
            background: result.success ? 'rgba(52, 199, 89, 0.1)' : 'rgba(255, 59, 48, 0.1)',
            color: result.success ? 'var(--c-success)' : '#ff3b30',
            marginBottom: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {result.success ? '✓' : '<AlertCircle size={16}/>'}
            {result.message}
          </div>
        </div>
      )}

      {!chatId && (
        <div
          className="card"
          style={{
            background: 'rgba(255, 149, 0, 0.1)',
            color: 'var(--c-warning)',
            marginBottom: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <AlertCircle size={16} />
          Open from DM for full access
        </div>
      )}

      <div className="section-title">Available Tools</div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {SKILLS.map((skill) => {
          const Icon = skill.icon
          const disabled = !chatId && skill.id !== 'status' && skill.id !== 'mcp'
          return (
            <button
              type="button"
              key={skill.id}
              onClick={() => handleSkillClick(skill)}
              disabled={disabled}
              className="list-item"
              style={{
                opacity: disabled ? 0.5 : 1,
                cursor: disabled ? 'not-allowed' : 'pointer',
                border: 'none',
                width: '100%',
                textAlign: 'left',
                background:
                  skill.id === 'mcp' ? 'rgba(99, 102, 241, 0.1)' : 'var(--c-secondary-bg)',
              }}
            >
              <div className="left">
                <div
                  className="icon"
                  style={{ background: skill.id === 'mcp' ? '#6366f1' : 'var(--c-accent)' }}
                >
                  <Icon size={16} />
                </div>
                <div>
                  <div className="title">{skill.name}</div>
                  <div className="meta">{skill.description}</div>
                </div>
              </div>
              {skill.id === 'mcp' && (
                <span
                  style={{
                    padding: '4px 8px',
                    background: '#6366f1',
                    color: 'white',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 600,
                  }}
                >
                  NEW
                </span>
              )}
            </button>
          )
        })}
      </div>
    </>
  )
}

export default SkillsRunner
