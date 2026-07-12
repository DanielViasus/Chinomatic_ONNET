import { useEffect, useState } from 'react'
import './ObtenerDataDelJasonOriginal.css'
import {
  areToneMapsEqual,
  dispatchToneSyncEvent,
  readToneMapFromStorage,
  sharedToneStorageKey,
  tonePalette,
  toneSyncEventName,
  type DataItemTone,
  type ToneMap,
} from './jsonToneShared'
import { findJsonLineNumber, type JsonLineLookupMode } from './jsonLineLookup'
import VisibilityToggleIcon from './VisibilityToggleIcon'
import type {
  JsonItemController,
  JsonItemSnapshot,
} from './jsonCompactModels'

type DataItemValueFormatter = (value: unknown, source: unknown) => string

type ObtenerDataItem = {
  label: string
  propertyPath: string
  tone?: DataItemTone
  formatValue?: DataItemValueFormatter
  lineSearchKey?: string
  lineLookupMode?: JsonLineLookupMode
}

type ObtenerDataDelJasonOriginalProps = {
  source: unknown
  sourceText: string
  items: ObtenerDataItem[]
  mismatchLabels?: string[]
  editedMatchLabels?: string[]
  onLineNumberClick?: (lineNumber: number) => void
  onControllerReady?: (controller: JsonItemController | null) => void
  onComparableStateChange?: (state: {
    values: Record<string, string>
    dirtyLabels: string[]
  }) => void
  onItemsSnapshotChange?: (items: JsonItemSnapshot[]) => void
}

type EditableValuesMap = Record<string, string>
type EditableState = {
  sourceSignature: string
  values: EditableValuesMap
}
type ToneState = {
  itemsSignature: string
  overrides: ToneMap
}

const legacyColorStorageKey = 'chinomatic-json-item-color-overrides-v2'
const legacyAutoColorStorageKey = 'chinomatic-json-item-colors'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function readPropertyValue(source: unknown, propertyPath: string): unknown {
  if (!isRecord(source) || propertyPath.trim().length === 0) {
    return undefined
  }

  return propertyPath.split('.').reduce<unknown>((currentValue, pathSegment) => {
    if (!isRecord(currentValue) || !(pathSegment in currentValue)) {
      return undefined
    }

    return currentValue[pathSegment]
  }, source)
}

function formatPropertyValue(value: unknown): string {
  if (value === undefined || value === null) {
    return 'Sin dato disponible'
  }

  if (typeof value === 'string') {
    return value
  }

  if (
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    typeof value === 'bigint'
  ) {
    return String(value)
  }

  return JSON.stringify(value)
}

function getItemKey(item: ObtenerDataItem): string {
  return `${item.label}::${item.propertyPath}`
}

function getToneKey(item: ObtenerDataItem): string {
  return item.label
}

function getDefaultTone(item: ObtenerDataItem): DataItemTone {
  return item.tone ?? 'gray'
}

function getLineSearchKey(item: ObtenerDataItem): string {
  return item.lineSearchKey ?? item.propertyPath.split('.').at(-1) ?? ''
}

function resolveItemValue(source: unknown, item: ObtenerDataItem): string {
  const propertyValue = readPropertyValue(source, item.propertyPath)

  if (item.formatValue) {
    return item.formatValue(propertyValue, source)
  }

  return formatPropertyValue(propertyValue)
}

function getItemsSignature(items: ObtenerDataItem[]): string {
  return items
    .map((item) => `${item.label}:${item.propertyPath}:${item.tone ?? 'gray'}`)
    .join('|')
}

function getToneKeys(items: ObtenerDataItem[]): string[] {
  return Array.from(new Set(items.map((item) => getToneKey(item))))
}

function pickRelevantToneOverrides(
  items: ObtenerDataItem[],
  toneOverrides: ToneMap,
): ToneMap {
  return Object.fromEntries(
    getToneKeys(items).flatMap((toneKey) => {
      const tone = toneOverrides[toneKey]

      if (!tone) {
        return []
      }

      return [[toneKey, tone] as const]
    }),
  )
}

function mapLegacyItemOverridesToToneMap(
  items: ObtenerDataItem[],
  legacyToneOverrides: ToneMap,
): ToneMap {
  return Object.fromEntries(
    items.flatMap((item) => {
      const tone = legacyToneOverrides[getItemKey(item)]

      if (!tone) {
        return []
      }

      return [[getToneKey(item), tone] as const]
    }),
  )
}

function getNextUnusedTone(usedTones: Set<DataItemTone>): DataItemTone {
  return tonePalette.find(
    (tone) => tone === 'gray' || !usedTones.has(tone),
  ) ?? 'gray'
}

function buildLegacyAutoAssignments(items: ObtenerDataItem[]): ToneMap {
  const assignments: ToneMap = {}
  const usedTones = new Set<DataItemTone>()

  for (const item of items) {
    const itemKey = getToneKey(item)
    const preferredTone = item.tone

    if (preferredTone && !usedTones.has(preferredTone)) {
      assignments[itemKey] = preferredTone
      if (preferredTone !== 'gray') {
        usedTones.add(preferredTone)
      }
      continue
    }

    const fallbackTone = getNextUnusedTone(usedTones)
    assignments[itemKey] = fallbackTone
    if (fallbackTone !== 'gray') {
      usedTones.add(fallbackTone)
    }
  }

  return assignments
}

function readStoredToneOverrides(items: ObtenerDataItem[]): ToneMap {
  const combinedOverrides = pickRelevantToneOverrides(
    items,
    readToneMapFromStorage(sharedToneStorageKey),
  )
  const legacyAssignments = mapLegacyItemOverridesToToneMap(
    items,
    readToneMapFromStorage(legacyColorStorageKey),
  )
  const legacyAutoAssignments = readToneMapFromStorage(legacyAutoColorStorageKey)
  const legacyAutoToneAssignments = buildLegacyAutoAssignments(items)

  const legacyAutoOverrides = Object.fromEntries(
    items.flatMap((item) => {
      const itemKey = getToneKey(item)
      const legacyTone = legacyAutoAssignments[getItemKey(item)]
      const legacyAutoTone = legacyAutoToneAssignments[itemKey]

      if (!legacyTone || legacyTone === legacyAutoTone) {
        return []
      }

      return [[itemKey, legacyTone] as const]
    }),
  )

  for (const toneKey of getToneKeys(items)) {
    if (!combinedOverrides[toneKey] && legacyAssignments[toneKey]) {
      combinedOverrides[toneKey] = legacyAssignments[toneKey]
    }

    if (!combinedOverrides[toneKey] && legacyAutoOverrides[toneKey]) {
      combinedOverrides[toneKey] = legacyAutoOverrides[toneKey]
    }
  }

  return combinedOverrides
}

function syncSharedToneOverrides(
  items: ObtenerDataItem[],
  toneOverrides: ToneMap,
): void {
  if (typeof window === 'undefined') {
    return
  }

  const currentSharedToneOverrides = readToneMapFromStorage(sharedToneStorageKey)
  const nextSharedToneOverrides = { ...currentSharedToneOverrides }

  for (const toneKey of getToneKeys(items)) {
    const tone = toneOverrides[toneKey]

    if (tone) {
      nextSharedToneOverrides[toneKey] = tone
    } else {
      delete nextSharedToneOverrides[toneKey]
    }
  }

  if (areToneMapsEqual(currentSharedToneOverrides, nextSharedToneOverrides)) {
    return
  }

  window.localStorage.setItem(
    sharedToneStorageKey,
    JSON.stringify(nextSharedToneOverrides),
  )
  dispatchToneSyncEvent()
}

function resolveToneAssignments(
  items: ObtenerDataItem[],
  storedOverrides: ToneMap,
): ToneMap {
  const assignments: ToneMap = {}
  const usedTones = new Set<DataItemTone>()

  for (const item of items) {
    const itemKey = getToneKey(item)
    const defaultTone = getDefaultTone(item)
    const overrideTone = storedOverrides[itemKey]
    const preferredTone = overrideTone ?? defaultTone

    let resolvedTone = preferredTone

    if (preferredTone !== 'gray' && usedTones.has(preferredTone)) {
      if (defaultTone !== 'gray' && !usedTones.has(defaultTone)) {
        resolvedTone = defaultTone
      } else {
        resolvedTone = 'gray'
      }
    }

    assignments[itemKey] = resolvedTone

    if (resolvedTone !== 'gray') {
      usedTones.add(resolvedTone)
    }
  }

  return assignments
}

function buildInitialValues(
  source: unknown,
  items: ObtenerDataItem[],
): EditableValuesMap {
  return Object.fromEntries(
    items.map((item) => [getItemKey(item), resolveItemValue(source, item)]),
  )
}

function ObtenerDataDelJasonOriginal({
  source,
  sourceText,
  items,
  mismatchLabels = [],
  editedMatchLabels = [],
  onLineNumberClick,
  onControllerReady,
  onComparableStateChange,
  onItemsSnapshotChange,
}: ObtenerDataDelJasonOriginalProps) {
  const itemsSignature = getItemsSignature(items)
  const originalValues = buildInitialValues(source, items)
  const sourceSignature = JSON.stringify(originalValues)
  const mismatchLabelSet = new Set(mismatchLabels)
  const editedMatchLabelSet = new Set(editedMatchLabels)
  const [editableState, setEditableState] = useState<EditableState>(() => ({
    sourceSignature,
    values: {},
  }))
  const [toneState, setToneState] = useState<ToneState>(() => ({
    itemsSignature,
    overrides: readStoredToneOverrides(items),
  }))
  const [itemVisibilityState, setItemVisibilityState] = useState<
    Record<string, boolean>
  >({})
  const editableValues =
    editableState.sourceSignature === sourceSignature
      ? editableState.values
      : {}
  const hasDirtyValues = Object.keys(editableValues).length > 0
  const toneAssignments =
    toneState.itemsSignature === itemsSignature
      ? resolveToneAssignments(items, toneState.overrides)
      : resolveToneAssignments(items, readStoredToneOverrides(items))
  const currentValuesByLabel = Object.fromEntries(
    items.map((item) => {
      const itemKey = getItemKey(item)
      return [item.label, editableValues[itemKey] ?? originalValues[itemKey]] as const
    }),
  )
  const currentValuesSignature = JSON.stringify(currentValuesByLabel)
  const dirtyLabels = items.flatMap((item) => {
    const itemKey = getItemKey(item)
    const currentValue = editableValues[itemKey] ?? originalValues[itemKey]

    return currentValue !== originalValues[itemKey] ? [item.label] : []
  })
  const dirtyLabelsSignature = JSON.stringify(dirtyLabels)
  const snapshotItemsJson = JSON.stringify(
    items.map((item) => {
      const itemKey = getItemKey(item)
      const toneKey = getToneKey(item)
      const originalValue = originalValues[itemKey]
      const currentValue = editableValues[itemKey] ?? originalValue

      return {
        id: itemKey,
        label: item.label,
        value: currentValue,
        tone: toneAssignments[toneKey] ?? item.tone ?? 'gray',
        isEditable: true,
        isDirty: currentValue !== originalValue,
        hasMismatch: mismatchLabelSet.has(item.label),
        hasEditedMatch:
          !mismatchLabelSet.has(item.label) &&
          editedMatchLabelSet.has(item.label),
      } satisfies JsonItemSnapshot
    }),
  )

  useEffect(() => {
    const toneOverrides =
      toneState.itemsSignature === itemsSignature ? toneState.overrides : {}

    syncSharedToneOverrides(items, toneOverrides)
  }, [items, itemsSignature, toneState])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    function handleToneSync() {
      const nextToneOverrides = readStoredToneOverrides(items)

      setToneState((currentState) => {
        if (
          currentState.itemsSignature === itemsSignature &&
          areToneMapsEqual(currentState.overrides, nextToneOverrides)
        ) {
          return currentState
        }

        return {
          itemsSignature,
          overrides: nextToneOverrides,
        }
      })
    }

    window.addEventListener(toneSyncEventName, handleToneSync)

    return () => {
      window.removeEventListener(toneSyncEventName, handleToneSync)
    }
  }, [items, itemsSignature])

  useEffect(() => {
    onComparableStateChange?.({
      values: JSON.parse(currentValuesSignature) as Record<string, string>,
      dirtyLabels: JSON.parse(dirtyLabelsSignature) as string[],
    })
  }, [currentValuesSignature, dirtyLabelsSignature, onComparableStateChange])

  useEffect(() => {
    onItemsSnapshotChange?.(JSON.parse(snapshotItemsJson) as JsonItemSnapshot[])
  }, [onItemsSnapshotChange, snapshotItemsJson])

  useEffect(() => {
    if (!onControllerReady) {
      return
    }

    const originalValuesById = JSON.parse(sourceSignature) as EditableValuesMap

    const controller: JsonItemController = {
      setValue(itemId, nextValue) {
        const originalValue = originalValuesById[itemId]

        if (typeof originalValue !== 'string') {
          return
        }

        setEditableState((currentState) => {
          const currentValues =
            currentState.sourceSignature === sourceSignature
              ? currentState.values
              : {}

          if (nextValue === originalValue) {
            const remainingValues = { ...currentValues }
            delete remainingValues[itemId]

            return {
              sourceSignature,
              values: remainingValues,
            }
          }

          return {
            sourceSignature,
            values: {
              ...currentValues,
              [itemId]: nextValue,
            },
          }
        })
      },
    }

    onControllerReady(controller)

    return () => {
      onControllerReady(null)
    }
  }, [onControllerReady, sourceSignature])

  function handleValueChange(
    itemKey: string,
    nextValue: string,
    originalValue: string,
  ) {
    setEditableState((currentState) => {
      const currentValues =
        currentState.sourceSignature === sourceSignature
          ? currentState.values
          : {}

      if (nextValue === originalValue) {
        const remainingValues = { ...currentValues }
        delete remainingValues[itemKey]

        return {
          sourceSignature,
          values: remainingValues,
        }
      }

      return {
        sourceSignature,
        values: {
          ...currentValues,
          [itemKey]: nextValue,
        },
      }
    })
  }

  function handleResetValue(itemKey: string) {
    setEditableState((currentState) => {
      const currentValues =
        currentState.sourceSignature === sourceSignature
          ? currentState.values
          : {}
      const remainingValues = { ...currentValues }
      delete remainingValues[itemKey]

      return {
        sourceSignature,
        values: remainingValues,
      }
    })
  }

  function handleResetAllValues() {
    setEditableState({
      sourceSignature,
      values: {},
    })
  }

  async function handleCopyValue(value: string) {
    try {
      await navigator.clipboard.writeText(value)
    } catch {
      const helperInput = document.createElement('textarea')
      helperInput.value = value
      helperInput.setAttribute('readonly', 'true')
      helperInput.style.position = 'absolute'
      helperInput.style.left = '-9999px'
      document.body.appendChild(helperInput)
      helperInput.select()
      document.execCommand('copy')
      document.body.removeChild(helperInput)
    }
  }

  function handleRotateTone(itemKey: string) {
    setToneState((currentState) => {
      const currentOverrides =
        currentState.itemsSignature === itemsSignature
          ? currentState.overrides
          : readStoredToneOverrides(items)
      const currentAssignments =
        resolveToneAssignments(items, currentOverrides)
      const currentTone = currentAssignments[itemKey] ?? 'gray'
      const usedByOthers = new Set<DataItemTone>(
        Object.entries(currentAssignments)
          .filter(
            ([currentItemKey, tone]) =>
              currentItemKey !== itemKey && tone !== 'gray',
          )
          .map(([, tone]) => tone),
      )
      const currentItem = items.find((item) => getToneKey(item) === itemKey)

      if (!currentItem) {
        return {
          itemsSignature,
          overrides: currentOverrides,
        }
      }

      const defaultTone = getDefaultTone(currentItem)
      let nextTone = currentTone

      for (let step = 1; step <= tonePalette.length; step += 1) {
        const paletteIndex =
          (tonePalette.indexOf(currentTone) + step) % tonePalette.length
        const candidateTone = tonePalette[paletteIndex]

        if (candidateTone === 'gray' || !usedByOthers.has(candidateTone)) {
          nextTone = candidateTone
          break
        }
      }

      const nextOverrides = { ...currentOverrides }

      if (nextTone === defaultTone) {
        delete nextOverrides[itemKey]
      } else {
        nextOverrides[itemKey] = nextTone
      }

      return {
        itemsSignature,
        overrides: nextOverrides,
      }
    })
  }

  function handleToggleItemVisibility(itemKey: string) {
    setItemVisibilityState((currentState) => ({
      ...currentState,
      [itemKey]: !(currentState[itemKey] ?? false),
    }))
  }

  return (
    <section className="obtener-data-jason-original">
      <div className="obtener-data-jason-original__header">
        <h3 className="obtener-data-jason-original__title">
          <span
            className="obtener-data-jason-original__title-emoji"
            aria-hidden="true"
          >
            🌍
          </span>
          <span>Despliegue Data blueplanet</span>
        </h3>

        <button
          type="button"
          className={`obtener-data-jason-original__action-button obtener-data-jason-original__action-button--block-reset ${
            hasDirtyValues
              ? ''
              : 'obtener-data-jason-original__action-button--hidden'
          }`}
          onClick={handleResetAllValues}
          disabled={!hasDirtyValues}
          tabIndex={hasDirtyValues ? 0 : -1}
          aria-hidden={!hasDirtyValues}
        >
          Reset todo
        </button>
      </div>

      <div className="obtener-data-jason-original__list">
        {items.map((item) => {
          const itemKey = getItemKey(item)
          const toneKey = getToneKey(item)
          const tone = toneAssignments[toneKey] ?? item.tone ?? 'gray'
          const originalValue = originalValues[itemKey]
          const currentValue = editableValues[itemKey] ?? originalValue
          const isDirty = currentValue !== originalValue
          const isEmptyValue = currentValue.trim().length === 0
          const hasMismatch = mismatchLabelSet.has(item.label)
          const hasEditedMatch =
            !hasMismatch && editedMatchLabelSet.has(item.label)
          const isItemVisible = itemVisibilityState[itemKey] ?? false
          const lineNumber = findJsonLineNumber({
            mode: item.lineLookupMode ?? 'property',
            searchKey: getLineSearchKey(item),
            sourceText,
            expectedValue: originalValue,
          })

          return (
            <div
              key={itemKey}
              className={`obtener-data-jason-original__item obtener-data-jason-original__item--${
                tone
              } ${
                hasMismatch
                  ? 'obtener-data-jason-original__item--mismatch'
                  : hasEditedMatch
                    ? 'obtener-data-jason-original__item--edited-match'
                    : ''
              }`}
            >
              <button
                type="button"
                className={`obtener-data-jason-original__flag obtener-data-jason-original__flag--${
                  tone
                }`}
                onClick={() => handleRotateTone(toneKey)}
                aria-label={`Cambiar color para ${item.label}`}
              >
                <span className="obtener-data-jason-original__flag-dot" />
              </button>

              <span className="obtener-data-jason-original__label">
                {item.label}
              </span>

              <div
                className={`obtener-data-jason-original__value-shell ${
                  isEmptyValue
                    ? 'obtener-data-jason-original__value-shell--empty'
                    : ''
                }`}
              >
                <span
                  className="obtener-data-jason-original__value-preview"
                  aria-hidden="true"
                >
                  {currentValue}
                </span>

                <input
                  type="text"
                  className={`obtener-data-jason-original__value-field ${
                    isEmptyValue
                      ? 'obtener-data-jason-original__value-field--empty'
                      : ''
                  }`}
                  value={currentValue}
                  aria-label={`Valor editable para ${item.label}`}
                  onChange={(event) =>
                    handleValueChange(
                      itemKey,
                      event.currentTarget.value,
                      originalValue,
                    )
                  }
                />
              </div>

              <button
                type="button"
                className={`obtener-data-jason-original__item-visibility-toggle ${
                  isItemVisible
                    ? ''
                    : 'obtener-data-jason-original__item-visibility-toggle--inactive'
                }`}
                onClick={() => handleToggleItemVisibility(itemKey)}
                aria-label={`Alternar icono de visibilidad para ${item.label}`}
                aria-pressed={isItemVisible}
              >
                <VisibilityToggleIcon
                  isVisible={isItemVisible}
                  className="obtener-data-jason-original__visibility-icon"
                />
              </button>

              {lineNumber ? (
                onLineNumberClick ? (
                  <button
                    type="button"
                    className="obtener-data-jason-original__line-meta"
                    onClick={() => onLineNumberClick(lineNumber)}
                    aria-label={`Ir a la linea ${lineNumber} para ${item.label}`}
                  >
                    {`(line ${lineNumber})`}
                  </button>
                ) : (
                  <span className="obtener-data-jason-original__line-meta">
                    {`(line ${lineNumber})`}
                  </span>
                )
              ) : null}

              <div className="obtener-data-jason-original__actions">
                {isDirty ? (
                  <button
                    type="button"
                    className="obtener-data-jason-original__action-button"
                    onClick={() => handleResetValue(itemKey)}
                  >
                    Reset
                  </button>
                ) : null}

                <button
                  type="button"
                  className="obtener-data-jason-original__action-button"
                  onClick={() => void handleCopyValue(currentValue)}
                >
                  Copy
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

export default ObtenerDataDelJasonOriginal
