import { Hono } from 'hono'
import { workspacePath, readJsonFile } from '../../../api/lib/workspace'

async function getWellbeingData() {
  const dbPath = workspacePath('wellbeing/moods.json')
  const data = await readJsonFile<{ entries?: unknown[]; streak?: number; stats?: object }>(
    dbPath,
    { entries: [], streak: 0, stats: {} },
  )
  return {
    entries: data.entries || [],
    streak: data.streak || 0,
    stats: data.stats || {},
  }
}

const router = new Hono()

router.get('/', async (c) => {
  return c.json(await getWellbeingData())
})

export default router
