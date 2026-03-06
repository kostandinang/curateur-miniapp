import path from 'node:path'
import { describe, it, expect } from 'vitest'
import { loadAllowedSkillIds } from './skill-loader'

const PLUGINS_DIR = path.join(process.cwd(), 'src', 'plugins')

describe('loadAllowedSkillIds', () => {
  it('loads action IDs from real manifests', () => {
    const ids = loadAllowedSkillIds(PLUGINS_DIR)
    expect(ids.size).toBeGreaterThan(0)
    expect(ids.has('new-session')).toBe(true)
    expect(ids.has('reset-session')).toBe(true)
    expect(ids.has('loom-transcript')).toBe(true)
    expect(ids.has('search-memory')).toBe(true)
    expect(ids.has('system-status')).toBe(true)
  })

  it('excludes view plugins', () => {
    const ids = loadAllowedSkillIds(PLUGINS_DIR)
    expect(ids.has('exchange-rate')).toBe(false)
    expect(ids.has('system-monitor')).toBe(false)
  })

  it('excludes connector plugins', () => {
    const ids = loadAllowedSkillIds(PLUGINS_DIR)
    expect(ids.has('mcp-filesystem')).toBe(false)
    expect(ids.has('mcp-github')).toBe(false)
  })

  it('returns empty set for nonexistent directory', () => {
    const ids = loadAllowedSkillIds('/nonexistent/path')
    expect(ids.size).toBe(0)
  })
})
