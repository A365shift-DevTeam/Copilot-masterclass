import './morph-loading.css'

const SIZES = {
  sm: 'morph-loading--sm',
  md: 'morph-loading--md',
  lg: 'morph-loading--lg',
}

/**
 * Four cells morphing around a common centre.
 *
 * The drop-in this came from is a shadcn/Tailwind component with a `variant`
 * prop whose only value was "morph"; with a single variant that switch is dead
 * weight, so it is dropped and the class name says what it is. `cn()` is a
 * clsx wrapper that does not exist here, and there is nothing to merge, so
 * className is appended directly.
 */
export default function MorphLoading({ size = 'md', className = '' }) {
  return (
    <div className={`morph-loading ${SIZES[size] || SIZES.md} ${className}`.trim()} aria-hidden="true">
      <div className="morph-loading__field">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="morph-loading__cell"
            style={{
              animation: `morph-${i} 2s infinite ease-in-out`,
              animationDelay: `${i * 0.2}s`,
            }}
          />
        ))}
      </div>
    </div>
  )
}
