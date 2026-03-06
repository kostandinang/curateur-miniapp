import * as LucideIcons from 'lucide-react'
import { type ComponentType, Suspense, lazy, useState } from 'react'
import { useNamingPack } from '../hooks/useNamingPack'
import { useSettings } from '../hooks/useSettings'
import { views } from '../plugins/registry'
import type { ViewPlugin } from '../plugins/schema'
import Settings from './Settings'
import WidgetErrorBoundary from './WidgetErrorBoundary'

function getIcon(iconName: string) {
  return (LucideIcons as unknown as Record<string, LucideIcons.LucideIcon>)[iconName] || LucideIcons.Box
}

const widgetCache = new Map<string, ComponentType>()
function getWidgetComponent(plugin: ViewPlugin): ComponentType {
  if (!widgetCache.has(plugin.id)) {
    const component = lazy(() => import(`../plugins/${plugin.id}/widget.tsx`))
    widgetCache.set(plugin.id, component)
  }
  return widgetCache.get(plugin.id)!
}

interface FacetSelectorProps {
  activeWidget: string
  setActiveWidget: (id: string) => void
}

function FacetSelector({ activeWidget, setActiveWidget }: FacetSelectorProps) {
  const { enabledPlugins, loaded, toggle, reset, isEnabled } = useSettings()
  const { pack, setPack } = useNamingPack()
  const [showSettings, setShowSettings] = useState<boolean>(false)

  if (!loaded) {
    return (
      <div className="empty">
        <div className="spinner">Loading...</div>
      </div>
    )
  }

  // Filter views based on enabled list
  const visibleViews = views.filter(v => enabledPlugins.includes(v.id))

  // Show settings view
  if (showSettings) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowSettings(false)}
          style={{
            padding: '10px 16px',
            border: 'none',
            borderRadius: '10px',
            background: 'var(--c-secondary-bg)',
            color: 'var(--c-text)',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            marginBottom: '16px',
          }}
        >
          &larr; Back to Widgets
        </button>
        <Settings
          views={views}
          isEnabled={isEnabled}
          onToggle={toggle}
          onReset={reset}
          currentPack={pack}
          onPackChange={setPack}
        />
      </>
    )
  }

  // Find active widget component
  const activeView = views.find(v => v.id === activeWidget)
  const ActiveComponent = activeView ? getWidgetComponent(activeView) : null

  return (
    <>
      {/* Widget Selector - Horizontal Scroll */}
      <div
        style={{
          marginBottom: '16px',
          marginLeft: '-16px',
          marginRight: '-16px',
          padding: '4px 16px',
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        <style>{`
          div::-webkit-scrollbar {
            display: none;
          }
        `}</style>

        <div
          style={{
            display: 'flex',
            gap: '8px',
            width: 'max-content',
            minWidth: '100%',
          }}
        >
          {visibleViews.map((plugin) => {
            const Icon = getIcon(plugin.icon)
            const isActive = activeWidget === plugin.id
            return (
              <button
                type="button"
                key={plugin.id}
                onClick={() => setActiveWidget(plugin.id)}
                style={{
                  padding: '10px 16px',
                  border: 'none',
                  borderRadius: '10px',
                  background: isActive ? plugin.color : 'var(--c-secondary-bg)',
                  color: isActive ? 'white' : 'var(--c-hint)',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'all 0.2s',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                <Icon size={14} />
                {plugin.name}
              </button>
            )
          })}

          {/* Settings Button */}
          <button
            type="button"
            onClick={() => setShowSettings(true)}
            style={{
              padding: '10px 16px',
              border: 'none',
              borderRadius: '10px',
              background: 'var(--c-secondary-bg)',
              color: 'var(--c-hint)',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            <LucideIcons.Settings size={14} />
            Configure
          </button>
        </div>
      </div>

      {/* Active Widget */}
      {ActiveComponent && (
        <WidgetErrorBoundary widgetName={activeView?.name}>
          <Suspense
            fallback={
              <div className="empty">
                <div className="spinner">Loading...</div>
              </div>
            }
          >
            <ActiveComponent />
          </Suspense>
        </WidgetErrorBoundary>
      )}
    </>
  )
}

export default FacetSelector
