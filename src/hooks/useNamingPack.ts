import { useEffect, useState } from 'react'
import { getNamingPack, type NamingPack } from '../plugins/naming-packs'

const STORAGE_KEY = 'curateur-naming-pack'

export function useNamingPack(): { pack: NamingPack; setPack: (id: number) => void } {
  const [pack, setPackState] = useState<NamingPack>(getNamingPack(0))

  useEffect(() => {
    // Try server config first
    fetch('/api/config')
      .then(r => r.json())
      .then(config => {
        if (config.namingPack !== undefined) {
          setPackState(getNamingPack(config.namingPack))
        }
      })
      .catch(() => {
        // Fall back to localStorage
        try {
          const saved = localStorage.getItem(STORAGE_KEY)
          if (saved) setPackState(getNamingPack(parseInt(saved, 10)))
        } catch { /* ignore */ }
      })
  }, [])

  const setPack = (id: number) => {
    setPackState(getNamingPack(id))
    localStorage.setItem(STORAGE_KEY, String(id))
    // Also persist to server
    fetch('/api/config')
      .then(r => r.json())
      .then(config => {
        fetch('/api/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...config, namingPack: id }),
        }).catch(() => {})
      })
      .catch(() => {})
  }

  return { pack, setPack }
}
