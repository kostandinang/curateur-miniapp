import { useState } from 'react'
import { getNamingPack, type NamingPack } from '../plugins/naming-packs'

const STORAGE_KEY = 'curateur-naming-pack'

export function useNamingPack(): NamingPack {
  const [pack] = useState<NamingPack>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) return getNamingPack(parseInt(saved, 10))
    } catch { /* use default */ }
    return getNamingPack(0)
  })

  return pack
}
