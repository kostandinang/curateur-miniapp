export interface NamingPack {
  id: number
  theme: string
  view: string
  action: string
  connector: string
}

export const NAMING_PACKS: NamingPack[] = [
  { id: 0, theme: 'Default', view: 'Facets', action: 'Hooks', connector: 'Taps' },
  { id: 1, theme: 'Sci-Fi', view: 'Scanners', action: 'Protocols', connector: 'Relays' },
  { id: 2, theme: 'Military', view: 'Recon', action: 'Ops', connector: 'Comms' },
  { id: 3, theme: 'Nautical', view: 'Scopes', action: 'Helms', connector: 'Moorings' },
  { id: 4, theme: 'Cyberpunk', view: 'Feeds', action: 'Jacks', connector: 'Uplinks' },
  { id: 5, theme: 'Arcane', view: 'Runes', action: 'Spells', connector: 'Portals' },
  { id: 6, theme: 'Mechanical', view: 'Gauges', action: 'Levers', connector: 'Gears' },
  { id: 7, theme: 'Biological', view: 'Cortexes', action: 'Reflexes', connector: 'Synapses' },
  { id: 8, theme: 'Musical', view: 'Tracks', action: 'Beats', connector: 'Channels' },
  { id: 9, theme: 'Culinary', view: 'Plates', action: 'Recipes', connector: 'Spices' },
  { id: 10, theme: 'Botanical', view: 'Blooms', action: 'Roots', connector: 'Vines' },
]

export const DEFAULT_PACK = NAMING_PACKS[0]

export function getNamingPack(id: number): NamingPack {
  return NAMING_PACKS.find(p => p.id === id) || DEFAULT_PACK
}
