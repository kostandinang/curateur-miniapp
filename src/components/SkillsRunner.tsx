import {
  Activity,
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
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
  message?: string
}

const SKILLS: Skill[] = [
  {
    id: 'loom',
    name: 'Loom Transcript',
    icon: Video,
    description: 'Get video summaries from Loom URLs',
    inputs: [{ name: 'url', label: 'Loom URL', placeholder: 'https://loom.com/share/...' }],
  },
  {
    id: 'memory',
    name: 'Search Memory',
    icon: Search,
    description: 'Find past notes and conversations',
    inputs: [{ name: 'query', label: 'Search', placeholder: 'What are you looking for?' }],
  },
  {
    id: 'mcp',
    name: 'MCP Tools',
    icon: Puzzle,
    description: 'Configure external tools and integrations',
    inputs: [],
    component: true,
  },
  {
    id: 'status',
    name: 'System Status',
    icon: Activity,
    description: 'Check OpenClaw health and connection',
    inputs: [],
  },
  {
    id: 'new',
    name: 'New Session',
    icon: Plus,
    description: 'Start fresh with cleared context',
    inputs: [],
  },
  {
    id: 'reset',
    name: 'Reset',
    icon: RotateCcw,
    description: 'Clear all context and restart',
    inputs: [],
  },
]

function SkillsRunner() {
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null)
  const [inputs, setInputs] = useState<Record<string, string>>({})
  const [running, setRunning] = useState<boolean>(false)
  const [result, setResult] = useState<SkillResult | null>(null)

  const handleSkillClick = (skill: Skill) => {
    setResult(null)
    
    if (skill.component) {
      setSelectedSkill(skill)
      return
    }

    if (skill.inputs.length === 0) {
      runSkill(skill.id, {})
    } else {
      setSelectedSkill(skill)
      setInputs({})
    }
  }

  const runSkill = async (skillId: string, skillInputs: Record<string, string>) => {
    setRunning(true)
    setResult(null)

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

      // Get Telegram user ID from WebApp context if available
      const tg = (window as unknown as { Telegram?: { WebApp?: { initDataUnsafe?: { user?: { id: number }; chat?: { id: number } } } } }).Telegram?.WebApp
      const chatId = tg?.initDataUnsafe?.user?.id || tg?.initDataUnsafe?.chat?.id

      const response = await fetch('/api/message', {
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
    } catch (err) {
      setResult({ success: false, message: 'Failed to run skill. Try again.' })
    } finally {
      setRunning(false)
      // Close window for skills with no inputs, or for new/reset always
      if (selectedSkill?.inputs.length === 0 || skillId === 'new' || skillId === 'reset') {
        setSelectedSkill(null)
      }
    }
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (selectedSkill?.id) runSkill(selectedSkill.id, inputs)
  }

  const handleBack = () => {
    setSelectedSkill(null)
    setResult(null)
    setInputs({})
  }

  // Render MCP Tools component
  if (selectedSkill?.id === 'mcp') {
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
          <ArrowLeft size={18} />
          Back to Skills
        </button>
        <MCPTools />
      </div>
    )
  }

  // Render skill form
  if (selectedSkill) {
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
          <ArrowLeft size={18} />
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
              <selectedSkill.icon size={24} />
            </div>
            <div>
              <div style={{ fontSize: '20px', fontWeight: 700 }}>{selectedSkill.name}</div>
              <div style={{ fontSize: '14px', opacity: 0.9 }}>{selectedSkill.description}</div>
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
              {result.success ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
              {result.message}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {selectedSkill.inputs.map((input) => (
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
                placeholder={input.placeholder}
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
            disabled={running || selectedSkill.inputs.some((i) => !inputs[i.name])}
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
              opacity: running || selectedSkill.inputs.some((i) => !inputs[i.name]) ? 0.6 : 1,
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

  // Render skills grid
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
          <Puzzle size={24} />
        </div>
        <div style={{ fontSize: '24px', fontWeight: 800, marginBottom: '4px' }}>Tools & Skills</div>
        <div style={{ fontSize: '15px', opacity: 0.9 }}>Run commands and manage integrations</div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '12px',
        }}
      >
        {SKILLS.map((skill) => (
          <button
            key={skill.id}
            type="button"
            onClick={() => handleSkillClick(skill)}
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
                color: '#667eea',
              }}
            >
              <skill.icon size={20} />
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '2px' }}>
                {skill.name}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--c-hint)' }}>{skill.description}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

export default SkillsRunner
