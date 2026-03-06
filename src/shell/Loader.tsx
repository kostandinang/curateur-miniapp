/**
 * Theme-aware loading indicators.
 *
 * <Loader />          — 3-dot pulse (widget/page loading)
 * <Loader size="lg" /> — larger dots
 * <Loader variant="arc" /> — spinning arc (inline/button)
 * <Loader variant="arc" white /> — white arc for colored backgrounds
 */

interface LoaderProps {
  variant?: 'dots' | 'arc'
  size?: 'sm' | 'md' | 'lg'
  white?: boolean
  label?: string
}

function Loader({ variant = 'dots', size = 'md', white = false, label }: LoaderProps) {
  if (variant === 'arc') {
    const classes = [
      'loader-arc',
      size === 'sm' && 'loader-arc-sm',
      white && 'loader-arc-white',
    ].filter(Boolean).join(' ')

    return <div className={classes} />
  }

  const dotClass = white ? 'loader-dot loader-dot-white' : 'loader-dot'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
      <div className={`loader ${size === 'lg' ? 'loader-lg' : ''}`}>
        <div className={dotClass} />
        <div className={dotClass} />
        <div className={dotClass} />
      </div>
      {label && (
        <div style={{ fontSize: '13px', color: white ? 'rgba(255,255,255,0.7)' : 'var(--c-hint)', fontWeight: 500 }}>
          {label}
        </div>
      )}
    </div>
  )
}

export default Loader
