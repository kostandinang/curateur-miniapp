import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'

/** Scan plugin manifests and return all action-type plugin IDs */
export function loadAllowedSkillIds(pluginsDir: string): Set<string> {
  const ids = new Set<string>()
  try {
    for (const dir of readdirSync(pluginsDir, { withFileTypes: true })) {
      if (!dir.isDirectory()) continue
      const manifestPath = path.join(pluginsDir, dir.name, 'manifest.json')
      try {
        const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
        if (manifest.type === 'action') ids.add(manifest.id)
      } catch { /* skip dirs without valid manifest */ }
    }
  } catch { /* plugins dir not found */ }
  return ids
}
