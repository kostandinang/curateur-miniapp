import { Hono } from 'hono'
import { execSync } from 'node:child_process'

const DEFAULT_SCHEDULES: Record<string, string> = {
  'usd-rate': '0 9 * * *',
  'usd-threshold': '0 * * * *',
  'omad': '30 16 * * *',
  'wellbeing-morning': '0 9 * * *',
  'wellbeing-evening': '0 21 * * *',
  'german': '0 22 * * *',
  'jobs': '0 9 * * 1',
  'projects': '0 17 * * 1-5',
}

function getCrons(): Record<string, string> {
  try {
    const output = execSync('crontab -l', { encoding: 'utf8' })
    const lines = output.split('\n')
    const crons: Record<string, string> = {}

    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed.includes('usd-all-rate.sh')) {
        crons['usd-rate'] = trimmed.split(' ').slice(0, 5).join(' ')
      } else if (trimmed.includes('usd-all-threshold.sh')) {
        crons['usd-threshold'] = trimmed.split(' ').slice(0, 5).join(' ')
      } else if (trimmed.includes('omad-tracker.sh')) {
        crons['omad'] = trimmed.split(' ').slice(0, 5).join(' ')
      } else if (trimmed.includes('wellbeing.sh') && trimmed.includes('morning')) {
        crons['wellbeing-morning'] = trimmed.split(' ').slice(0, 5).join(' ')
      } else if (trimmed.includes('wellbeing.sh') && trimmed.includes('evening')) {
        crons['wellbeing-evening'] = trimmed.split(' ').slice(0, 5).join(' ')
      } else if (trimmed.includes('german-flashcards.sh')) {
        crons['german'] = trimmed.split(' ').slice(0, 5).join(' ')
      } else if (trimmed.includes('job-search.sh') && trimmed.includes('digest')) {
        crons['jobs'] = trimmed.split(' ').slice(0, 5).join(' ')
      } else if (trimmed.includes('project-updates.sh')) {
        crons['projects'] = trimmed.split(' ').slice(0, 5).join(' ')
      }
    }

    // Fill in defaults for missing entries
    return { ...DEFAULT_SCHEDULES, ...crons }
  } catch {
    return DEFAULT_SCHEDULES
  }
}

function updateCrons(schedules: Record<string, string>): boolean {
  try {
    const lines: string[] = []

    if (schedules['usd-rate']) {
      lines.push(`${schedules['usd-rate']} /root/.openclaw/workspace/agents/usd-all-rate.sh`)
    }
    if (schedules['usd-threshold']) {
      lines.push(`${schedules['usd-threshold']} /root/.openclaw/workspace/agents/usd-all-threshold.sh`)
    }
    if (schedules['omad']) {
      lines.push(`${schedules['omad']} /root/.openclaw/workspace/agents/omad-tracker.sh`)
    }
    if (schedules['wellbeing-morning']) {
      lines.push(`${schedules['wellbeing-morning']} /root/.openclaw/workspace/agents/wellbeing.sh morning`)
    }
    if (schedules['wellbeing-evening']) {
      lines.push(`${schedules['wellbeing-evening']} /root/.openclaw/workspace/agents/wellbeing.sh evening`)
    }
    if (schedules['german']) {
      lines.push(`${schedules['german']} /root/.openclaw/workspace/agents/german-flashcards.sh`)
    }
    if (schedules['jobs']) {
      lines.push(`${schedules['jobs']} /root/.openclaw/workspace/agents/job-search.sh digest`)
    }
    if (schedules['projects']) {
      lines.push(`${schedules['projects']} /root/.openclaw/workspace/agents/project-updates.sh`)
    }

    const cronContent = lines.join('\n') + '\n'
    execSync(`echo "${cronContent.replace(/"/g, '\\"')}" | crontab -`)
    return true
  } catch {
    return false
  }
}

const router = new Hono()

router.get('/', (c) => {
  c.header('Cache-Control', 'no-cache, no-store, must-revalidate')
  c.header('Pragma', 'no-cache')
  c.header('Expires', '0')
  return c.json(getCrons())
})

router.post('/', async (c) => {
  c.header('Cache-Control', 'no-cache, no-store, must-revalidate')
  c.header('Pragma', 'no-cache')
  c.header('Expires', '0')
  try {
    const schedules = await c.req.json()
    const success = updateCrons(schedules)
    if (success) {
      return c.json({ success: true, schedules })
    }
    return c.json({ error: 'Failed to update crontab' }, 500)
  } catch {
    return c.json({ error: 'Invalid JSON' }, 400)
  }
})

export default router
