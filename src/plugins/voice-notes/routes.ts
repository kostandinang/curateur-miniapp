import { Hono } from 'hono'
import path from 'node:path'
import { WORKSPACE_DIR, fileExists, listDir, getFileStat } from '../../../api/lib/workspace'

function getVoiceNotes() {
  const voiceDir = path.join(WORKSPACE_DIR, 'voice-notes')
  try {
    if (!fileExists(voiceDir)) return { notes: [], count: 0 }

    const files = listDir(voiceDir)
    const notes = files
      .filter((f: string) => f.endsWith('.mp3') || f.endsWith('.ogg'))
      .map((f: string) => {
        const stats = getFileStat(path.join(voiceDir, f))
        return {
          id: f,
          filename: f,
          timestamp: stats ? stats.mtime.toISOString() : new Date().toISOString(),
          duration: '0:00',
          size: stats ? `${(stats.size / 1024 / 1024).toFixed(1)} MB` : '0 MB',
        }
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    return { notes, count: notes.length }
  } catch {
    return { notes: [], count: 0 }
  }
}

function getVoiceStats() {
  const transcriptDir = path.join(WORKSPACE_DIR, 'voice-transcripts')
  try {
    if (!fileExists(transcriptDir)) return { total: 0, today: 0 }

    const files = listDir(transcriptDir).filter((f: string) => f.endsWith('.json'))
    const today = new Date().toISOString().split('T')[0]
    const todayCount = files.filter((f: string) => {
      const stats = getFileStat(path.join(transcriptDir, f))
      return stats ? stats.mtime.toISOString().startsWith(today) : false
    }).length

    return { total: files.length, today: todayCount }
  } catch {
    return { total: 0, today: 0 }
  }
}

const router = new Hono()

router.get('/', (c) => {
  return c.json(getVoiceNotes())
})

router.get('/stats', (c) => {
  return c.json(getVoiceStats())
})

export default router
