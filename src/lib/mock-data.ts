/** Fallback data used when API calls fail in development / offline mode */

export const MOCK_JOBS = [
  {
    id: 'job-001',
    company: 'N26',
    title: 'Senior Full Stack Engineer',
    location: 'Berlin, Germany',
    remote: 'Hybrid',
    salary: '€85,000 - €110,000',
    skills: ['Node.js', 'React', 'TypeScript'],
    url: 'https://n26.com/careers',
    posted: '2026-03-04',
    status: 'active',
    source: 'hiring.cafe',
  },
  {
    id: 'job-002',
    company: 'Contentful',
    title: 'Staff Full Stack Engineer',
    location: 'Berlin, Germany',
    remote: 'Remote EU',
    salary: '€95,000 - €130,000',
    skills: ['Node.js', 'React', 'GraphQL'],
    url: 'https://contentful.com/careers',
    posted: '2026-03-03',
    status: 'active',
    source: 'hiring.cafe',
  },
]

export const MOCK_JOB_STATS = {
  total: 2,
  active: 2,
  applied: 0,
  berlin: 2,
  remoteEU: 1,
}

export const MOCK_VOICE_NOTE = {
  id: 'voice_2026-03-04.mp3',
  filename: 'voice_2026-03-04.mp3',
  timestamp: new Date().toISOString(),
  duration: '0:45',
  transcript: 'Demo voice note.',
}
