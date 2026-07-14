import type { JsonItemSnapshot } from './jsonCompactModels'
import './WorkspaceAlertSummary.css'

type WorkspaceAlertSummaryProps = {
  source: 'primary' | 'secondary' | 'both'
  primaryItems: JsonItemSnapshot[]
  secondaryItems: JsonItemSnapshot[]
  mismatchLabels: string[]
}

function WorkspaceAlertSummary({
  source,
  primaryItems,
  secondaryItems,
  mismatchLabels,
}: WorkspaceAlertSummaryProps) {
  const primaryByLabel = new Map(
    primaryItems.map((item) => [item.label, item]),
  )
  const secondaryByLabel = new Map(
    secondaryItems.map((item) => [item.label, item]),
  )
  const mismatchLabelSet = new Set(mismatchLabels)
  const mismatchAlerts = mismatchLabels.flatMap((label) => {
    const primaryItem = primaryByLabel.get(label)
    const secondaryItem = secondaryByLabel.get(label)

    if (!primaryItem && !secondaryItem) {
      return []
    }

    return [
      {
        label,
        tone: primaryItem?.tone ?? secondaryItem?.tone ?? 'gray',
        primaryValue: primaryItem?.value ?? 'Sin dato',
        secondaryValue: secondaryItem?.value ?? 'Sin dato',
      },
    ]
  })
  const editedAlerts = [
    ...(source === 'secondary'
      ? []
      : primaryItems.map((item) => ({ item, sourceLabel: 'BP' }))),
    ...(source === 'primary'
      ? []
      : secondaryItems.map((item) => ({ item, sourceLabel: 'BEE' }))),
  ].filter(
    ({ item }) => item.isDirty && !mismatchLabelSet.has(item.label),
  )

  if (mismatchAlerts.length === 0 && editedAlerts.length === 0) {
    return null
  }

  return (
    <div className="workspace-alerts" aria-live="polite">
      {mismatchAlerts.map((alert) => (
        <article
          key={`mismatch-${alert.label}`}
          className={`workspace-alerts__item workspace-alerts__item--${alert.tone}`}
          title={`${alert.label}: blueplanet ${alert.primaryValue}; Beesion ${alert.secondaryValue}`}
        >
          <span className="workspace-alerts__dot" aria-hidden="true" />
          <strong>{alert.label}</strong>
          <span className="workspace-alerts__source">BP</span>
          <span className="workspace-alerts__value">{alert.primaryValue}</span>
          <span className="workspace-alerts__separator">/</span>
          <span className="workspace-alerts__source">BEE</span>
          <span className="workspace-alerts__value">{alert.secondaryValue}</span>
        </article>
      ))}

      {editedAlerts.map(({ item, sourceLabel }) => (
        <article
          key={`edited-${sourceLabel}-${item.id}`}
          className={`workspace-alerts__item workspace-alerts__item--${item.tone}`}
          title={`${item.label}: ${item.value}`}
        >
          <span className="workspace-alerts__dot" aria-hidden="true" />
          <strong>{item.label}</strong>
          <span className="workspace-alerts__source">
            {sourceLabel} EDITADO
          </span>
          <span className="workspace-alerts__value">{item.value}</span>
        </article>
      ))}
    </div>
  )
}

export default WorkspaceAlertSummary
