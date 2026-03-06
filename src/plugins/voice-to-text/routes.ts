import { Hono } from 'hono'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { WORKSPACE_DIR, fileExists, listDir, getFileStat } from '../../../api/lib/workspace'

function getVoiceTranscripts(limit = 10): unknown[] {
  const transcriptDir = path.join(WORKSPACE_DIR, 'voice-transcripts')
  try {
    if (!fileExists(transcriptDir)) return []

    const files = listDir(transcriptDir)
      .filter((f: string) => f.endsWith('.json'))
      .map((f: string) => {
        const stats = getFileStat(path.join(transcriptDir, f))
        return { file: f, mtime: stats ? stats.mtime : new Date(0) }
      })
      .sort((a: { file: string; mtime: Date }, b: { file: string; mtime: Date }) => b.mtime.getTime() - a.mtime.getTime())
      .slice(0, limit)

    return files
      .map((f: { file: string; mtime: Date }) => {
        try {
          return JSON.parse(readFileSync(path.join(transcriptDir, f.file), 'utf8'))
        } catch {
          return null
        }
      })
      .filter(Boolean)
  } catch {
    return []
  }
}

const router = new Hono()

router.get('/', (c) => {
  const limit = Math.min(Math.max(parseInt(c.req.query('limit') || '10', 10), 1), 100)
  return c.json(getVoiceTranscripts(limit))
})

export default router
