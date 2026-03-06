import { Hono } from 'hono'
import { readFileSync } from 'node:fs'
import { workspacePath, fileExists } from '../../../api/lib/workspace'

interface OMADEntry {
  date: string
  time: string
  note: string
  success: boolean
  lineNum?: number
}

function getOMADData() {
  try {
    const memoryPath = workspacePath('MEMORY.md')
    if (!fileExists(memoryPath)) {
      return { streak: 0, totalEntries: 0, history: [], lastEntry: null, entries: [] }
    }

    const content = readFileSync(memoryPath, 'utf8') as string
    const entries: OMADEntry[] = []
    let lineNum = 0

    for (const line of content.split('\n')) {
      lineNum++
      const match = line.match(/^OMAD:\s*(\d{4}-\d{2}-\d{2})\s*(\d{2}:\d{2})\s*UTC\s*-\s*(.+)$/)
      if (match) {
        const note = match[3]
        const lower = note.toLowerCase()
        entries.push({
          date: match[1],
          time: match[2],
          note,
          lineNum,
          success:
            !lower.includes('broke') && !lower.includes('missed') && !lower.includes('failed'),
        })
      }
    }

    // Sort by date/time desc for API response
    const sorted = entries.sort((a, b) => {
      const timeDiff = new Date(`${b.date}T${b.time}`).getTime() - new Date(`${a.date}T${a.time}`).getTime()
      if (timeDiff !== 0) return timeDiff
      return (b.lineNum || 0) - (a.lineNum || 0)
    })

    // Get only the latest entry per date (use timestamp to determine latest, not line number)
    const latestPerDate = new Map<string, OMADEntry>()
    for (const entry of entries) {
      const existing = latestPerDate.get(entry.date)
      if (!existing) {
        latestPerDate.set(entry.date, entry)
      } else {
        // Compare timestamps - keep the later one
        const entryTime = new Date(`${entry.date}T${entry.time}`).getTime()
        const existingTime = new Date(`${existing.date}T${existing.time}`).getTime()
        if (entryTime > existingTime) {
          latestPerDate.set(entry.date, entry)
        }
      }
    }
    const uniqueEntries = Array.from(latestPerDate.values()).sort(
      (a, b) =>
        new Date(`${b.date}T${b.time}`).getTime() - new Date(`${a.date}T${a.time}`).getTime(),
    )

    let streak = 0
    for (const entry of uniqueEntries) {
      if (entry.success) streak++
      else break
    }

    const history = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().split('T')[0]
      const entry = latestPerDate.get(dateStr)

      history.push({
        date: dateStr,
        dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
        dayNum: d.getDate(),
        completed: entry ? entry.success : false,
        isToday: i === 0,
        note: entry ? entry.note : null,
      })
    }

    return {
      streak,
      totalEntries: entries.length,
      history,
      lastEntry: sorted[0] || null,
      entries: sorted.slice(0, 10),
    }
  } catch {
    return { streak: 0, totalEntries: 0, history: [], lastEntry: null, entries: [] }
  }
}

const router = new Hono()

router.get('/', (c) => {
  return c.json(getOMADData())
})

export default router
