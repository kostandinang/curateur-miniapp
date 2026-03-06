import { Briefcase, Building2, Clock, DollarSign, MapPin, RefreshCw, Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { apiFetch } from '../../lib/api'

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

interface JobStats {
  total?: number
  active?: number
  applied?: number
  berlin?: number
  remoteEU?: number
}

interface JobsApiResponse {
  jobs: Job[]
  stats?: JobStats
}

interface FilterOption {
  id: string
  label: string
}

function JobSearch() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [stats, setStats] = useState<JobStats>({})
  const [filter, setFilter] = useState<string>('all')
  const [loading, setLoading] = useState<boolean>(true)
  const [search, setSearch] = useState<string>('')

  const fetchJobs = async (): Promise<void> => {
    try {
      setLoading(true)

      // Try to fetch from hiring.cafe API
      const res = await apiFetch('/api/jobs')
      if (!res.ok) throw new Error('API not available')
      const data: JobsApiResponse = await res.json()

      if (data.jobs && data.jobs.length > 0) {
        setJobs(data.jobs)
        setStats(data.stats || {})
      } else {
        throw new Error('No jobs found')
      }
    } catch (_err) {
      console.log('Using fallback job data')
      // Fallback to curated list
      setJobs([
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
      ])
      setStats({
        total: 2,
        active: 2,
        applied: 0,
        berlin: 2,
        remoteEU: 1,
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchJobs()
  }, [])

  const filteredJobs: Job[] = jobs
    .filter((job) => {
      if (filter === 'all') return true
      if (filter === 'berlin') return job.location?.includes('Berlin')
      if (filter === 'remote') return job.remote?.includes('Remote')
      if (filter === 'applied') return job.status === 'applied'
      return true
    })
    .filter((job) => {
      if (!search) return true
      return (
        job.title?.toLowerCase().includes(search.toLowerCase()) ||
        job.company?.toLowerCase().includes(search.toLowerCase()) ||
        job.skills?.some((s) => s.toLowerCase().includes(search.toLowerCase()))
      )
    })

  const getDaysAgo = (dateStr: string): string => {
    if (!dateStr) return ''
    const posted = new Date(dateStr)
    const today = new Date()
    const diff: number = Math.floor((today.getTime() - posted.getTime()) / (1000 * 60 * 60 * 24))
    return diff === 0 ? 'Today' : diff === 1 ? 'Yesterday' : `${diff}d ago`
  }

  if (loading) {
    return (
      <div className="empty">
        <Briefcase size={24} className="spinner" />
      </div>
    )
  }

  return (
    <>
      {/* Header */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
          borderRadius: '20px',
          padding: '24px',
          color: 'white',
          marginBottom: '16px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px',
          }}
        >
          <div>
            <div
              style={{
                fontSize: '13px',
                opacity: 0.9,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              Active Jobs
            </div>
            <div style={{ fontSize: '42px', fontWeight: 800, marginTop: '4px' }}>
              {stats.active || filteredJobs.filter((j) => j.status === 'active').length}
            </div>
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
            <Briefcase size={24} />
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            gap: '12px',
            padding: '12px 16px',
            background: 'rgba(255,255,255,0.15)',
            borderRadius: '12px',
          }}
        >
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: '11px', opacity: 0.8 }}>Berlin</div>
            <div style={{ fontSize: '16px', fontWeight: 700 }}>
              {stats.berlin || filteredJobs.filter((j) => j.location?.includes('Berlin')).length}
            </div>
          </div>
          <div
            style={{ flex: 1, textAlign: 'center', borderLeft: '1px solid rgba(255,255,255,0.2)' }}
          >
            <div style={{ fontSize: '11px', opacity: 0.8 }}>Remote EU</div>
            <div style={{ fontSize: '16px', fontWeight: 700 }}>
              {stats.remoteEU || filteredJobs.filter((j) => j.remote?.includes('Remote')).length}
            </div>
          </div>
          <div
            style={{ flex: 1, textAlign: 'center', borderLeft: '1px solid rgba(255,255,255,0.2)' }}
          >
            <div style={{ fontSize: '11px', opacity: 0.8 }}>Applied</div>
            <div style={{ fontSize: '16px', fontWeight: 700 }}>
              {stats.applied || filteredJobs.filter((j) => j.status === 'applied').length}
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="input-group" style={{ marginBottom: '12px' }}>
        <Search size={18} style={{ color: 'var(--c-hint)' }} />
        <input
          type="text"
          placeholder="Search jobs, companies, skills..."
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

      {/* Filters */}
      <div
        style={{
          display: 'flex',
          gap: '6px',
          marginBottom: '16px',
          overflowX: 'auto',
          padding: '4px 0',
        }}
      >
        {(
          [
            { id: 'all', label: 'All' },
            { id: 'berlin', label: 'Berlin' },
            { id: 'remote', label: 'Remote' },
            { id: 'applied', label: 'Applied' },
          ] as FilterOption[]
        ).map((f) => (
          <button
            type="button"
            key={f.id}
            onClick={() => setFilter(f.id)}
            style={{
              padding: '8px 14px',
              border: 'none',
              borderRadius: '8px',
              background: filter === f.id ? '#0ea5e9' : 'var(--c-secondary-bg)',
              color: filter === f.id ? 'white' : 'var(--c-hint)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Job Listings */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {filteredJobs.map((job) => (
          <a
            key={job.id}
            href={job.url}
            target="_blank"
            rel="noopener noreferrer"
            className="card"
            style={{
              marginBottom: 0,
              borderLeft: job.status === 'applied' ? '3px solid #22c759' : 'none',
              textDecoration: 'none',
              color: 'inherit',
              display: 'block',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: 'var(--c-secondary-bg)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '16px',
                    fontWeight: 700,
                    color: 'var(--c-accent)',
                  }}
                >
                  {job.company?.[0]}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--c-text)' }}>
                    {job.company}
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--c-hint)' }}>{job.title}</div>
                </div>
              </div>

              <div
                style={{
                  padding: '4px 8px',
                  borderRadius: '6px',
                  background:
                    job.status === 'applied' ? 'rgba(34, 199, 89, 0.1)' : 'var(--c-secondary-bg)',
                  color: job.status === 'applied' ? '#22c759' : 'var(--c-hint)',
                  fontSize: '11px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                }}
              >
                {job.status}
              </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '12px',
                  color: 'var(--c-hint)',
                }}
              >
                <MapPin size={12} />
                {job.location} · {job.remote}
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '12px',
                  color: '#16a34a',
                  fontWeight: 600,
                }}
              >
                <DollarSign size={12} />
                {job.salary}
              </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '10px' }}>
              {job.skills?.slice(0, 4).map((skill) => (
                <span
                  key={skill}
                  style={{
                    padding: '3px 8px',
                    background: 'var(--c-secondary-bg)',
                    borderRadius: '4px',
                    fontSize: '11px',
                    color: 'var(--c-hint)',
                  }}
                >
                  {skill}
                </span>
              ))}
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingTop: '10px',
                borderTop: '1px solid var(--c-secondary-bg)',
              }}
            >
              <div style={{ fontSize: '12px', color: 'var(--c-hint)' }}>
                <Clock size={12} style={{ display: 'inline', marginRight: '4px' }} />
                {getDaysAgo(job.posted)}
              </div>

              {job.source && (
                <div
                  style={{
                    fontSize: '11px',
                    color: '#0ea5e9',
                    background: 'rgba(14, 165, 233, 0.1)',
                    padding: '3px 8px',
                    borderRadius: '4px',
                  }}
                >
                  {job.source}
                </div>
              )}
            </div>
          </a>
        ))}
      </div>

      {filteredJobs.length === 0 && (
        <div className="empty">
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>🔍</div>
          <div>No jobs found</div>
        </div>
      )}

      <button
        type="button"
        onClick={fetchJobs}
        disabled={loading}
        className="btn btn-secondary"
        style={{ marginTop: '16px' }}
      >
        <RefreshCw
          size={16}
          style={{ marginRight: '8px', animation: loading ? 'spin 1s linear infinite' : 'none' }}
        />
        Refresh Jobs
      </button>

      {/* Info */}
      <div className="card" style={{ marginTop: '16px', fontSize: '13px', color: 'var(--c-hint)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <Building2 size={14} />
          <span>Full Stack Engineer · Node.js · React</span>
        </div>
        <div>Berlin + Remote EU · hiring.cafe</div>
      </div>
    </>
  )
}

export default JobSearch
