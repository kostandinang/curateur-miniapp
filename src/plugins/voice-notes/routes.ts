import { Hono } from 'hono'
import { createReadStream } from 'node:fs'
import path from 'node:path'
import { WORKSPACE_DIR, fileExists, listDir, getFileStat } from '../../../api/lib/workspace'

const AUDIO_MIME: Record<string, string> = {
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
  '.m4a': 'audio/mp4',
  '.webm': 'audio/webm',
  '.opus': 'audio/ogg; codecs=opus',
}

const ALLOWED_EXTENSIONS = new Set(Object.keys(AUDIO_MIME))

function getVoiceNotes() {
  const voiceDir = path.join(WORKSPACE_DIR, 'voice-notes')
  try {
    if (!fileExists(voiceDir)) return { notes: [], count: 0 }

    const files = listDir(voiceDir)
    const notes = files
      .filter((f: string) => ALLOWED_EXTENSIONS.has(path.extname(f).toLowerCase()))
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

router.get('/:filename', (c) => {
  const filename = c.req.param('filename')

  // Reject path traversal attempts
  if (filename.includes('/') || filename.includes('..') || filename.includes('\0')) {
    return c.json({ error: 'Invalid filename' }, 400)
  }

  const ext = path.extname(filename).toLowerCase()
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return c.json({ error: 'Unsupported file type' }, 400)
  }

  const filePath = path.join(WORKSPACE_DIR, 'voice-notes', filename)
  if (!fileExists(filePath)) {
    return c.json({ error: 'File not found' }, 404)
  }

  const stats = getFileStat(filePath)
  const contentType = AUDIO_MIME[ext] || 'audio/octet-stream'
  const stream = createReadStream(filePath)

  return new Response(stream as unknown as ReadableStream, {
    headers: {
      'Content-Type': contentType,
      'Content-Length': stats ? String(stats.size) : '',
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'no-cache',
    },
  })
})

export default router
