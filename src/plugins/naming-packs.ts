export interface NamingPack {
  id: number
  theme: string
  emoji: string
  tagline: string
  accent: string
  gradient: string
  view: string
  action: string
  connector: string
}

export const NAMING_PACKS: NamingPack[] = [
  { id: 0,  theme: 'Default',    emoji: '🦞', tagline: 'Your friendly digital companion',    accent: '#667eea', gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',              view: 'Facets',   action: 'Hooks',     connector: 'Taps' },
  { id: 1,  theme: 'Sci-Fi',     emoji: '🛸', tagline: 'Navigating the cosmos',              accent: '#06b6d4', gradient: 'linear-gradient(135deg, #06b6d4 0%, #0284c7 50%, #1e40af 100%)', view: 'Scanners', action: 'Protocols', connector: 'Relays' },
  { id: 2,  theme: 'Military',   emoji: '🎖️', tagline: 'Mission control, standing by',       accent: '#65a30d', gradient: 'linear-gradient(135deg, #4d7c0f 0%, #365314 50%, #1a2e05 100%)', view: 'Recon',    action: 'Ops',       connector: 'Comms' },
  { id: 3,  theme: 'Nautical',   emoji: '⚓', tagline: 'Charting the waters ahead',           accent: '#0891b2', gradient: 'linear-gradient(135deg, #0891b2 0%, #155e75 50%, #164e63 100%)', view: 'Scopes',   action: 'Helms',     connector: 'Moorings' },
  { id: 4,  theme: 'Cyberpunk',  emoji: '⚡', tagline: 'Jacked into the grid',                accent: '#f43f5e', gradient: 'linear-gradient(135deg, #f43f5e 0%, #e11d48 50%, #9f1239 100%)', view: 'Feeds',    action: 'Jacks',     connector: 'Uplinks' },
  { id: 5,  theme: 'Arcane',     emoji: '🔮', tagline: 'The ancient scrolls await',           accent: '#8b5cf6', gradient: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 50%, #4c1d95 100%)', view: 'Runes',    action: 'Spells',    connector: 'Portals' },
  { id: 6,  theme: 'Mechanical', emoji: '⚙️', tagline: 'Gears turning, systems nominal',     accent: '#ea580c', gradient: 'linear-gradient(135deg, #ea580c 0%, #c2410c 50%, #9a3412 100%)', view: 'Gauges',   action: 'Levers',    connector: 'Gears' },
  { id: 7,  theme: 'Biological', emoji: '🧬', tagline: 'Synapses firing, all systems alive',  accent: '#16a34a', gradient: 'linear-gradient(135deg, #16a34a 0%, #15803d 50%, #14532d 100%)', view: 'Cortexes', action: 'Reflexes',  connector: 'Synapses' },
  { id: 8,  theme: 'Musical',    emoji: '🎵', tagline: 'Drop the beat, hit the flow',         accent: '#e11d48', gradient: 'linear-gradient(135deg, #e11d48 0%, #be123c 50%, #881337 100%)', view: 'Tracks',   action: 'Beats',     connector: 'Channels' },
  { id: 9,  theme: 'Culinary',   emoji: '🍳', tagline: 'Cooking up something fresh',          accent: '#d97706', gradient: 'linear-gradient(135deg, #d97706 0%, #b45309 50%, #92400e 100%)', view: 'Plates',   action: 'Recipes',   connector: 'Spices' },
  { id: 10, theme: 'Botanical',  emoji: '🌿', tagline: 'Growing in every direction',          accent: '#059669', gradient: 'linear-gradient(135deg, #059669 0%, #047857 50%, #064e3b 100%)', view: 'Blooms',   action: 'Roots',     connector: 'Vines' },
]

export const DEFAULT_PACK = NAMING_PACKS[0]

export function getNamingPack(id: number): NamingPack {
  return NAMING_PACKS.find(p => p.id === id) || DEFAULT_PACK
}
