import { useEffect, useState } from 'react'
import { oltReferenceByIp } from '../assets/_DATA/oltReferenceLookup'
import './OltReferencePanel.css'

type OltReferencePanelProps = {
  ip?: string
}

const oltReferenceExpandedStorageKey = 'chinomatic-olt-reference-expanded-v1'

function readStoredExpandedState(): boolean {
  if (typeof window === 'undefined') {
    return false
  }

  return (
    window.localStorage.getItem(oltReferenceExpandedStorageKey) === 'true'
  )
}

function OltReferencePanel({ ip = '' }: OltReferencePanelProps) {
  const normalizedIp = ip.trim()
  const [isExpanded, setIsExpanded] = useState(readStoredExpandedState)

  useEffect(() => {
    window.localStorage.setItem(
      oltReferenceExpandedStorageKey,
      String(isExpanded),
    )
  }, [isExpanded])

  if (!normalizedIp) {
    return null
  }

  const reference = oltReferenceByIp[normalizedIp]

  return (
    <section
      className={`olt-reference ${
        isExpanded ? '' : 'olt-reference--collapsed'
      }`}
      aria-live="polite"
    >
      <div className="olt-reference__header">
        <button
          type="button"
          className="olt-reference__disclosure"
          aria-expanded={isExpanded}
          aria-controls="olt-reference-content"
          onClick={() => setIsExpanded((currentValue) => !currentValue)}
        >
          <span className="olt-reference__disclosure-icon" aria-hidden="true" />
          <span className="olt-reference__disclosure-copy">
            <span className="olt-reference__eyebrow">Tabla OLT</span>
            <span className="olt-reference__title">
              Referencia de infraestructura
            </span>
          </span>
        </button>

        {isExpanded ? (
          <span className="olt-reference__source">IP {normalizedIp}</span>
        ) : null}
      </div>

      <div
        id="olt-reference-content"
        className="olt-reference__content"
        aria-hidden={!isExpanded}
        inert={isExpanded ? undefined : true}
      >
        <div className="olt-reference__content-inner">
          {reference ? (
            <div className="olt-reference__result">
              <div className="olt-reference__segment">
                <span className="olt-reference__label">Fabricante</span>
                <strong>{reference.manufacturer || 'Sin dato'}</strong>
              </div>

              <span className="olt-reference__separator" aria-hidden="true">
                ►
              </span>

              <div className="olt-reference__segment olt-reference__segment--wide">
                <span className="olt-reference__label">IP - Nombre OSS</span>
                <strong title={reference.combined}>
                  {reference.combined ||
                    `${normalizedIp} - ${reference.ossName}`}
                </strong>
              </div>

              <span className="olt-reference__separator" aria-hidden="true">
                ►
              </span>

              <div className="olt-reference__segment">
                <span className="olt-reference__label">Comuna</span>
                <strong>{reference.commune || 'Sin dato'}</strong>
              </div>
            </div>
          ) : (
            <p className="olt-reference__empty">
              La IP {normalizedIp} no tiene coincidencia en la tabla OLT.
            </p>
          )}
        </div>
      </div>
    </section>
  )
}

export default OltReferencePanel
