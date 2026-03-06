import { useCallback } from 'react'
import { getPlugin } from '../plugins/registry'
import { apiFetch } from '../lib/api'
import type { PluginManifest } from '../plugins/schema'

export function usePlugin(pluginId: string) {
  const plugin = getPlugin(pluginId)

  const pluginFetch = useCallback(
    (path = '', init?: RequestInit) => {
      if (!plugin || plugin.type !== 'view' || !plugin.api?.prefix) {
        throw new Error(`Plugin ${pluginId} has no API prefix`)
      }
      return apiFetch(`${plugin.api.prefix}${path}`, init)
    },
    [plugin, pluginId]
  )

  return {
    manifest: plugin as PluginManifest,
    fetch: pluginFetch,
  }
}
