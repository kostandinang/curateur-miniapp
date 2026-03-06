import { useEffect, useState } from 'react'
import { apiFetch } from '../lib/api'
import { getNamingPack, type NamingPack } from '../plugins/naming-packs'

const STORAGE_KEY = 'curateur-naming-pack'

export function useNamingPack(): { pack: NamingPack; setPack: (id: number) => void } {
  const [pack, setPackState] = useState<NamingPack>(getNamingPack(0))

  useEffect(() => {
    apiFetch('/api/config')
      .then(r => r.json())
      .then(config => {
        if (config.namingPack !== undefined) {
          setPackState(getNamingPack(config.namingPack))
        }
      })
      .catch(() => {
        try {
          const saved = localStorage.getItem(STORAGE_KEY)
          if (saved) setPackState(getNamingPack(parseInt(saved, 10)))
        } catch { /* ignore */ }
      })
  }, [])

  const setPack = (id: number) => {
    const previous = pack
    // Optimistic update
    setPackState(getNamingPack(id))
    localStorage.setItem(STORAGE_KEY, String(id))

    // Persist to server — revert on failure
    apiFetch('/api/config')
      .then(r => r.json())
      .then(config =>
        apiFetch('/api/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...config, namingPack: id }),
        })
      )
      .catch((err) => {
        console.error('Failed to save naming pack:', err)
        setPackState(previous)
        localStorage.setItem(STORAGE_KEY, String(previous.id))
      })
  }

  return { pack, setPack }
}
