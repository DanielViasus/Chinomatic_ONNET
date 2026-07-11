import { useEffect, useState, type ReactNode } from 'react'
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

type DataItemValueFormatter = (value: unknown, source: unknown) => string
type ComplementaryLineLookupConfig = {
  searchKey: string
  expectedValue?: string
  mode?: JsonLineLookupMode
}
type ComplementaryValuePreviewContext = {
  source: unknown
  value: string
  tone: DataItemTone
}

type ComplementaryDataItem = {
  id: string
  label: string
  tone?: DataItemTone
  resolveValue: (source: unknown) => unknown
  resolveComparableValue?: (source: unknown) => string
  formatValue?: DataItemValueFormatter
  renderValuePreview?: (
    context: ComplementaryValuePreviewContext,
  ) => ReactNode
  resolveLineLookup?: (source: unknown) => ComplementaryLineLookupConfig | null
  lineSearchKey: string
  lineLookupMode?: JsonLineLookupMode
}

type ObtenerDataDelJasonComplementarioProps = {
  source: unknown
  sourceText: string
  allowValueEditing?: boolean
  mismatchLabels?: string[]
  editedMatchLabels?: string[]
  onLineNumberClick?: (lineNumber: number) => void
  onComparableStateChange?: (state: {
    values: Record<string, string>
    dirtyLabels: string[]
  }) => void
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

const legacyColorStorageKey = 'chinomatic-secondary-json-item-color-overrides-v1'

type PasswordValuePart = {
  id: 'password' | 'serial'
  prefix: 'PSW' | 'SRL'
  value: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
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

function readCharacteristicValue(
  collection: unknown,
  characteristicName: string,
): unknown {
  if (!Array.isArray(collection)) {
    return undefined
  }

  const characteristic = collection.find((entry) => {
    if (!isRecord(entry)) {
      return false
    }

    return entry.name === characteristicName
  })

  if (!isRecord(characteristic)) {
    return undefined
  }

  return characteristic.value
}

function readRootCharacteristicValue(
  source: unknown,
  characteristicName: string,
): unknown {
  if (!isRecord(source)) {
    return undefined
  }

  return readCharacteristicValue(source.productCharacteristic, characteristicName)
}

function readFirstProduct(source: unknown): unknown {
  if (!isRecord(source) || !Array.isArray(source.product)) {
    return undefined
  }

  return source.product[0]
}

function readProductCharacteristicValue(
  source: unknown,
  characteristicName: string,
): unknown {
  const firstProduct = readFirstProduct(source)

  if (!isRecord(firstProduct)) {
    return undefined
  }

  return readCharacteristicValue(
    firstProduct.productCharacteristic,
    characteristicName,
  )
}

function resolveOltValue(source: unknown): string {
  const deviceName = readRootCharacteristicValue(source, 'device_name')

  return normalizeCompactStringValue(deviceName)
}

function resolvePortValue(source: unknown): string {
  const pluggableName = readRootCharacteristicValue(source, 'pluggable_name')

  if (typeof pluggableName === 'string' && pluggableName.trim().length > 0) {
    const normalizedPluggableName = normalizeCompactStringValue(pluggableName)
    const sfpIndex = normalizedPluggableName.indexOf('SFP ')

    if (sfpIndex !== -1) {
      const extractedPort = normalizedPluggableName
        .slice(sfpIndex + 4, sfpIndex + 6)
        .replace(')', '')
        .trim()

      if (extractedPort.length > 0) {
        return extractedPort
      }
    }

    return normalizedPluggableName
  }

  const fallbackPort = readRootCharacteristicValue(source, 'PortID')
  return formatPropertyValue(fallbackPort)
}

function resolveOnuIdValue(source: unknown): string {
  const onuIdValue = readRootCharacteristicValue(source, 'onu_id')

  return normalizeCompactStringValue(onuIdValue)
}

function normalizeOptionalStringValue(value: unknown): string | null {
  if (value === undefined || value === null) {
    return null
  }

  const normalizedValue = normalizeCompactStringValue(value)

  return normalizedValue.length > 0 &&
    normalizedValue !== 'Sin dato disponible'
    ? normalizedValue
    : null
}

function resolvePasswordValueParts(source: unknown): PasswordValuePart[] {
  const passwordValue = normalizeOptionalStringValue(
    readRootCharacteristicValue(source, 'PasswordId'),
  )
  const serialValue = normalizeOptionalStringValue(
    readRootCharacteristicValue(source, 'serialId'),
  )
  const parts: PasswordValuePart[] = []

  if (passwordValue) {
    parts.push({
      id: 'password',
      prefix: 'PSW',
      value: passwordValue,
    })
  }

  if (serialValue) {
    parts.push({
      id: 'serial',
      prefix: 'SRL',
      value: serialValue,
    })
  }

  return parts
}

function resolvePasswordDisplayValue(source: unknown): string {
  const passwordValueParts = resolvePasswordValueParts(source)

  if (passwordValueParts.length === 0) {
    return 'Sin dato disponible'
  }

  return passwordValueParts
    .map((part) => `${part.prefix}: ${part.value}`)
    .join(' | ')
}

function resolvePasswordComparableValue(source: unknown): string {
  const passwordValue = normalizeOptionalStringValue(
    readRootCharacteristicValue(source, 'PasswordId'),
  )
  const serialValue = normalizeOptionalStringValue(
    readRootCharacteristicValue(source, 'serialId'),
  )

  return passwordValue ?? serialValue ?? 'Sin dato disponible'
}

function resolvePasswordLineLookup(
  source: unknown,
): ComplementaryLineLookupConfig | null {
  const passwordValue = normalizeOptionalStringValue(
    readRootCharacteristicValue(source, 'PasswordId'),
  )

  if (passwordValue) {
    return {
      searchKey: 'PasswordId',
      expectedValue: passwordValue,
      mode: 'characteristic',
    }
  }

  const serialValue = normalizeOptionalStringValue(
    readRootCharacteristicValue(source, 'serialId'),
  )

  if (serialValue) {
    return {
      searchKey: 'serialId',
      expectedValue: serialValue,
      mode: 'characteristic',
    }
  }

  return null
}

function renderPasswordValuePreview({
  source,
}: ComplementaryValuePreviewContext): ReactNode {
  const passwordValueParts = resolvePasswordValueParts(source)

  if (passwordValueParts.length === 0) {
    return 'Sin dato disponible'
  }

  return passwordValueParts.map((part, index) => (
    <span
      key={`${part.id}-${part.value}-${index}`}
      className={`obtener-data-jason-original__value-chip ${
        part.id === 'password'
          ? 'obtener-data-jason-original__value-chip--primary'
          : 'obtener-data-jason-original__value-chip--secondary'
      }`}
    >
      <span className="obtener-data-jason-original__value-chip-prefix">
        {part.prefix}
      </span>
      <span className="obtener-data-jason-original__value-chip-text">
        {part.value}
      </span>
    </span>
  ))
}

function normalizeCompactStringValue(value: unknown): string {
  if (typeof value !== 'string') {
    return formatPropertyValue(value)
  }

  return value.replace(/\s+/g, ' ').trim()
}

const complementaryItems: ComplementaryDataItem[] = [
  {
    id: 'olt',
    label: 'OLT',
    resolveValue: resolveOltValue,
    lineSearchKey: 'device_name',
    lineLookupMode: 'characteristic',
  },
  {
    id: 'slot',
    label: 'SLOT',
    tone: 'red',
    resolveValue: (source) => readRootCharacteristicValue(source, 'card'),
    lineSearchKey: 'card',
    lineLookupMode: 'characteristic',
  },
  {
    id: 'port',
    label: 'PORT',
    tone: 'green',
    resolveValue: resolvePortValue,
    lineSearchKey: 'pluggable_name',
    lineLookupMode: 'characteristic',
  },
  {
    id: 'onuid',
    label: 'ONUID',
    tone: 'blue',
    resolveValue: resolveOnuIdValue,
    lineSearchKey: 'onu_id',
    lineLookupMode: 'characteristic',
  },
  {
    id: 'password',
    label: 'PASSWORD',
    tone: 'yellow',
    resolveValue: resolvePasswordDisplayValue,
    resolveComparableValue: resolvePasswordComparableValue,
    renderValuePreview: renderPasswordValuePreview,
    resolveLineLookup: resolvePasswordLineLookup,
    lineSearchKey: 'PasswordId',
    lineLookupMode: 'characteristic',
  },
  {
    id: 'network-vlan',
    label: 'NETWORKVLAN',
    tone: 'orange',
    resolveValue: (source) =>
      readProductCharacteristicValue(source, 'Network_VLAN_BA'),
    lineSearchKey: 'Network_VLAN_BA',
    lineLookupMode: 'characteristic',
  },
  {
    id: 'cto-name',
    label: 'CTONAME',
    resolveValue: (source) => readRootCharacteristicValue(source, 'CTOName'),
    formatValue: (value) => normalizeCompactStringValue(value),
    lineSearchKey: 'CTOName',
    lineLookupMode: 'characteristic',
  },
  {
    id: 'vlan',
    label: 'VLAN',
    resolveValue: (source) => readProductCharacteristicValue(source, 'ONT_VLAN_BA'),
    lineSearchKey: 'ONT_VLAN_BA',
    lineLookupMode: 'characteristic',
  },
  {
    id: 'profiledata',
    label: 'PROFILEDATA',
    resolveValue: (source) =>
      readProductCharacteristicValue(source, 'Down_optical_profile'),
    lineSearchKey: 'Down_optical_profile',
    lineLookupMode: 'characteristic',
  },
  {
    id: 'product-id',
    label: 'PRODUCTID',
    resolveValue: (source) => readRootCharacteristicValue(source, 'ProductId'),
    lineSearchKey: 'ProductId',
    lineLookupMode: 'characteristic',
  },
  {
    id: 'ont-type',
    label: 'ONTTYPE',
    resolveValue: (source) => readRootCharacteristicValue(source, 'typeOnt'),
    lineSearchKey: 'typeOnt',
    lineLookupMode: 'characteristic',
  },
  {
    id: 'customer',
    label: 'CUSTOMER',
    resolveValue: (source) => readRootCharacteristicValue(source, 'customerType'),
    lineSearchKey: 'customerType',
    lineLookupMode: 'characteristic',
  },
]

function getItemKey(item: ComplementaryDataItem): string {
  return item.id
}

function getToneKey(item: ComplementaryDataItem): string {
  return item.label
}

function getDefaultTone(item: ComplementaryDataItem): DataItemTone {
  return item.tone ?? 'gray'
}

function resolveItemValue(source: unknown, item: ComplementaryDataItem): string {
  const propertyValue = item.resolveValue(source)

  if (item.formatValue) {
    return item.formatValue(propertyValue, source)
  }

  return formatPropertyValue(propertyValue)
}

function resolveComparableItemValue(
  source: unknown,
  item: ComplementaryDataItem,
): string {
  return item.resolveComparableValue
    ? item.resolveComparableValue(source)
    : resolveItemValue(source, item)
}

function getItemsSignature(items: ComplementaryDataItem[]): string {
  return items
    .map((item) => `${item.id}:${item.label}:${item.tone ?? 'gray'}`)
    .join('|')
}

function getToneKeys(items: ComplementaryDataItem[]): string[] {
  return Array.from(new Set(items.map((item) => getToneKey(item))))
}

function pickRelevantToneOverrides(
  items: ComplementaryDataItem[],
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
  items: ComplementaryDataItem[],
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

function syncSharedToneOverrides(
  items: ComplementaryDataItem[],
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
  items: ComplementaryDataItem[],
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
  items: ComplementaryDataItem[],
): EditableValuesMap {
  return Object.fromEntries(
    items.map((item) => [getItemKey(item), resolveItemValue(source, item)]),
  )
}

function buildComparableValues(
  source: unknown,
  items: ComplementaryDataItem[],
): EditableValuesMap {
  return Object.fromEntries(
    items.map((item) => [
      getItemKey(item),
      resolveComparableItemValue(source, item),
    ]),
  )
}

function readStoredToneOverrides(items: ComplementaryDataItem[]): ToneMap {
  const combinedOverrides = pickRelevantToneOverrides(
    items,
    readToneMapFromStorage(sharedToneStorageKey),
  )
  const legacyOverrides = mapLegacyItemOverridesToToneMap(
    items,
    readToneMapFromStorage(legacyColorStorageKey),
  )

  for (const toneKey of getToneKeys(items)) {
    if (!combinedOverrides[toneKey] && legacyOverrides[toneKey]) {
      combinedOverrides[toneKey] = legacyOverrides[toneKey]
    }
  }

  return combinedOverrides
}

function ObtenerDataDelJasonComplementario({
  source,
  sourceText,
  allowValueEditing = false,
  mismatchLabels = [],
  editedMatchLabels = [],
  onLineNumberClick,
  onComparableStateChange,
}: ObtenerDataDelJasonComplementarioProps) {
  const itemsSignature = getItemsSignature(complementaryItems)
  const originalValues = buildInitialValues(source, complementaryItems)
  const comparableOriginalValues = buildComparableValues(
    source,
    complementaryItems,
  )
  const sourceSignature = JSON.stringify(originalValues)
  const mismatchLabelSet = new Set(mismatchLabels)
  const editedMatchLabelSet = new Set(editedMatchLabels)
  const [editableState, setEditableState] = useState<EditableState>(() => ({
    sourceSignature,
    values: {},
  }))
  const [toneState, setToneState] = useState<ToneState>(() => ({
    itemsSignature,
    overrides: readStoredToneOverrides(complementaryItems),
  }))
  const editableValues =
    editableState.sourceSignature === sourceSignature
      ? editableState.values
      : {}
  const hasDirtyValues =
    allowValueEditing && Object.keys(editableValues).length > 0
  const toneAssignments =
    toneState.itemsSignature === itemsSignature
      ? resolveToneAssignments(complementaryItems, toneState.overrides)
      : resolveToneAssignments(
          complementaryItems,
          readStoredToneOverrides(complementaryItems),
        )
  const currentValuesByLabel = Object.fromEntries(
    complementaryItems.map((item) => {
      const itemKey = getItemKey(item)
      return [
        item.label,
        editableValues[itemKey] ?? comparableOriginalValues[itemKey],
      ] as const
    }),
  )
  const currentValuesSignature = JSON.stringify(currentValuesByLabel)
  const dirtyLabels = allowValueEditing
    ? complementaryItems.flatMap((item) => {
        const itemKey = getItemKey(item)
        const currentValue = editableValues[itemKey] ?? originalValues[itemKey]

        return currentValue !== originalValues[itemKey] ? [item.label] : []
      })
    : []
  const dirtyLabelsSignature = JSON.stringify(dirtyLabels)

  useEffect(() => {
    const toneOverrides =
      toneState.itemsSignature === itemsSignature ? toneState.overrides : {}

    syncSharedToneOverrides(complementaryItems, toneOverrides)
  }, [itemsSignature, toneState])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    function handleToneSync() {
      const nextToneOverrides = readStoredToneOverrides(complementaryItems)

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
  }, [itemsSignature])

  useEffect(() => {
    onComparableStateChange?.({
      values: JSON.parse(currentValuesSignature) as Record<string, string>,
      dirtyLabels: JSON.parse(dirtyLabelsSignature) as string[],
    })
  }, [currentValuesSignature, dirtyLabelsSignature, onComparableStateChange])

  function handleValueChange(
    itemKey: string,
    nextValue: string,
    originalValue: string,
  ) {
    if (!allowValueEditing) {
      return
    }

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
    if (!allowValueEditing) {
      return
    }

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
    if (!allowValueEditing) {
      return
    }

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
          : readStoredToneOverrides(complementaryItems)
      const currentAssignments = resolveToneAssignments(
        complementaryItems,
        currentOverrides,
      )
      const currentTone = currentAssignments[itemKey] ?? 'gray'
      const usedByOthers = new Set<DataItemTone>(
        Object.entries(currentAssignments)
          .filter(
            ([currentItemKey, tone]) =>
              currentItemKey !== itemKey && tone !== 'gray',
          )
          .map(([, tone]) => tone),
      )
      const currentItem = complementaryItems.find(
        (item) => getToneKey(item) === itemKey,
      )

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

  return (
    <section className="obtener-data-jason-original">
      <div className="obtener-data-jason-original__header">
        <h3 className="obtener-data-jason-original__title">
          ObtenerDataDelJason Complementario
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
        {complementaryItems.map((item) => {
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
          const lineLookupConfig = item.resolveLineLookup?.(source) ?? {
            mode: item.lineLookupMode ?? 'property',
            searchKey: item.lineSearchKey,
            expectedValue: originalValue,
          }
          const lineNumber = lineLookupConfig
            ? findJsonLineNumber({
                mode: lineLookupConfig.mode ?? 'property',
                searchKey: lineLookupConfig.searchKey,
                sourceText,
                expectedValue: lineLookupConfig.expectedValue,
              })
            : null
          const customValuePreview = item.renderValuePreview?.({
            source,
            value: currentValue,
            tone,
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
                  className={`obtener-data-jason-original__value-preview ${
                    customValuePreview
                      ? 'obtener-data-jason-original__value-preview--rich'
                      : ''
                  }`}
                  aria-hidden={allowValueEditing ? 'true' : undefined}
                >
                  {customValuePreview ?? currentValue}
                </span>

                {allowValueEditing ? (
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
                ) : null}
              </div>

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
                {allowValueEditing && isDirty ? (
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

export default ObtenerDataDelJasonComplementario
