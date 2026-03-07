import { useCallback, useEffect, useState } from 'react'
import { apiFetch } from '../lib/api'
import { views } from '../plugins/registry'

const STORAGE_KEY = 'curateur-widgets-enabled'

async function syncToServer(views: string[]) {
  try {
    const res = await apiFetch('/api/config')
    const config = await res.json()
    await apiFetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...config, plugins: { ...config.plugins, views } })
    })
  } catch {
    // Server sync failed, localStorage still has it
  }
}

export function useSettings() {
  const [enabledPlugins, setEnabledPlugins] = useState<string[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    // Try server config first
    apiFetch('/api/config')
      .then(r => r.json())
      .then(config => {
        if (config.plugins?.views?.length) {
          setEnabledPlugins(config.plugins.views)
        } else {
          loadFromLocalStorage()
        }
        setLoaded(true)
      })
      .catch(() => {
        loadFromLocalStorage()
        setLoaded(true)
      })
  }, [])

  function loadFromLocalStorage() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        setEnabledPlugins(JSON.parse(saved))
      } else {
        setEnabledPlugins(views.filter(v => v.widget.defaultEnabled).map(v => v.id))
      }
    } catch {
      setEnabledPlugins(views.filter(v => v.widget.defaultEnabled).map(v => v.id))
    }
  }

  const toggle = useCallback(async (id: string) => {
    setEnabledPlugins(prev => {
      const next = prev.includes(id)
        ? prev.filter(p => p !== id)
        : [...prev, id]
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      // Sync to server
      syncToServer(next).catch(() => {})
      return next
    })
  }, [])

  const reset = useCallback(async () => {
    const defaults = views.filter(v => v.widget.defaultEnabled).map(v => v.id)
    setEnabledPlugins(defaults)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults))
    // Sync to server
    syncToServer(defaults).catch(() => {})
  }, [])

  const isEnabled = useCallback((id: string) => enabledPlugins.includes(id), [enabledPlugins])

  return { enabledPlugins, loaded, toggle, reset, isEnabled }
}
