import './CompactReferenceBar.css'
import CircleXmarkIcon from './CircleXmarkIcon'
import type { JsonItemSnapshot } from './jsonCompactModels'

type CompactReferenceBarProps = {
  isVisible: boolean
  items: JsonItemSnapshot[]
  onEditableValueChange?: (itemId: string, nextValue: string) => void
  onVisibilityToggle?: (label: string) => void
}

function CompactReferenceBar({
  isVisible,
  items,
  onEditableValueChange,
  onVisibilityToggle,
}: CompactReferenceBarProps) {
  if (items.length === 0) {
    return null
  }

  return (
    <div
      className={`compact-reference ${isVisible ? 'compact-reference--visible' : ''}`}
      aria-hidden={!isVisible}
    >
      <div className="compact-reference__surface">
        {items.map((item) => (
          <article
            key={item.id}
            className={`compact-reference__item compact-reference__item--${item.tone} ${
              item.hasMismatch
                ? 'compact-reference__item--mismatch'
                : item.hasEditedMatch
                  ? 'compact-reference__item--edited-match'
                  : ''
            }`}
          >
            <span className="compact-reference__dot" aria-hidden="true" />

            <span className="compact-reference__label">{item.label}</span>

            <div className="compact-reference__value-shell">
              {item.isEditable && onEditableValueChange ? (
                <input
                  type="text"
                  className="compact-reference__value-input"
                  value={item.value}
                  size={Math.min(Math.max(item.value.length, 1), 34)}
                  aria-label={`Valor compacto para ${item.label}`}
                  onChange={(event) =>
                    onEditableValueChange(item.id, event.currentTarget.value)
                  }
                />
              ) : (
                <div
                  className="compact-reference__value-text"
                  tabIndex={0}
                  title={item.value}
                >
                  {item.value}
                </div>
              )}
            </div>

            {onVisibilityToggle ? (
              <button
                type="button"
                className="compact-reference__remove"
                onClick={() => onVisibilityToggle(item.label)}
                aria-label={`Quitar ${item.label} de la referencia compacta`}
              >
                <CircleXmarkIcon className="compact-reference__remove-icon" />
              </button>
            ) : null}
          </article>
        ))}
      </div>
    </div>
  )
}

export default CompactReferenceBar
