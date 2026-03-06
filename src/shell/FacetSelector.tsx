import { Settings as SettingsIcon } from 'lucide-react'
import { type ComponentType, Suspense, lazy, useState } from 'react'
import { useNamingPack } from '../hooks/useNamingPack'
import { useSettings } from '../hooks/useSettings'
import { getIcon } from '../lib/icons'
import { views } from '../plugins/registry'
import type { ViewPlugin } from '../plugins/schema'
import Settings from './Settings'
import WidgetErrorBoundary from './WidgetErrorBoundary'

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
        <div className="loader-dots"><span /><span /><span /></div>
      </div>
    )
  }

  const visibleViews = views.filter(v => enabledPlugins.includes(v.id))

  if (showSettings) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowSettings(false)}
          className="chip muted"
          style={{ marginBottom: '16px' }}
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
        <style>{`div::-webkit-scrollbar { display: none; }`}</style>

        <div style={{ display: 'flex', gap: '8px', width: 'max-content', minWidth: '100%' }}>
          {visibleViews.map((plugin) => {
            const Icon = getIcon(plugin.icon)
            const isActive = activeWidget === plugin.id
            return (
              <button
                type="button"
                key={plugin.id}
                onClick={() => setActiveWidget(plugin.id)}
                aria-label={plugin.name}
                aria-pressed={isActive}
                className="chip"
                style={{
                  background: isActive ? plugin.color : 'var(--c-secondary-bg)',
                  color: isActive ? 'white' : 'var(--c-hint)',
                }}
              >
                <Icon size={14} />
                {plugin.name}
              </button>
            )
          })}

          <button
            type="button"
            onClick={() => setShowSettings(true)}
            className="chip muted"
            aria-label="Configure widgets"
          >
            <SettingsIcon size={14} />
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
                <div className="loader-dots"><span /><span /><span /></div>
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
