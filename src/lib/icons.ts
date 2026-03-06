import { Box } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import * as LucideIcons from 'lucide-react'

/**
 * Resolve a Lucide icon by name string (from plugin manifests).
 * Falls back to Box icon if the name is not found.
 */
export function getIcon(iconName: string): LucideIcon {
  return (LucideIcons as unknown as Record<string, LucideIcon>)[iconName] || Box
}
