import { Hono } from 'hono'
import { workspacePath, readJsonFile } from '../../../api/lib/workspace'

async function getProjectUpdates() {
  const dbPath = workspacePath('project-updates/updates.json')
  return readJsonFile(dbPath, { projects: [] })
}

const router = new Hono()

router.get('/', async (c) => {
  return c.json(await getProjectUpdates())
})

export default router
