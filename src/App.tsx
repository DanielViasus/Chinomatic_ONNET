import {
  type ClipboardEvent,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import { flushSync } from 'react-dom'
import './App.css'
import './components/AppToast.css'
import CompactReferenceBar from './components/CompactReferenceBar'
import CompactReferenceAdditionToast, {
  type CompactReferenceAdditionNotice,
} from './components/CompactReferenceAdditionToast'
import ExtractedDataModificationToast, {
  type ExtractedDataModificationNotice,
} from './components/ExtractedDataModificationToast'
import ObtenerDataDelJasonComplementario from './components/ObtenerDataDelJasonComplementario'
import ObtenerDataDelJasonOriginal from './components/ObtenerDataDelJasonOriginal'
import OltReferencePanel from './components/OltReferencePanel'
import Selector_Tema from './components/Selector_Tema'
import ValidationCommandsPanel from './components/ValidationCommandsPanel'
import WorkspaceAlertSummary from './components/WorkspaceAlertSummary'
import type {
  JsonItemController,
  JsonItemSnapshot,
} from './components/jsonCompactModels'

import {
  sampleComplementaryService,
  sampleService,
} from './assets/_DATA/serviceExamples'
const initialJson = JSON.stringify(sampleService, null, 2)
const initialComplementaryJson = JSON.stringify(sampleComplementaryService, null, 2)
const themeStorageKey = 'chinomatic-theme'
const primaryJsonStorageKey = 'chinomatic-primary-json-v2'
const secondaryJsonStorageKey = 'chinomatic-secondary-json-v2'
const itemVisibilityStorageKey = 'chinomatic-item-visibility'
const editorsPanelExpandedStorageKey = 'chinomatic-editors-panel-expanded-v1'
const deploymentTablesExpandedStorageKey =
  'chinomatic-deployment-tables-expanded-v1'

type ParseResult = {
  error: string | null
  data: unknown
}
type ThemeMode = 'dark' | 'light'
type DocumentWithViewTransition = Document & {
  startViewTransition?: (callback: () => void) => void
}
type EditorInitialState = {
  rawJson: string
  parseResult: ParseResult
}
type EditorHighlightState = {
  lineNumber: number
  lineHeight: number
  paddingTop: number
}
type CurrentComparableValuesMap = Record<string, string>
type ComparableState = {
  values: CurrentComparableValuesMap
  dirtyLabels: string[]
}

const fallbackEditorLineHeight = 26
const fallbackEditorPadding = 18

const comparableDataLabels = [
  'SLOT',
  'PORT',
  'ONUID',
  'PASSWORD',
  'NETWORKVLAN',
  'VLAN',
  'PROFILEDATA',
  'PRODUCTID',
] as const

type ComparableDataLabel = (typeof comparableDataLabels)[number]
type ResettableCommandDataLabel = ComparableDataLabel | 'INNERVLAN'
type ComparableValuesMap = Partial<Record<ComparableDataLabel, string>>

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function readJsonPath(source: unknown, propertyPath: string): unknown {
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

function formatVnoValue(value: unknown, source: unknown): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return 'Sin dato disponible'
  }

  const customerType = readJsonPath(source, 'properties.customerType')

  if (typeof customerType !== 'string' || customerType.trim().length === 0) {
    return value
  }

  return `${value} - ${customerType}`
}

function formatComparableValue(value: unknown): string {
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

function readComplementaryRootCharacteristicValue(
  source: unknown,
  characteristicName: string,
): unknown {
  if (!isRecord(source)) {
    return undefined
  }

  return readCharacteristicValue(source.productCharacteristic, characteristicName)
}

function readComplementaryProductCharacteristicValue(
  source: unknown,
  characteristicName: string,
): unknown {
  if (!isRecord(source) || !Array.isArray(source.product)) {
    return undefined
  }

  const firstProduct = source.product[0]

  if (!isRecord(firstProduct)) {
    return undefined
  }

  return readCharacteristicValue(
    firstProduct.productCharacteristic,
    characteristicName,
  )
}

function resolveComplementaryPortComparableValue(source: unknown): string {
  const pluggableName = readComplementaryRootCharacteristicValue(
    source,
    'pluggable_name',
  )

  if (typeof pluggableName === 'string' && pluggableName.trim().length > 0) {
    const portMatch = pluggableName.match(/(\d+)(?!.*\d)/)

    if (portMatch) {
      return portMatch[1]
    }

    return pluggableName
  }

  return formatComparableValue(
    readComplementaryRootCharacteristicValue(source, 'PortID'),
  )
}

function getPrimaryComparableValues(source: unknown): ComparableValuesMap {
  return {
    SLOT: formatComparableValue(readJsonPath(source, 'properties.slot')),
    PORT: formatComparableValue(readJsonPath(source, 'properties.port')),
    ONUID: formatComparableValue(readJsonPath(source, 'properties.logicalPort')),
    PASSWORD: formatComparableValue(
      readJsonPath(source, 'properties.registrationTypeValue'),
    ),
    NETWORKVLAN: formatComparableValue(
      readJsonPath(source, 'properties.networkVlanData'),
    ),
    VLAN: formatComparableValue(readJsonPath(source, 'properties.ontVlanData')),
    PROFILEDATA: formatComparableValue(
      readJsonPath(source, 'properties.downOpticalProfileData'),
    ),
    PRODUCTID: formatComparableValue(readJsonPath(source, 'properties.productId')),
  }
}

function getSecondaryComparableValues(source: unknown): ComparableValuesMap {
  return {
    SLOT: formatComparableValue(
      readComplementaryRootCharacteristicValue(source, 'card'),
    ),
    PORT: resolveComplementaryPortComparableValue(source),
    ONUID: formatComparableValue(
      readComplementaryRootCharacteristicValue(source, 'onu_id'),
    ),
    PASSWORD: formatComparableValue(
      readComplementaryRootCharacteristicValue(source, 'PasswordId'),
    ),
    NETWORKVLAN: formatComparableValue(
      readComplementaryProductCharacteristicValue(source, 'Network_VLAN_BA'),
    ),
    VLAN: formatComparableValue(
      readComplementaryProductCharacteristicValue(source, 'ONT_VLAN_BA'),
    ),
    PROFILEDATA: formatComparableValue(
      readComplementaryProductCharacteristicValue(source, 'Down_optical_profile'),
    ),
    PRODUCTID: formatComparableValue(
      readComplementaryRootCharacteristicValue(source, 'ProductId'),
    ),
  }
}

function normalizeComparableValue(value: string | undefined): string {
  return typeof value === 'string' ? value.trim() : ''
}

function getMismatchLabels(
  primaryComparableValues: CurrentComparableValuesMap,
  secondaryComparableValues: CurrentComparableValuesMap,
): string[] {
  return comparableDataLabels.filter(
    (label) =>
      normalizeComparableValue(primaryComparableValues[label]) !==
      normalizeComparableValue(secondaryComparableValues[label]),
  )
}

function getEditedMatchLabels(
  primaryComparableState: ComparableState,
  secondaryComparableState: ComparableState,
): string[] {
  const dirtyLabels = new Set([
    ...primaryComparableState.dirtyLabels,
    ...secondaryComparableState.dirtyLabels,
  ])

  return comparableDataLabels.filter(
    (label) =>
      dirtyLabels.has(label) &&
      normalizeComparableValue(primaryComparableState.values[label]) ===
        normalizeComparableValue(secondaryComparableState.values[label]),
  )
}

function parsePayload(rawJson: string): ParseResult {
  const normalizedJson = rawJson.trim()

  if (normalizedJson.length === 0) {
    return {
      error: null,
      data: null,
    }
  }

  function tryParseJson(candidate: string): ParseResult {
    try {
      return {
        error: null,
        data: JSON.parse(candidate),
      }
    } catch (error) {
      return {
        error:
          error instanceof Error
            ? error.message
            : 'No se pudo interpretar el JSON.',
        data: null,
      }
    }
  }

  const firstAttempt = tryParseJson(normalizedJson)

  if (!firstAttempt.error) {
    if (typeof firstAttempt.data === 'string') {
      const nestedJson = firstAttempt.data.trim()

      if (nestedJson.startsWith('{') || nestedJson.startsWith('[')) {
        const nestedAttempt = tryParseJson(nestedJson)

        if (!nestedAttempt.error) {
          return nestedAttempt
        }
      }
    }

    return firstAttempt
  }

  if (
    normalizedJson.startsWith('"') &&
    normalizedJson.endsWith('"') &&
    normalizedJson.includes('""')
  ) {
    const unwrappedJson = normalizedJson.slice(1, -1).replaceAll('""', '"')
    const unwrappedAttempt = tryParseJson(unwrappedJson)

    if (!unwrappedAttempt.error) {
      return unwrappedAttempt
    }
  }

  try {
    const parsedData = JSON.parse(normalizedJson)

    return {
      error: null,
      data: parsedData,
    }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'No se pudo interpretar el JSON.',
      data: null,
    }
  }
}

function isEditorInDefaultState(rawJson: string): boolean {
  const normalizedJson = rawJson.trim()
  return normalizedJson.length === 0
}

function formatStructuredJsonForEditor(rawJson: string): string | null {
  const parseResult = parsePayload(rawJson)

  if (parseResult.error || parseResult.data === null) {
    return null
  }

  if (typeof parseResult.data !== 'object') {
    return null
  }

  return JSON.stringify(parseResult.data, null, 2)
}

function readStoredJson(storageKey: string, fallbackRawJson: string): string {
  if (typeof window === 'undefined') {
    return fallbackRawJson
  }

  return window.localStorage.getItem(storageKey) ?? fallbackRawJson
}

function readStoredItemVisibility(): Record<string, boolean> {
  if (typeof window === 'undefined') {
    return {}
  }

  try {
    const storedValue = window.localStorage.getItem(itemVisibilityStorageKey)

    if (!storedValue) {
      return {}
    }

    const parsedValue: unknown = JSON.parse(storedValue)

    if (!isRecord(parsedValue)) {
      return {}
    }

    return Object.fromEntries(
      Object.entries(parsedValue).filter(
        ([label, isVisible]) =>
          label.trim().length > 0 && typeof isVisible === 'boolean',
      ),
    ) as Record<string, boolean>
  } catch {
    return {}
  }
}

function readStoredExpandedState(storageKey: string): boolean {
  if (typeof window === 'undefined') {
    return true
  }

  const storedValue = window.localStorage.getItem(storageKey)

  return storedValue === null ? true : storedValue === 'true'
}

function createInitialEditorState(
  storageKey: string,
  fallbackRawJson: string,
  preferStoredJson = true,
): EditorInitialState {
  const rawJson = preferStoredJson
    ? readStoredJson(storageKey, fallbackRawJson)
    : fallbackRawJson

  return {
    rawJson,
    parseResult: parsePayload(rawJson),
  }
}

function readEditorMetric(metricValue: string, fallbackValue: number): number {
  const parsedValue = Number.parseFloat(metricValue)
  return Number.isFinite(parsedValue) ? parsedValue : fallbackValue
}

function getEditorLineMetrics(textarea: HTMLTextAreaElement): {
  lineHeight: number
  paddingTop: number
  paddingBottom: number
} {
  const computedStyles = window.getComputedStyle(textarea)

  return {
    lineHeight: readEditorMetric(
      computedStyles.lineHeight,
      fallbackEditorLineHeight,
    ),
    paddingTop: readEditorMetric(
      computedStyles.paddingTop,
      fallbackEditorPadding,
    ),
    paddingBottom: readEditorMetric(
      computedStyles.paddingBottom,
      fallbackEditorPadding,
    ),
  }
}

function getLineSelectionRange(
  rawJson: string,
  lineNumber: number,
): { start: number; end: number } | null {
  if (lineNumber < 1) {
    return null
  }

  const lines = rawJson.split('\n')

  if (lineNumber > lines.length) {
    return null
  }

  const start = lines
    .slice(0, Math.max(0, lineNumber - 1))
    .reduce((totalLength, line) => totalLength + line.length + 1, 0)
  const currentLine = lines[lineNumber - 1] ?? ''
  const end = Math.min(rawJson.length, start + currentLine.length + 1)

  return { start, end }
}

function buildEditorHighlightStyle(
  highlight: EditorHighlightState | null,
  scrollTop: number,
): CSSProperties | undefined {
  if (!highlight) {
    return undefined
  }

  return {
    '--editor-highlight-top': `${
      highlight.paddingTop +
      (highlight.lineNumber - 1) * highlight.lineHeight -
      scrollTop
    }px`,
    '--editor-highlight-height': `${highlight.lineHeight}px`,
  } as CSSProperties
}

function mergeCompactItems(
  primaryItems: JsonItemSnapshot[],
  secondaryItems: JsonItemSnapshot[],
): JsonItemSnapshot[] {
  const primaryLabels = new Set(primaryItems.map((item) => item.label))

  return [
    ...primaryItems,
    ...secondaryItems.filter((item) => !primaryLabels.has(item.label)),
  ]
}

function App() {
  const [initialPrimaryState] = useState(() =>
    createInitialEditorState(primaryJsonStorageKey, initialJson),
  )
  const [initialSecondaryState] = useState(() =>
    createInitialEditorState(
      secondaryJsonStorageKey,
      initialComplementaryJson,
      false,
    ),
  )
  const [rawJson, setRawJson] = useState(initialPrimaryState.rawJson)
  const [parseError, setParseError] = useState<string | null>(
    initialPrimaryState.parseResult.error,
  )
  const [parsedJson, setParsedJson] = useState<unknown>(
    initialPrimaryState.parseResult.data,
  )
  const [rawJsonSecondary, setRawJsonSecondary] = useState(
    initialSecondaryState.rawJson,
  )
  const [parseErrorSecondary, setParseErrorSecondary] = useState<string | null>(
    initialSecondaryState.parseResult.error,
  )
  const [parsedJsonSecondary, setParsedJsonSecondary] = useState<unknown>(
    initialSecondaryState.parseResult.data,
  )
  const [primaryComparableState, setPrimaryComparableState] =
    useState<ComparableState>(() => ({
      values: {
        ...getPrimaryComparableValues(initialPrimaryState.parseResult.data),
      },
      dirtyLabels: [],
    }))
  const [secondaryComparableState, setSecondaryComparableState] =
    useState<ComparableState>(() => ({
      values: {
        ...getSecondaryComparableValues(initialSecondaryState.parseResult.data),
      },
      dirtyLabels: [],
    }))
  const [theme, setTheme] = useState<ThemeMode>(() => {
    if (typeof window === 'undefined') {
      return 'dark'
    }

    const storedTheme = window.localStorage.getItem(themeStorageKey)
    return storedTheme === 'light' || storedTheme === 'dark'
      ? storedTheme
      : 'dark'
  })
  const [primarySnapshotItems, setPrimarySnapshotItems] = useState<
    JsonItemSnapshot[]
  >([])
  const [secondarySnapshotItems, setSecondarySnapshotItems] = useState<
    JsonItemSnapshot[]
  >([])
  const [highlightedDataLabel, setHighlightedDataLabel] = useState<
    string | null
  >(null)
  const [itemVisibilityByLabel, setItemVisibilityByLabel] = useState<
    Record<string, boolean>
  >(readStoredItemVisibility)
  const [isEditorsPanelExpanded, setIsEditorsPanelExpanded] =
    useState(() => readStoredExpandedState(editorsPanelExpandedStorageKey))
  const [isDeploymentTablesExpanded, setIsDeploymentTablesExpanded] =
    useState(() =>
      readStoredExpandedState(deploymentTablesExpandedStorageKey),
    )
  const [primaryController, setPrimaryController] =
    useState<JsonItemController | null>(null)
  const [secondaryController, setSecondaryController] =
    useState<JsonItemController | null>(null)
  const [dataModificationNotice, setDataModificationNotice] =
    useState<ExtractedDataModificationNotice | null>(null)
  const [compactReferenceAdditionNotice, setCompactReferenceAdditionNotice] =
    useState<CompactReferenceAdditionNotice | null>(null)
  const dataModificationNoticeIdRef = useRef(0)
  const dataModificationDebounceTimerRef = useRef<number | null>(null)
  const dataModificationHideTimerRef = useRef<number | null>(null)
  const compactReferenceAdditionNoticeIdRef = useRef(0)
  const compactReferenceAdditionTimerRef = useRef<number | null>(null)
  const panelRef = useRef<HTMLElement | null>(null)
  const lineNumbersRef = useRef<HTMLDivElement | null>(null)
  const secondaryLineNumbersRef = useRef<HTMLDivElement | null>(null)
  const primaryEditorRef = useRef<HTMLTextAreaElement | null>(null)
  const secondaryEditorRef = useRef<HTMLTextAreaElement | null>(null)
  const [panelPlaceholderHeight, setPanelPlaceholderHeight] = useState(0)
  const [primaryEditorScrollTop, setPrimaryEditorScrollTop] = useState(0)
  const [secondaryEditorScrollTop, setSecondaryEditorScrollTop] = useState(0)
  const [primaryEditorHighlight, setPrimaryEditorHighlight] =
    useState<EditorHighlightState | null>(null)
  const [secondaryEditorHighlight, setSecondaryEditorHighlight] =
    useState<EditorHighlightState | null>(null)
  const isPrimaryEditorEmpty = isEditorInDefaultState(rawJson)
  const isSecondaryEditorEmpty = isEditorInDefaultState(rawJsonSecondary)
  const lineCount = rawJson.split('\n').length
  const lineNumbers = Array.from({ length: lineCount }, (_, index) => index + 1)
  const secondaryLineCount = rawJsonSecondary.split('\n').length
  const secondaryLineNumbers = Array.from(
    { length: secondaryLineCount },
    (_, index) => index + 1,
  )
  const mismatchLabels =
    parseError ||
    parseErrorSecondary ||
    isPrimaryEditorEmpty ||
    isSecondaryEditorEmpty
      ? []
      : getMismatchLabels(
          primaryComparableState.values,
          secondaryComparableState.values,
        )
  const editedMatchLabels =
    parseError ||
    parseErrorSecondary ||
    isPrimaryEditorEmpty ||
    isSecondaryEditorEmpty
      ? []
      : getEditedMatchLabels(primaryComparableState, secondaryComparableState)
  const primaryEditorHighlightStyle = buildEditorHighlightStyle(
    primaryEditorHighlight,
    primaryEditorScrollTop,
  )
  const secondaryEditorHighlightStyle = buildEditorHighlightStyle(
    secondaryEditorHighlight,
    secondaryEditorScrollTop,
  )
  const allCompactReferenceItems = mergeCompactItems(
    primarySnapshotItems,
    secondarySnapshotItems,
  )
  const compactReferenceItems = allCompactReferenceItems.filter(
    (item) => itemVisibilityByLabel[item.label] ?? false,
  )
  const canShowCompactReference =
    compactReferenceItems.length > 0 &&
    !parseError &&
    !parseErrorSecondary &&
    !isPrimaryEditorEmpty &&
    !isSecondaryEditorEmpty

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    window.localStorage.setItem(themeStorageKey, theme)
  }, [theme])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    window.localStorage.setItem(primaryJsonStorageKey, rawJson)
  }, [rawJson])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    window.localStorage.setItem(secondaryJsonStorageKey, rawJsonSecondary)
  }, [rawJsonSecondary])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    window.localStorage.setItem(
      itemVisibilityStorageKey,
      JSON.stringify(itemVisibilityByLabel),
    )
  }, [itemVisibilityByLabel])

  useEffect(() => {
    window.localStorage.setItem(
      editorsPanelExpandedStorageKey,
      String(isEditorsPanelExpanded),
    )
  }, [isEditorsPanelExpanded])

  useEffect(() => {
    window.localStorage.setItem(
      deploymentTablesExpandedStorageKey,
      String(isDeploymentTablesExpanded),
    )
  }, [isDeploymentTablesExpanded])

  useEffect(
    () => () => {
      if (dataModificationDebounceTimerRef.current !== null) {
        window.clearTimeout(dataModificationDebounceTimerRef.current)
      }

      if (dataModificationHideTimerRef.current !== null) {
        window.clearTimeout(dataModificationHideTimerRef.current)
      }

      if (compactReferenceAdditionTimerRef.current !== null) {
        window.clearTimeout(compactReferenceAdditionTimerRef.current)
      }
    },
    [],
  )

  useLayoutEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const panelElement = panelRef.current

    if (!panelElement) {
      return
    }

    const currentPanelElement = panelElement

    function syncPanelPlaceholderHeight() {
      setPanelPlaceholderHeight(currentPanelElement.getBoundingClientRect().height)
    }

    syncPanelPlaceholderHeight()

    const resizeObserver =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(() => {
            syncPanelPlaceholderHeight()
          })

    resizeObserver?.observe(currentPanelElement)
    window.addEventListener('resize', syncPanelPlaceholderHeight)

    return () => {
      resizeObserver?.disconnect()
      window.removeEventListener('resize', syncPanelPlaceholderHeight)
    }
  }, [rawJson, rawJsonSecondary, parseError, parseErrorSecondary])

  function handleRawJsonChange(nextRawJson: string) {
    setRawJson(nextRawJson)

    const result = parsePayload(nextRawJson)
    setParseError(result.error)
    setParsedJson(result.data)
  }

  function handleSecondaryRawJsonChange(nextRawJson: string) {
    setRawJsonSecondary(nextRawJson)

    const result = parsePayload(nextRawJson)
    setParseErrorSecondary(result.error)
    setParsedJsonSecondary(result.data)
  }

  function handlePrimaryEditorPaste(event: ClipboardEvent<HTMLTextAreaElement>) {
    const pastedText = event.clipboardData.getData('text')
    const formattedJson = formatStructuredJsonForEditor(pastedText)

    if (!formattedJson) {
      return
    }

    event.preventDefault()
    handleRawJsonChange(formattedJson)
    setPrimaryEditorHighlight(null)
    setPrimaryEditorScrollTop(0)

    window.requestAnimationFrame(() => {
      if (primaryEditorRef.current) {
        primaryEditorRef.current.scrollTop = 0
        primaryEditorRef.current.setSelectionRange(0, 0)
      }

      if (lineNumbersRef.current) {
        lineNumbersRef.current.scrollTop = 0
      }
    })
  }

  function handleSecondaryEditorPaste(event: ClipboardEvent<HTMLTextAreaElement>) {
    const pastedText = event.clipboardData.getData('text')
    const formattedJson = formatStructuredJsonForEditor(pastedText)

    if (!formattedJson) {
      return
    }

    event.preventDefault()
    handleSecondaryRawJsonChange(formattedJson)
    setSecondaryEditorHighlight(null)
    setSecondaryEditorScrollTop(0)

    window.requestAnimationFrame(() => {
      if (secondaryEditorRef.current) {
        secondaryEditorRef.current.scrollTop = 0
        secondaryEditorRef.current.setSelectionRange(0, 0)
      }

      if (secondaryLineNumbersRef.current) {
        secondaryLineNumbersRef.current.scrollTop = 0
      }
    })
  }

  function handleLineNumberClick(
    editorKind: 'primary' | 'secondary',
    lineNumber: number,
  ) {
    const textarea =
      editorKind === 'primary' ? primaryEditorRef.current : secondaryEditorRef.current
    const rawText = editorKind === 'primary' ? rawJson : rawJsonSecondary

    if (!textarea || rawText.trim().length === 0 || lineNumber < 1) {
      return
    }

    const lineRange = getLineSelectionRange(rawText, lineNumber)

    if (!lineRange) {
      return
    }

    const editorMetrics = getEditorLineMetrics(textarea)
    const visibleContentHeight = Math.max(
      0,
      textarea.clientHeight -
        editorMetrics.paddingTop -
        editorMetrics.paddingBottom,
    )
    const targetScrollTop = Math.max(
      0,
      editorMetrics.paddingTop +
        (lineNumber - 1) * editorMetrics.lineHeight -
        Math.max(0, (visibleContentHeight - editorMetrics.lineHeight) / 2),
    )

    if (editorKind === 'primary') {
      setPrimaryEditorHighlight({
        lineNumber,
        lineHeight: editorMetrics.lineHeight,
        paddingTop: editorMetrics.paddingTop,
      })
    } else {
      setSecondaryEditorHighlight({
        lineNumber,
        lineHeight: editorMetrics.lineHeight,
        paddingTop: editorMetrics.paddingTop,
      })
    }

    textarea.focus()
    textarea.scrollTo({
      top: targetScrollTop,
      behavior: 'smooth',
    })

    window.requestAnimationFrame(() => {
      textarea.setSelectionRange(lineRange.start, lineRange.end)
    })
  }

  function handleEditorScroll(event: React.UIEvent<HTMLTextAreaElement>) {
    if (lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = event.currentTarget.scrollTop
    }

    setPrimaryEditorScrollTop(event.currentTarget.scrollTop)
  }

  function handleSecondaryEditorScroll(event: React.UIEvent<HTMLTextAreaElement>) {
    if (secondaryLineNumbersRef.current) {
      secondaryLineNumbersRef.current.scrollTop = event.currentTarget.scrollTop
    }

    setSecondaryEditorScrollTop(event.currentTarget.scrollTop)
  }

  function handleClearPrimaryJson() {
    if (primaryEditorRef.current) {
      primaryEditorRef.current.scrollTop = 0
    }

    if (lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = 0
    }

    setRawJson('')
    setParseError(null)
    setParsedJson(null)
    setPrimaryEditorHighlight(null)
    setPrimaryEditorScrollTop(0)
    setPrimarySnapshotItems([])
  }

  function handleClearSecondaryJson() {
    if (secondaryEditorRef.current) {
      secondaryEditorRef.current.scrollTop = 0
    }

    if (secondaryLineNumbersRef.current) {
      secondaryLineNumbersRef.current.scrollTop = 0
    }

    setRawJsonSecondary('')
    setParseErrorSecondary(null)
    setParsedJsonSecondary(null)
    setSecondaryEditorHighlight(null)
    setSecondaryEditorScrollTop(0)
    setSecondarySnapshotItems([])
  }

  async function handlePasteFromClipboard(
    editorKind: 'primary' | 'secondary',
  ) {
    if (!navigator.clipboard?.readText) {
      const message = 'El navegador no permite leer el portapapeles.'

      if (editorKind === 'primary') {
        setParseError(message)
      } else {
        setParseErrorSecondary(message)
      }

      return
    }

    try {
      const clipboardText = await navigator.clipboard.readText()

      if (clipboardText.trim().length === 0) {
        const message = 'No hay texto disponible para pegar.'

        if (editorKind === 'primary') {
          setParseError(message)
        } else {
          setParseErrorSecondary(message)
        }

        return
      }

      const nextText =
        formatStructuredJsonForEditor(clipboardText) ?? clipboardText

      if (editorKind === 'primary') {
        handleRawJsonChange(nextText)
        setPrimaryEditorHighlight(null)
        setPrimaryEditorScrollTop(0)
      } else {
        handleSecondaryRawJsonChange(nextText)
        setSecondaryEditorHighlight(null)
        setSecondaryEditorScrollTop(0)
      }

      window.requestAnimationFrame(() => {
        const editor =
          editorKind === 'primary'
            ? primaryEditorRef.current
            : secondaryEditorRef.current
        const lineNumbersElement =
          editorKind === 'primary'
            ? lineNumbersRef.current
            : secondaryLineNumbersRef.current

        if (editor) {
          editor.scrollTop = 0
          editor.setSelectionRange(0, 0)
          editor.focus()
        }

        if (lineNumbersElement) {
          lineNumbersElement.scrollTop = 0
        }
      })
    } catch {
      const message = 'No se pudo acceder al portapapeles.'

      if (editorKind === 'primary') {
        setParseError(message)
      } else {
        setParseErrorSecondary(message)
      }
    }
  }

  function applyTheme(nextTheme: ThemeMode) {
    if (nextTheme === theme) {
      return
    }

    const transitionDocument = document as DocumentWithViewTransition

    if (transitionDocument.startViewTransition) {
      transitionDocument.startViewTransition(() => {
        flushSync(() => {
          setTheme(nextTheme)
        })
      })
      return
    }

    setTheme(nextTheme)
  }

  function toggleTheme() {
    applyTheme(theme === 'dark' ? 'light' : 'dark')
  }

  function queueDataModificationNotice(
    source: ExtractedDataModificationNotice['source'],
    change: Pick<
      ExtractedDataModificationNotice,
      'label' | 'value' | 'tone'
    >,
  ) {
    if (dataModificationDebounceTimerRef.current !== null) {
      window.clearTimeout(dataModificationDebounceTimerRef.current)
    }

    dataModificationDebounceTimerRef.current = window.setTimeout(() => {
      const noticeId = ++dataModificationNoticeIdRef.current

      setDataModificationNotice({
        id: noticeId,
        source,
        label: change.label,
        value: change.value,
        tone: change.tone,
      })
      dataModificationDebounceTimerRef.current = null

      if (dataModificationHideTimerRef.current !== null) {
        window.clearTimeout(dataModificationHideTimerRef.current)
      }

      dataModificationHideTimerRef.current = window.setTimeout(() => {
        setDataModificationNotice(null)
        dataModificationHideTimerRef.current = null
      }, 3300)
    }, 420)
  }

  function handleCompactReferenceValueChange(
    itemId: string,
    nextValue: string,
  ) {
    primaryController?.setValue(itemId, nextValue)
  }

  function handleItemVisibilityToggle(label: string) {
    const isCurrentlyVisible = itemVisibilityByLabel[label] ?? false
    const willBeVisible = !isCurrentlyVisible

    setItemVisibilityByLabel((currentState) => ({
      ...currentState,
      [label]: !(currentState[label] ?? false),
    }))

    const changedItem = allCompactReferenceItems.find(
      (item) => item.label === label,
    )

    if (!changedItem) {
      return
    }

    const noticeId = ++compactReferenceAdditionNoticeIdRef.current
    setCompactReferenceAdditionNotice({
      id: noticeId,
      label: changedItem.label,
      value: changedItem.value,
      tone: changedItem.tone,
      isVisible: willBeVisible,
    })

    if (compactReferenceAdditionTimerRef.current !== null) {
      window.clearTimeout(compactReferenceAdditionTimerRef.current)
    }

    compactReferenceAdditionTimerRef.current = window.setTimeout(() => {
      setCompactReferenceAdditionNotice(null)
      compactReferenceAdditionTimerRef.current = null
    }, 3300)
  }

  function handleValidationValuesReset(labels: ResettableCommandDataLabel[]) {
    const originalValues = getPrimaryComparableValues(parsedJson)

    for (const label of labels) {
      const item = primarySnapshotItems.find(
        (snapshotItem) => snapshotItem.label === label,
      )

      if (item) {
        const originalValue =
          label === 'INNERVLAN'
            ? formatComparableValue(
                readJsonPath(parsedJson, 'properties.innerVlanData'),
              )
            : originalValues[label] ?? ''

        primaryController?.setValue(item.id, originalValue)
      }
    }
  }

  return (
    <main className="app-shell app-shell--minimal">
      <Selector_Tema
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      <ExtractedDataModificationToast notice={dataModificationNotice} />
      <CompactReferenceAdditionToast
        notice={compactReferenceAdditionNotice}
      />

      <div className="workspace-stack">
        <section ref={panelRef} className="panel">
          <div className="panel__header">
            <div>
              <p className="panel__eyebrow">Entrada</p>
              <h2>Objetos JSON</h2>
            </div>
          </div>

          <p className="panel__text">
            Pega aqui el objeto principal y el complementario para seguir
            construyendo la interfaz.
          </p>

          <section
            className={`json-shared-panel json-shared-panel--editors ${
              isEditorsPanelExpanded ? '' : 'json-workspace--collapsed'
            }`}
          >
            <div className="json-shared-panel__header">
              <button
                type="button"
                className="json-workspace__disclosure"
                aria-expanded={isEditorsPanelExpanded}
                aria-controls="shared-json-editors-content"
                onClick={() =>
                  setIsEditorsPanelExpanded((currentValue) => !currentValue)
                }
              >
                <span
                  className="json-workspace__disclosure-icon"
                  aria-hidden="true"
                />
                <span className="json-shared-panel__heading-copy">
                  <span className="panel__eyebrow">Entrada JSON</span>
                  <strong>Editores de código</strong>
                </span>
              </button>
            </div>

            <div
              id="shared-json-editors-content"
              className="json-workspace__content"
              aria-hidden={!isEditorsPanelExpanded}
              inert={isEditorsPanelExpanded ? undefined : true}
            >
              <div className="json-workspace__content-inner">
                <div className="json-workspace-grid">
            <section className="json-workspace-primary">
              <section className="json-input-panel">
                <div className="json-input-panel__header">
                  <div className="json-input-panel__identity">
                    <span className="json-input-panel__emoji" aria-hidden="true">
                      🌍
                    </span>

                    <div className="json-input-panel__copy">
                      <p className="panel__eyebrow">Principal</p>
                      <h3>Objeto JSON blueplanet</h3>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="panel__pill panel__pill--action"
                    onClick={() =>
                      isPrimaryEditorEmpty
                        ? void handlePasteFromClipboard('primary')
                        : handleClearPrimaryJson()
                    }
                  >
                    {isPrimaryEditorEmpty ? 'Pegar' : 'Borrar todo'}
                  </button>
                </div>

                <div
                  className="json-workspace__content"
                >
                  <div className="json-workspace__content-inner">

                <div
                  className={`editor-shell ${
                    primaryEditorHighlight ? 'editor-shell--has-highlight' : ''
                  }`}
                  style={primaryEditorHighlightStyle}
                >
                  {primaryEditorHighlight ? (
                    <>
                      <div
                        className="editor-highlight editor-highlight--gutter"
                        aria-hidden="true"
                      />
                      <div
                        className="editor-highlight editor-highlight--code"
                        aria-hidden="true"
                      />
                    </>
                  ) : null}

                  <div
                    ref={lineNumbersRef}
                    className="editor-lines"
                    aria-hidden="true"
                  >
                    {lineNumbers.map((lineNumber) => (
                      <span
                        key={lineNumber}
                        className={`editor-lines__item ${
                          primaryEditorHighlight?.lineNumber === lineNumber
                            ? 'editor-lines__item--active'
                            : ''
                        }`}
                      >
                        {lineNumber}
                      </span>
                    ))}
                  </div>

                  <textarea
                    ref={primaryEditorRef}
                    className="json-editor"
                    value={rawJson}
                    spellCheck={false}
                    wrap="off"
                    aria-label="Objeto JSON blueplanet"
                    onChange={(event) => handleRawJsonChange(event.target.value)}
                    onPaste={handlePrimaryEditorPaste}
                    onScroll={handleEditorScroll}
                  />
                </div>

                <p
                  className={`editor-status ${
                    parseError ? 'editor-status--error' : 'editor-status--ok'
                  }`}
                >
                  {parseError
                    ? `JSON invalido: ${parseError}`
                    : isPrimaryEditorEmpty
                      ? 'Area limpia. Pega un JSON para continuar.'
                      : 'JSON valido. Listo para seguir construyendo.'}
                </p>

                  </div>
                </div>
              </section>
            </section>

            <section className="json-workspace-secondary">
              <section className="json-input-panel">
                <div className="json-input-panel__header">
                  <div className="json-input-panel__identity">
                    <span className="json-input-panel__emoji" aria-hidden="true">
                      🐝
                    </span>

                    <div className="json-input-panel__copy">
                      <p className="panel__eyebrow">Complementario</p>
                      <h3>Objeto JSON Beesion</h3>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="panel__pill panel__pill--action"
                    onClick={() =>
                      isSecondaryEditorEmpty
                        ? void handlePasteFromClipboard('secondary')
                        : handleClearSecondaryJson()
                    }
                  >
                    {isSecondaryEditorEmpty ? 'Pegar' : 'Borrar todo'}
                  </button>
                </div>

                <div
                  className="json-workspace__content"
                >
                  <div className="json-workspace__content-inner">

                <div
                  className={`editor-shell ${
                    secondaryEditorHighlight
                      ? 'editor-shell--has-highlight'
                      : ''
                  }`}
                  style={secondaryEditorHighlightStyle}
                >
                  {secondaryEditorHighlight ? (
                    <>
                      <div
                        className="editor-highlight editor-highlight--gutter"
                        aria-hidden="true"
                      />
                      <div
                        className="editor-highlight editor-highlight--code"
                        aria-hidden="true"
                      />
                    </>
                  ) : null}

                  <div
                    ref={secondaryLineNumbersRef}
                    className="editor-lines"
                    aria-hidden="true"
                  >
                    {secondaryLineNumbers.map((lineNumber) => (
                      <span
                        key={lineNumber}
                        className={`editor-lines__item ${
                          secondaryEditorHighlight?.lineNumber === lineNumber
                            ? 'editor-lines__item--active'
                            : ''
                        }`}
                      >
                        {lineNumber}
                      </span>
                    ))}
                  </div>

                  <textarea
                    ref={secondaryEditorRef}
                    className="json-editor"
                    value={rawJsonSecondary}
                    spellCheck={false}
                    wrap="off"
                    placeholder="Pega aqui el objeto JSON complementario."
                    aria-label="Objeto JSON complementario"
                    onChange={(event) =>
                      handleSecondaryRawJsonChange(event.target.value)
                    }
                    onPaste={handleSecondaryEditorPaste}
                    onScroll={handleSecondaryEditorScroll}
                  />
                </div>

                <p
                  className={`editor-status ${
                    parseErrorSecondary
                      ? 'editor-status--error'
                      : 'editor-status--ok'
                  }`}
                >
                  {parseErrorSecondary
                    ? `JSON invalido: ${parseErrorSecondary}`
                    : isSecondaryEditorEmpty
                      ? 'Area limpia. Pega el JSON complementario.'
                      : 'JSON valido. Listo para seguir construyendo.'}
                </p>

                  </div>
                </div>
              </section>
            </section>
                </div>
              </div>
            </div>
          </section>

          <section
            className={`json-shared-panel json-shared-panel--tables ${
              isDeploymentTablesExpanded ? '' : 'json-workspace--collapsed'
            }`}
          >
            <div className="json-shared-panel__header">
              <button
                type="button"
                className="json-workspace__disclosure"
                aria-expanded={isDeploymentTablesExpanded}
                aria-controls="shared-deployment-tables-content"
                onClick={() =>
                  setIsDeploymentTablesExpanded(
                    (currentValue) => !currentValue,
                  )
                }
              >
                <span
                  className="json-workspace__disclosure-icon"
                  aria-hidden="true"
                />
                <span className="json-shared-panel__heading-copy">
                  <span className="panel__eyebrow">Datos extraídos</span>
                  <strong>Tablas de despliegue</strong>
                </span>
              </button>
            </div>

            {!isDeploymentTablesExpanded ? (
              <WorkspaceAlertSummary
                source="both"
                primaryItems={primarySnapshotItems}
                secondaryItems={secondarySnapshotItems}
                mismatchLabels={mismatchLabels}
              />
            ) : null}

            <div
              id="shared-deployment-tables-content"
              className="json-workspace__content"
              aria-hidden={!isDeploymentTablesExpanded}
              inert={isDeploymentTablesExpanded ? undefined : true}
            >
              <div className="json-workspace__content-inner">
                <div className="data-panels-grid">
                  <ObtenerDataDelJasonOriginal
                    source={parsedJson}
                    sourceText={rawJson}
                    mismatchLabels={mismatchLabels}
                    editedMatchLabels={editedMatchLabels}
                    onControllerReady={setPrimaryController}
                    onComparableStateChange={setPrimaryComparableState}
                    onItemsSnapshotChange={setPrimarySnapshotItems}
                    visibilityByLabel={itemVisibilityByLabel}
                    onVisibilityToggle={handleItemVisibilityToggle}
                    onLineNumberClick={(lineNumber) =>
                      handleLineNumberClick('primary', lineNumber)
                    }
                    onValueModified={(change) =>
                      queueDataModificationNotice('blueplanet', change)
                    }
                    items={[
                      {
                        label: 'OLT',
                        propertyPath: 'properties.olt',
                      },
                      {
                        label: 'SLOT',
                        propertyPath: 'properties.slot',
                        tone: 'red',
                      },
                      {
                        label: 'PORT',
                        propertyPath: 'properties.port',
                        tone: 'green',
                      },
                      {
                        label: 'ONUID',
                        propertyPath: 'properties.logicalPort',
                        tone: 'blue',
                      },
                      {
                        label: 'PASSWORD',
                        propertyPath: 'properties.registrationTypeValue',
                        tone: 'yellow',
                      },
                      {
                        label: 'NETWORKVLAN',
                        propertyPath: 'properties.networkVlanData',
                        tone: 'orange',
                      },
                      {
                        label: 'INNERVLAN',
                        propertyPath: 'properties.innerVlanData',
                        tone: 'pink',
                      },
                      {
                        label: 'VLAN',
                        propertyPath: 'properties.ontVlanData',
                      },
                      {
                        label: 'PROFILEDATA',
                        propertyPath: 'properties.downOpticalProfileData',
                      },
                      {
                        label: 'VNO',
                        propertyPath: 'properties.vno',
                        lineSearchKey: 'vno',
                        formatValue: (value, source) =>
                          formatVnoValue(value, source),
                      },
                      {
                        label: 'ACCESID',
                        propertyPath: 'properties.accessId',
                      },
                      {
                        label: 'PRODUCTID',
                        propertyPath: 'properties.productId',
                      },
                    ]}
                  />

                  <ObtenerDataDelJasonComplementario
                    source={parsedJsonSecondary}
                    sourceText={rawJsonSecondary}
                    onControllerReady={setSecondaryController}
                    mismatchLabels={mismatchLabels}
                    editedMatchLabels={editedMatchLabels}
                    onComparableStateChange={setSecondaryComparableState}
                    onItemsSnapshotChange={setSecondarySnapshotItems}
                    visibilityByLabel={itemVisibilityByLabel}
                    onVisibilityToggle={handleItemVisibilityToggle}
                    onLineNumberClick={(lineNumber) =>
                      handleLineNumberClick('secondary', lineNumber)
                    }
                    onValueModified={(change) =>
                      queueDataModificationNotice('Beesion', change)
                    }
                  />
                </div>
              </div>
            </div>
          </section>
        </section>

        <CompactReferenceBar
          isVisible={canShowCompactReference}
          items={compactReferenceItems}
          highlightedLabel={highlightedDataLabel}
          onHighlightedLabelChange={setHighlightedDataLabel}
          onEditableValueChange={handleCompactReferenceValueChange}
          onVisibilityToggle={handleItemVisibilityToggle}
        />

        <OltReferencePanel ip={primaryComparableState.values.OLT} />

        <ValidationCommandsPanel
          ip={primaryComparableState.values.OLT}
          slot={primaryComparableState.values.SLOT}
          port={primaryComparableState.values.PORT}
          onuid={primaryComparableState.values.ONUID}
          highlightedLabel={highlightedDataLabel}
          onHighlightedLabelChange={setHighlightedDataLabel}
          dirtyLabels={[
            ...new Set([
              ...primaryComparableState.dirtyLabels,
              ...secondaryComparableState.dirtyLabels,
            ]),
          ]}
          onResetValues={handleValidationValuesReset}
          onPropertyValueChange={(source, itemId, nextValue) =>
            (source === 'primary'
              ? primaryController
              : secondaryController
            )?.setValue(itemId, nextValue)
          }
          onPropertyValueReset={(source, itemId, originalValue) =>
            (source === 'primary'
              ? primaryController
              : secondaryController
            )?.setValue(itemId, originalValue)
          }
          availableProperties={mergeCompactItems(
            primarySnapshotItems,
            secondarySnapshotItems,
          ).map((item) => ({
            label: item.label,
            value: item.value,
            tone: item.tone,
            itemId: item.id,
            isEditable: item.isEditable,
            isDirty: item.isDirty,
            originalValue: item.originalValue,
            source: primarySnapshotItems.some(
              (primaryItem) => primaryItem.label === item.label,
            )
              ? 'primary'
              : 'secondary',
          }))}
          tones={Object.fromEntries(
            primarySnapshotItems
              .filter((item) =>
                ['SLOT', 'PORT', 'ONUID'].includes(item.label),
              )
              .map((item) => [item.label, item.tone]),
          )}
        />

        <div
          className="panel-placeholder"
          style={{ height: `${panelPlaceholderHeight}px` }}
          aria-hidden="true"
        >
          <div className="panel-placeholder__header">
            <div className="panel-placeholder__eyebrow" />
            <div className="panel-placeholder__title" />
          </div>

          <div className="panel-placeholder__grid">
            <div className="panel-placeholder__column panel-placeholder__column--primary">
              <div className="panel-placeholder__block panel-placeholder__block--hero" />
              <div className="panel-placeholder__block panel-placeholder__block--status" />
              <div className="panel-placeholder__block panel-placeholder__block--table" />
            </div>

            <div className="panel-placeholder__column panel-placeholder__column--secondary">
              <div className="panel-placeholder__block panel-placeholder__block--hero" />
              <div className="panel-placeholder__block panel-placeholder__block--status" />
              <div className="panel-placeholder__block panel-placeholder__block--table" />
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

export default App
