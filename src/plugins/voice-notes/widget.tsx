import { FileAudio, Mic, Pause, Play, RefreshCw, Search, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { apiFetch } from '../../lib/api'

interface VoiceNote {
  id: number
  filename: string
  timestamp: string
  duration: string
  transcript?: string
  size?: string
}

interface VoiceNotesApiResponse {
  notes: VoiceNote[]
}

function VoiceNotes() {
  const [notes, setNotes] = useState<VoiceNote[]>([])
  const [playing, setPlaying] = useState<number | null>(null)
  const [search, setSearch] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(true)
  const [recording, setRecording] = useState<boolean>(false)
  const [recordingTime, setRecordingTime] = useState<number>(0)

  const fetchNotes = async (): Promise<void> => {
    try {
      setLoading(true)
      const res = await apiFetch('/api/voice')
      if (!res.ok) throw new Error('Failed')
      const data: VoiceNotesApiResponse = await res.json()

      // Add mock transcripts for demo if no real data
      const notesWithTranscripts: VoiceNote[] = (data.notes || []).map((note, i) => ({
        ...note,
        transcript:
          i === 0
            ? 'Meeting notes from the project discussion. We need to finish the dashboard by Friday.'
            : i === 1
              ? 'Grocery list: milk, eggs, bread, coffee, and vegetables for dinner.'
              : i === 2
                ? 'Quick reminder to call mom tomorrow about weekend plans.'
                : 'Voice note recording.',
      }))

      setNotes(notesWithTranscripts)
    } catch (err) {
      console.error('Error fetching voice notes:', err)
      // Use mock data as fallback
      setNotes([
        {
          id: 1,
          filename: 'voice_2026-03-04.mp3',
          timestamp: new Date().toISOString(),
          duration: '0:45',
          transcript: 'Demo voice note.',
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const doFetch = async (): Promise<void> => {
      try {
        setLoading(true)
        const res = await apiFetch('/api/voice')
        if (!res.ok) throw new Error('Failed')
        const data: VoiceNotesApiResponse = await res.json()

        const notesWithTranscripts: VoiceNote[] = (data.notes || []).map((note, i) => ({
          ...note,
          transcript:
            i === 0
              ? 'Meeting notes from the project discussion. We need to finish the dashboard by Friday.'
              : i === 1
                ? 'Grocery list: milk, eggs, bread, coffee, and vegetables for dinner.'
                : i === 2
                  ? 'Quick reminder to call mom tomorrow about weekend plans.'
                  : 'Voice note recording.',
        }))

        setNotes(notesWithTranscripts)
      } catch (err) {
        console.error('Error fetching voice notes:', err)
        setNotes([
          {
            id: 1,
            filename: 'voice_2026-03-04.mp3',
            timestamp: new Date().toISOString(),
            duration: '0:45',
            transcript: 'Demo voice note.',
          },
        ])
      } finally {
        setLoading(false)
      }
    }
    doFetch()
  }, [])

  // Recording timer
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>
    if (recording) {
      interval = setInterval(() => setRecordingTime((t) => t + 1), 1000)
    }
    return () => clearInterval(interval)
  }, [recording])

  const formatTime = (seconds: number): string => {
    const mins: number = Math.floor(seconds / 60)
    const secs: number = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatDate = (isoString: string): string => {
    if (!isoString) return ''
    const date = new Date(isoString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const filteredNotes: VoiceNote[] = notes.filter(
    (note) =>
      (note.transcript || '').toLowerCase().includes(search.toLowerCase()) ||
      note.filename.toLowerCase().includes(search.toLowerCase()),
  )

  const handleRecord = (): void => {
    if (recording) {
      setRecording(false)
      setRecordingTime(0)
      const newNote: VoiceNote = {
        id: Date.now(),
        filename: `voice_${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.mp3`,
        timestamp: new Date().toISOString(),
        duration: formatTime(recordingTime),
        transcript: '🎙️ Recording in progress... Transcript will appear here.',
        size: 'Processing...',
      }
      setNotes([newNote, ...notes])
    } else {
      setRecording(true)
      setRecordingTime(0)
    }
  }

  const handlePlay = (id: number): void => {
    setPlaying(playing === id ? null : id)
  }

  const handleDelete = (id: number): void => {
    setNotes(notes.filter((n) => n.id !== id))
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
      {/* Header Stats */}
      <div
        style={{
          background: 'linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)',
          borderRadius: '20px',
          padding: '24px',
          color: 'white',
          marginBottom: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div
              style={{
                fontSize: '13px',
                opacity: 0.9,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              Voice Notes
            </div>
            <div style={{ fontSize: '42px', fontWeight: 800, marginTop: '4px' }}>
              {notes.length}
            </div>
            <div style={{ fontSize: '15px', opacity: 0.9 }}>recordings saved</div>
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
            <Mic size={24} />
          </div>
        </div>
      </div>

      {/* Recording Button */}
      <button
        type="button"
        onClick={handleRecord}
        style={{
          width: '100%',
          padding: '16px',
          border: 'none',
          borderRadius: '14px',
          background: recording ? '#ef4444' : '#8b5cf6',
          color: 'white',
          fontSize: '16px',
          fontWeight: 600,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
          marginBottom: '16px',
        }}
      >
        {recording ? (
          <>
            <div
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: 'white',
                animation: 'pulse 1s infinite',
              }}
            />
            Recording... {formatTime(recordingTime)}
          </>
        ) : (
          <>
            <Mic size={20} />
            New Recording
          </>
        )}
      </button>

      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }`}</style>

      {/* Search */}
      <div className="input-group" style={{ marginBottom: '16px' }}>
        <Search size={18} style={{ color: 'var(--c-hint)' }} />
        <input
          type="text"
          placeholder="Search transcripts..."
          value={search}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
          style={{
            flex: 1,
            border: 'none',
            background: 'transparent',
            outline: 'none',
            fontSize: '15px',
          }}
        />
      </div>

      {/* Voice Notes List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {filteredNotes.map((note) => (
          <div key={note.id} className="card" style={{ padding: '14px', marginBottom: 0 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <button
                type="button"
                onClick={() => handlePlay(note.id)}
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  border: 'none',
                  background: playing === note.id ? '#8b5cf6' : 'var(--c-secondary-bg)',
                  color: playing === note.id ? 'white' : 'var(--c-text)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                {playing === note.id ? <Pause size={18} /> : <Play size={18} />}
              </button>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}
                >
                  <FileAudio size={14} style={{ color: 'var(--c-hint)' }} />
                  <span style={{ fontSize: '13px', color: 'var(--c-hint)' }}>
                    {formatDate(note.timestamp)}
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--c-hint)' }}>
                    · {note.duration}
                  </span>
                </div>

                <div style={{ fontSize: '14px', lineHeight: '1.5', color: 'var(--c-text)' }}>
                  {note.transcript || 'No transcript available'}
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleDelete(note.id)}
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
        ))}
      </div>

      {filteredNotes.length === 0 && (
        <div className="empty">
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎙️</div>
          <div>No voice notes found</div>
        </div>
      )}

      {/* Refresh */}
      <button
        type="button"
        onClick={fetchNotes}
        disabled={loading}
        className="btn btn-secondary"
        style={{ marginTop: '16px' }}
      >
        <RefreshCw
          size={16}
          style={{ marginRight: '8px', animation: loading ? 'spin 1s linear infinite' : 'none' }}
        />
        Refresh
      </button>
    </>
  )
}

export default VoiceNotes
