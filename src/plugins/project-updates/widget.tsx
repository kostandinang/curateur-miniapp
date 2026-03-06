import { ChevronDown, ChevronUp, FolderKanban, Play, Video } from 'lucide-react'
import { useEffect, useState } from 'react'
import { apiFetch } from '../../lib/api'

interface LoomData {
  title: string
  duration: string
  transcript?: string
}

interface ProjectUpdate {
  id?: string | number
  date: string
  text: string
  loom?: LoomData
}

interface Project {
  id: string | number
  name: string
  color: string
  updates?: ProjectUpdate[]
}

interface ProjectsApiResponse {
  projects: Project[]
}

function ProjectUpdates() {
  const [projects, setProjects] = useState<Project[]>([])
  const [expandedProject, setExpandedProject] = useState<string | number | null>(null)
  const [loading, setLoading] = useState<boolean>(true)

  const fetchData = async (): Promise<void> => {
    try {
      setLoading(true)
      const res = await apiFetch('/api/projects')
      if (!res.ok) throw new Error('Failed to fetch')
      const data: ProjectsApiResponse = await res.json()
      setProjects(data.projects || [])
      if (data.projects?.length > 0) {
        setExpandedProject(data.projects[0].id)
      }
    } catch (err) {
      console.error('Error fetching projects:', err)
      // Fallback mock data
      setProjects([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const toggleProject = (id: string | number): void => {
    setExpandedProject(expandedProject === id ? null : id)
  }

  const formatDate = (dateStr: string): string => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (dateStr === today.toISOString().split('T')[0]) return 'Today'
    if (dateStr === yesterday.toISOString().split('T')[0]) return 'Yesterday'
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const totalUpdates: number = projects.reduce((acc, p) => acc + (p.updates?.length || 0), 0)
  const totalLooms: number = projects.reduce(
    (acc, p) => acc + (p.updates?.filter((u) => u.loom)?.length || 0),
    0,
  )
  const today: string = new Date().toISOString().split('T')[0]
  const todayUpdates: number = projects.reduce(
    (acc, p) => acc + (p.updates?.filter((u) => u.date === today)?.length || 0),
    0,
  )

  if (loading) {
    return (
      <div className="empty">
        <FolderKanban size={24} className="spinner" />
      </div>
    )
  }

  return (
    <>
      {/* Header */}
      <div
        style={{
          background: 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)',
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
              Project Updates
            </div>
            <div style={{ fontSize: '42px', fontWeight: 800, marginTop: '4px' }}>
              {totalUpdates}
            </div>
            <div style={{ fontSize: '15px', opacity: 0.9 }}>updates tracked</div>
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
            <FolderKanban size={24} />
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
            <div style={{ fontSize: '20px', fontWeight: 700 }}>{todayUpdates}</div>
            <div style={{ fontSize: '11px', opacity: 0.8 }}>Today</div>
          </div>
          <div
            style={{ flex: 1, textAlign: 'center', borderLeft: '1px solid rgba(255,255,255,0.2)' }}
          >
            <div style={{ fontSize: '20px', fontWeight: 700 }}>{totalLooms}</div>
            <div style={{ fontSize: '11px', opacity: 0.8 }}>Videos</div>
          </div>
          <div
            style={{ flex: 1, textAlign: 'center', borderLeft: '1px solid rgba(255,255,255,0.2)' }}
          >
            <div style={{ fontSize: '20px', fontWeight: 700 }}>{projects.length}</div>
            <div style={{ fontSize: '11px', opacity: 0.8 }}>Projects</div>
          </div>
        </div>
      </div>

      {/* Projects List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {projects.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>📁</div>
            <div style={{ color: 'var(--c-hint)' }}>No projects yet. Add your first project!</div>
          </div>
        ) : (
          projects.map((project) => {
            const isExpanded: boolean = expandedProject === project.id

            return (
              <div
                key={project.id}
                className="card"
                style={{ marginBottom: 0, padding: '0', overflow: 'hidden' }}
              >
                <button
                  type="button"
                  tabIndex={0}
                  onClick={() => toggleProject(project.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      toggleProject(project.id)
                    }
                  }}
                  style={{
                    padding: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    cursor: 'pointer',
                    background: isExpanded ? `${project.color}08` : 'transparent',
                    border: 'none',
                    width: '100%',
                    textAlign: 'inherit',
                    color: 'inherit',
                    font: 'inherit',
                  }}
                >
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '10px',
                      background: `${project.color}20`,
                      color: project.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <FolderKanban size={20} />
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--c-text)' }}>
                      {project.name}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--c-hint)' }}>
                      {project.updates?.length || 0} updates
                    </div>
                  </div>

                  <div
                    style={{
                      transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s',
                      color: 'var(--c-hint)',
                    }}
                  >
                    {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </div>
                </button>

                {isExpanded && project.updates?.length && project.updates.length > 0 && (
                  <div style={{ padding: '0 16px 16px' }}>
                    {project.updates.map((update, idx) => (
                      <div
                        key={update.id || idx}
                        style={{
                          padding: '14px',
                          background: idx === 0 ? `${project.color}08` : 'var(--c-bg)',
                          borderRadius: '12px',
                          marginBottom: '8px',
                          borderLeft: `3px solid ${project.color}`,
                        }}
                      >
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                          <span
                            style={{
                              padding: '4px 8px',
                              background: `${project.color}15`,
                              color: project.color,
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: 600,
                            }}
                          >
                            {formatDate(update.date)}
                          </span>

                          {update.loom && (
                            <span
                              style={{
                                padding: '4px 8px',
                                background: '#ec489915',
                                color: '#ec4899',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              <Video size={12} />
                              {update.loom.duration}
                            </span>
                          )}
                        </div>

                        <div
                          style={{ fontSize: '14px', color: 'var(--c-text)', lineHeight: '1.5' }}
                        >
                          {update.text}
                        </div>

                        {update.loom?.transcript && (
                          <div
                            style={{
                              marginTop: '12px',
                              padding: '12px',
                              background: 'var(--c-secondary-bg)',
                              borderRadius: '10px',
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                marginBottom: '8px',
                              }}
                            >
                              <div
                                style={{
                                  width: '32px',
                                  height: '32px',
                                  borderRadius: '8px',
                                  background: '#ec4899',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: 'white',
                                }}
                              >
                                <Play size={16} />
                              </div>
                              <div style={{ fontSize: '13px', fontWeight: 600 }}>
                                {update.loom.title}
                              </div>
                            </div>

                            <div
                              style={{
                                fontSize: '13px',
                                color: 'var(--c-text)',
                                fontStyle: 'italic',
                                lineHeight: '1.5',
                              }}
                            >
                              "{update.loom.transcript}"
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </>
  )
}

export default ProjectUpdates
