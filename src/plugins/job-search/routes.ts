import { Hono } from 'hono'
import path from 'node:path'
import { WORKSPACE_DIR, fileExists, readJsonFile } from '../../../api/lib/workspace'

interface Job {
  id: string
  company: string
  title: string
  location: string
  remote: string
  salary: string
  skills: string[]
  url: string
  posted: string
  status: string
  source: string
}

interface JobResponse {
  jobs: Job[]
  stats: { total: number; active: number; applied: number; berlin: number; remoteEU: number }
}

function getDefaultJobs(): JobResponse {
  return {
    jobs: [
      {
        id: 'hc-001',
        company: 'N26',
        title: 'Senior Full Stack Engineer',
        location: 'Berlin, Germany',
        remote: 'Hybrid (3 days office)',
        salary: '\u20AC85,000 - \u20AC110,000',
        skills: ['Node.js', 'React', 'TypeScript', 'PostgreSQL', 'AWS'],
        url: 'https://n26.com/careers',
        posted: new Date(Date.now() - 86400000).toISOString().split('T')[0],
        status: 'active',
        source: 'job-agent',
      },
      {
        id: 'hc-002',
        company: 'Contentful',
        title: 'Staff Full Stack Engineer',
        location: 'Berlin, Germany',
        remote: 'Remote EU',
        salary: '\u20AC95,000 - \u20AC130,000',
        skills: ['Node.js', 'React', 'GraphQL', 'TypeScript', 'AWS'],
        url: 'https://contentful.com/careers',
        posted: new Date(Date.now() - 172800000).toISOString().split('T')[0],
        status: 'active',
        source: 'job-agent',
      },
      {
        id: 'hc-003',
        company: 'Stripe',
        title: 'Senior Software Engineer',
        location: 'Remote EU',
        remote: 'Fully Remote',
        salary: '\u20AC100,000 - \u20AC140,000',
        skills: ['Ruby', 'Node.js', 'React', 'TypeScript', 'AWS'],
        url: 'https://stripe.com/jobs',
        posted: new Date(Date.now() - 259200000).toISOString().split('T')[0],
        status: 'active',
        source: 'job-agent',
      },
    ],
    stats: {
      total: 3,
      active: 3,
      applied: 0,
      berlin: 2,
      remoteEU: 2,
    },
  }
}

async function getJobs(): Promise<JobResponse> {
  const jobsDbPath = path.join(WORKSPACE_DIR, 'job-search', 'jobs.json')

  try {
    if (fileExists(jobsDbPath)) {
      const rawData = await readJsonFile<{ jobs?: Job[]; stats?: JobResponse['stats'] }>(jobsDbPath, { jobs: [] })
      if (rawData.jobs && rawData.jobs.length > 0) {
        const jobs = rawData.jobs
        const stats = rawData.stats || {
          total: jobs.length,
          active: jobs.filter((j: Job) => j.status === 'active').length,
          applied: jobs.filter((j: Job) => j.status === 'applied').length,
          berlin: jobs.filter((j: Job) => j.location?.includes('Berlin')).length,
          remoteEU: jobs.filter((j: Job) => j.remote?.includes('Remote')).length,
        }
        return { jobs, stats }
      }
    }
  } catch {}

  return getDefaultJobs()
}

const router = new Hono()

router.get('/', async (c) => {
  return c.json(await getJobs())
})

export default router
