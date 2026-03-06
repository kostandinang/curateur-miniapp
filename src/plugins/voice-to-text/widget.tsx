import { Clock, FileText, MessageSquare, Mic, Pause, Play, RefreshCw, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { apiFetch } from '../../lib/api'

interface Transcript {
  id: string
  timestamp: string
  transcript: string
  duration: number
  status: string
}

interface VoiceStats {
  total: number
  today: number
}

function VoiceToText() {
  const [transcripts, setTranscripts] = useState<Transcript[]>([])
  const [stats, setStats] = useState<VoiceStats>({ total: 0, today: 0 })
  const [loading, setLoading] = useState<boolean>(true)
  const [playing, setPlaying] = useState<string | null>(null)

  const fetchData = async (): Promise<void> => {
    try {
      setLoading(true)
      const [transcriptsRes, statsRes] = await Promise.all([
        apiFetch('/api/voice-transcripts'),
        apiFetch('/api/voice-stats'),
      ])

      if (transcriptsRes.ok) {
        const data: Transcript[] = await transcriptsRes.json()
        setTranscripts(data || [])
      }

      if (statsRes.ok) {
        const statsData: VoiceStats = await statsRes.json()
        setStats(statsData || { total: 0, today: 0 })
      }
    } catch (err) {
      console.error('Error fetching transcripts:', err)
      // Use mock data
      setTranscripts([
        {
          id: 'voice_2026-03-04_23-30-00',
          timestamp: '2026-03-04T23:30:00Z',
          transcript:
            'Hey, just wanted to check in about the project. Let me know when you have a chance to review the updates.',
          duration: 8,
          status: 'transcribed',
        },
        {
          id: 'voice_2026-03-04_22-15-00',
          timestamp: '2026-03-04T22:15:00Z',
          transcript: 'Reminder to log my OMAD for today. Everything went well, no challenges.',
          duration: 5,
          status: 'transcribed',
        },
      ])
      setStats({ total: 12, today: 3 })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const doFetch = async (): Promise<void> => {
      try {
        setLoading(true)
        const [transcriptsRes, statsRes] = await Promise.all([
          apiFetch('/api/voice-transcripts'),
          apiFetch('/api/voice-stats'),
        ])

        if (transcriptsRes.ok) {
          const data: Transcript[] = await transcriptsRes.json()
          setTranscripts(data || [])
        }

        if (statsRes.ok) {
          const statsData: VoiceStats = await statsRes.json()
          setStats(statsData || { total: 0, today: 0 })
        }
      } catch (err) {
        console.error('Error fetching transcripts:', err)
        setTranscripts([
          {
            id: 'voice_2026-03-04_23-30-00',
            timestamp: '2026-03-04T23:30:00Z',
            transcript:
              'Hey, just wanted to check in about the project. Let me know when you have a chance to review the updates.',
            duration: 8,
            status: 'transcribed',
          },
          {
            id: 'voice_2026-03-04_22-15-00',
            timestamp: '2026-03-04T22:15:00Z',
            transcript: 'Reminder to log my OMAD for today. Everything went well, no challenges.',
            duration: 5,
            status: 'transcribed',
          },
        ])
        setStats({ total: 12, today: 3 })
      } finally {
        setLoading(false)
      }
    }
    doFetch()
    // Auto-refresh every 30 seconds
    const interval = setInterval(doFetch, 30000)
    return () => clearInterval(interval)
  }, [])

  const formatDate = (isoString: string): string => {
    if (!isoString) return ''
    const date = new Date(isoString)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    const dateStr: string = date.toISOString().split('T')[0]
    if (dateStr === today.toISOString().split('T')[0]) return 'Today'
    if (dateStr === yesterday.toISOString().split('T')[0]) return 'Yesterday'
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const handlePlay = (id: string): void => {
    setPlaying(playing === id ? null : id)
  }

  const handleDelete = (id: string): void => {
    setTranscripts(transcripts.filter((t) => t.id !== id))
  }

  if (loading) {
    return (
      <div className="empty">
        <Mic size={24} className="spinner" />
      </div>
    )
  }

  return (
    <>
      {/* Header */}
      <div
        style={{
          background: 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)',
          borderRadius: '20px',
          padding: '24px',
          color: 'white',
          marginBottom: '16px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px',
          }}
        >
          <div>
            <div
              style={{
                fontSize: '13px',
                opacity: 0.9,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              Voice to Text
            </div>
            <div style={{ fontSize: '42px', fontWeight: 800, marginTop: '4px' }}>{stats.total}</div>
            <div style={{ fontSize: '15px', opacity: 0.9 }}>transcripts</div>
          </div>

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
            <FileText size={24} />
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
            <div style={{ fontSize: '20px', fontWeight: 700 }}>{stats.today}</div>
            <div style={{ fontSize: '11px', opacity: 0.8 }}>Today</div>
          </div>
          <div
            style={{
              flex: 1,
              textAlign: 'center',
              borderLeft: '1px solid rgba(255,255,255,0.2)',
            }}
          >
            <div style={{ fontSize: '20px', fontWeight: 700 }}>{transcripts.length}</div>
            <div style={{ fontSize: '11px', opacity: 0.8 }}>Recent</div>
          </div>
          <div
            style={{
              flex: 1,
              textAlign: 'center',
              borderLeft: '1px solid rgba(255,255,255,0.2)',
            }}
          >
            <div style={{ fontSize: '20px', fontWeight: 700 }}>🎙️</div>
            <div style={{ fontSize: '11px', opacity: 0.8 }}>Active</div>
          </div>
        </div>
      </div>

      {/* How it Works */}
      <div className="card" style={{ marginBottom: '16px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '12px',
            fontWeight: 600,
          }}
        >
          <MessageSquare size={16} />
          How it works
        </div>
        <div
          style={{
            fontSize: '14px',
            color: 'var(--c-hint)',
            lineHeight: '1.6',
          }}
        >
          Send a voice message to the bot → Auto-transcribed using Whisper → Text sent back
          instantly
        </div>
      </div>

      {/* Transcripts List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {transcripts.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎙️</div>
            <div style={{ color: 'var(--c-hint)' }}>No transcripts yet. Send a voice message!</div>
          </div>
        ) : (
          transcripts.map((transcript) => (
            <div key={transcript.id} className="card" style={{ marginBottom: 0 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                }}
              >
                <button
                  type="button"
                  onClick={() => handlePlay(transcript.id)}
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    border: 'none',
                    background: playing === transcript.id ? '#ec4899' : 'var(--c-secondary-bg)',
                    color: playing === transcript.id ? 'white' : 'var(--c-text)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                >
                  {playing === transcript.id ? <Pause size={18} /> : <Play size={18} />}
                </button>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '8px',
                    }}
                  >
                    <span
                      style={{
                        padding: '4px 8px',
                        background: 'var(--c-secondary-bg)',
                        borderRadius: '6px',
                        fontSize: '11px',
                        color: 'var(--c-hint)',
                        fontWeight: 600,
                      }}
                    >
                      {formatDate(transcript.timestamp)}
                    </span>

                    {transcript.duration && (
                      <span
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '12px',
                          color: 'var(--c-hint)',
                        }}
                      >
                        <Clock size={12} />
                        {transcript.duration}s
                      </span>
                    )}
                  </div>

                  <div
                    style={{
                      fontSize: '14px',
                      lineHeight: '1.5',
                      color: 'var(--c-text)',
                      fontStyle: 'italic',
                    }}
                  >
                    "{transcript.transcript}"
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleDelete(transcript.id)}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'transparent',
                    color: 'var(--c-hint)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Refresh */}
      <button
        type="button"
        onClick={fetchData}
        disabled={loading}
        className="btn btn-secondary"
        style={{ marginTop: '16px' }}
      >
        <RefreshCw
          size={16}
          style={{
            marginRight: '8px',
            animation: loading ? 'spin 1s linear infinite' : 'none',
          }}
        />
        Refresh
      </button>
    </>
  )
}

export default VoiceToText
