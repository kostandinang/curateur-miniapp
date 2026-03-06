import { useCallback, useEffect, useState } from 'react'
import { views } from '../plugins/registry'

const STORAGE_KEY = 'curateur-widgets-enabled'

export function useSettings() {
  const [enabledPlugins, setEnabledPlugins] = useState<string[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    // Try server config first
    fetch('/api/config')
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

  const toggle = useCallback((id: string) => {
    setEnabledPlugins(prev => {
      const next = prev.includes(id)
        ? prev.filter(p => p !== id)
        : [...prev, id]
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const reset = useCallback(() => {
    const defaults = views.filter(v => v.widget.defaultEnabled).map(v => v.id)
    setEnabledPlugins(defaults)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults))
  }, [])

  const isEnabled = useCallback((id: string) => enabledPlugins.includes(id), [enabledPlugins])

  return { enabledPlugins, loaded, toggle, reset, isEnabled }
}
