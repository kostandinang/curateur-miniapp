import type { PluginManifest, ViewPlugin, ActionPlugin, ConnectorPlugin } from './schema'

import exchangeRate from './exchange-rate/manifest.json'
import systemMonitor from './system-monitor/manifest.json'
import cronManager from './cron-manager/manifest.json'
import omadTracker from './omad-tracker/manifest.json'
import costHeatmap from './cost-heatmap/manifest.json'
import voiceNotes from './voice-notes/manifest.json'
import voiceToText from './voice-to-text/manifest.json'
import jobSearch from './job-search/manifest.json'
import flashcards from './flashcards/manifest.json'
import wellbeing from './wellbeing/manifest.json'
import projectUpdates from './project-updates/manifest.json'
import sessionStatus from './session-status/manifest.json'
import loomTranscript from './loom-transcript/manifest.json'
import searchMemory from './search-memory/manifest.json'
import systemStatus from './system-status/manifest.json'
import newSession from './new-session/manifest.json'
import resetSession from './reset-session/manifest.json'
import mcpFilesystem from './mcp-filesystem/manifest.json'
import mcpGithub from './mcp-github/manifest.json'
import mcpGit from './mcp-git/manifest.json'
import mcpPostgres from './mcp-postgres/manifest.json'
import mcpFetch from './mcp-fetch/manifest.json'
import mcpSlack from './mcp-slack/manifest.json'
import mcpBraveSearch from './mcp-brave-search/manifest.json'
import mcpPuppeteer from './mcp-puppeteer/manifest.json'

export const plugins: PluginManifest[] = [
  exchangeRate, systemMonitor, cronManager, omadTracker, costHeatmap,
  voiceNotes, voiceToText, jobSearch, flashcards, wellbeing,
  projectUpdates, sessionStatus,
  loomTranscript, searchMemory, systemStatus, newSession, resetSession,
  mcpFilesystem, mcpGithub, mcpGit, mcpPostgres, mcpFetch,
  mcpSlack, mcpBraveSearch, mcpPuppeteer,
] as PluginManifest[]

export const views = plugins.filter((p): p is ViewPlugin => p.type === 'view')
export const actions = plugins.filter((p): p is ActionPlugin => p.type === 'action')
export const connectors = plugins.filter((p): p is ConnectorPlugin => p.type === 'connector')

export function getPlugin(id: string): PluginManifest | undefined {
  return plugins.find(p => p.id === id)
}
