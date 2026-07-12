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
import CompactReferenceBar from './components/CompactReferenceBar'
import ObtenerDataDelJasonComplementario from './components/ObtenerDataDelJasonComplementario'
import ObtenerDataDelJasonOriginal from './components/ObtenerDataDelJasonOriginal'
import Selector_Tema from './components/Selector_Tema'
import type {
  JsonItemController,
  JsonItemSnapshot,
} from './components/jsonCompactModels'

const sampleService = {
  id: 'c84f6b2f-7bde-11f1-823a-37f73621a399',
  label: 'OnNetService_CAI_ONT42000120202607060921553962223079',
  resourceTypeId: 'onnet.resourceTypes.OnNetInternetServiceCfs',
  productId: 'd7e48de0-fb66-11ee-970e-85b17a634b58',
  domainId: 'built-in',
  tenantId: '7bb0708c-f9c4-11ee-b10e-df6135db04cf',
  shared: false,
  subDomainId: '7fd5144c-552f-39a3-9464-08d3b9cfb251',
  properties: {
    productSpecification: 'RfsLogicalAccess',
    gemPortData: '2',
    olt: '10.37.55.210',
    accessId: 'c84f6b2f-7bde-11f1-823a-37f73621a399',
    innerVlanData: '1934',
    ontVlanData: '100',
    upOpticalProfileData: 'Speedy_500M',
    serviceIdData: '3892143670466',
    customerType: 'Residential',
    networkVlanData: '2032',
    downSpeedData: '512000',
    queuePriorityData: '0',
    activationTypeData: 'vlan-QnQ',
    shelf: '1',
    port: '10',
    registrationTypeValue: '9U7V0CQVD8',
    downOpticalProfileData: 'Speedy_500M',
    logicalPort: '35',
    ontType: 'GPON',
    productId: 'CAI_ONT42000120202607060921553962223079',
    upSpeedData: '512000',
    slot: '15',
    ontSrvprofile: 'ONT_4_ETH_1_FXS',
    vno: 'TDC',
    registrationType: 'PasswordID',
  },
  discovered: false,
  differences: [],
  desiredOrchState: 'active',
  orchState: 'active',
  reason: '',
  tags: {},
  providerData: {},
  updatedAt: '2026-07-09T21:42:40.519Z',
  createdAt: '2026-07-09T21:40:19.962Z',
  revision: 232048972,
  autoClean: false,
  updateState: 'successful',
  updateReason: '',
  updateCount: 11,
}

const sampleComplementaryService = {
  product: [
    {
      id: '9f4339bf-c9a1-4cb1-bba9-f9471c024743',
      name: 'CFS BA',
      startDate: '2026-07-09T21:40:26.453Z',
      productCharacteristic: [
        {
          name: 'Down_optical_profile',
          valueType: 'string',
          value: 'Speedy_500M',
        },
        {
          name: 'DownloadSpeed',
          valueType: 'string',
          value: '512000',
        },
        {
          name: 'Up_optical_profile',
          valueType: 'string',
          value: 'Speedy_500M',
        },
        {
          name: 'UploadSpeed',
          valueType: 'string',
          value: '512000',
        },
        {
          name: 'Network_VLAN_BA',
          valueType: 'string',
          value: '2032',
        },
        {
          name: 'ONT_VLAN_BA',
          valueType: 'string',
          value: '100',
        },
      ],
    },
  ],
  id: '0d75153c-ed54-497c-bbd9-2c4c2dbb13ce',
  externalId: 'CAI_ONT42000120202607060921553962223079',
  name: 'FTTH Access',
  orderDate: '2026-07-06T14:22:12.149933Z',
  startDate: '2026-07-09T21:40:19Z',
  place: [
    {
      id: 'ONNET.68547000.f4JucDEX1nyGfdoNF+sviccTVGUnndXcQGCt1b81v9qQmDSazaaicHafz59eOfH4LeUUfyb5pQH*am4L0zcHPg==',
      role: 'installationAddress',
      '@type': 'GeographicAddress',
    },
  ],
  productCharacteristic: [
    {
      name: 'serialId',
      valueType: 'string',
      value: '',
    },
    {
      name: 'typeOnt',
      valueType: 'string',
      value: 'ONT_4_ETH_1_FXS',
    },
    {
      name: 'MunicipalityCode',
      valueType: 'string',
      value: '68547',
    },
    {
      name: 'ActivationType',
      valueType: 'string',
      value: 'PasswordId',
    },
    {
      name: 'ProvisioningType',
      valueType: 'string',
      value: 'Automatic',
    },
    {
      name: 'ProductId',
      valueType: 'string',
      value: 'CAI_ONT42000120202607060921553962223079',
    },
    {
      name: 'DownloadSpeed',
      valueType: 'string',
      value: '512000',
    },
    {
      name: 'UploadSpeed',
      valueType: 'string',
      value: '512000',
    },
    {
      name: 'customerType',
      valueType: 'string',
      value: 'Residential',
    },
    {
      name: 'PonTechnology',
      valueType: 'string',
      value: 'GPON',
    },
    {
      name: 'CTOCoordinateX',
      valueType: 'string',
      value: '-73.05975622',
    },
    {
      name: 'CTOCoordinateY',
      valueType: 'string',
      value: '6.97043164',
    },
    {
      name: 'CTOType',
      valueType: 'single_line_text',
      value: '11',
    },
    {
      name: 'PortName',
      valueType: 'single_line_text',
      value: 'OUTPUT 0001',
    },
    {
      name: 'PortID',
      valueType: 'single_line_text',
      value: '0001',
    },
    {
      name: 'PasswordId',
      valueType: 'string',
      value: '9U7V0CQVD8',
    },
    {
      name: 'UIPCoordinateX',
      valueType: 'string',
      value: '-73.05995274',
    },
    {
      name: 'UIPCoordinateY',
      valueType: 'string',
      value: '6.97075259',
    },
    {
      name: 'UIPPlaceId',
      valueType: 'string',
      value: 'ONNET.68547000.f4JucDEX1nyGfdoNF+sviccTVGUnndXcQGCt1b81v9qQmDSazaaicHafz59eOfH4LeUUfyb5pQH*am4L0zcHPg==',
    },
    {
      name: 'OLTName',
      valueType: 'string',
      value: 'OH_SANALPSTC_I_7360',
    },
    {
      name: 'CTOName',
      valueType: 'string',
      value: 'PIEDE-PC2-99-07',
    },
    {
      name: 'SplitterID',
      valueType: 'string',
      value: 'SS2-99-07',
    },
    {
      name: 'SplitterPortName',
      valueType: 'string',
      value: 'OUTPUT 0001',
    },
    {
      name: 'CTOAccessPointType',
      valueType: 'string',
      value: '11',
    },
    {
      name: 'DropId',
      valueType: 'string',
      value: '',
    },
    {
      name: 'department',
      valueType: 'string',
      value: 'SANTANDER',
    },
    {
      name: 'onu_id',
      valueType: 'string',
      value: '35',
    },
    {
      name: 'shelf',
      valueType: 'string',
      value: 'Shelf Pos 1',
    },
    {
      name: 'device_name',
      valueType: 'string',
      value: 'OH_SANALPSTC_I_7360_Piedecuesta_3',
    },
    {
      name: 'card',
      valueType: 'string',
      value: '15',
    },
    {
      name: 'pluggable_name',
      valueType: 'string',
      value: 'C+ (SFP 10)',
    },
    {
      name: 'operational_zone',
      valueType: 'string',
      value: 'ORIENTE',
    },
    {
      name: 'region_name',
      valueType: 'string',
      value: 'ORIENTE',
    },
    {
      name: 'comune',
      valueType: 'string',
      value: 'PIEDECUESTA',
    },
    {
      name: 'polygon',
      valueType: 'string',
      value: 'SANTANDER (AREA METROPOLITANA 1)',
    },
    {
      name: 'cto_port_name',
      valueType: 'string',
      value: 'OUTPUT 0001',
    },
  ],
  productOffering: {
    id: 'Ftth',
    name: 'FTTH',
    '@baseType': 'OfferAgreement',
    '@type': 'Offer',
    '@referredType': '98',
  },
  productOrderItem: [
    {
      orderItemAction: 'ADD',
      orderItemId: '1',
      productOrderId: '390835aa-a6fa-49df-9b24-2f8d19ccc324',
      role: 'creator',
    },
    {
      orderItemAction: 'MODIFY',
      orderItemId: '1',
      productOrderId: '4378c5c7-a7a9-438c-aae4-cfad9551cdd7',
      role: 'modifier',
    },
  ],
  productSpecification: {
    id: 'FtthAccess',
    href: 'https://product-catalog-management.bss.svc.cluster.local/catalog/product/FtthAccess/?environment=PRODUCTION',
    name: 'FTTH Access',
    '@baseType': 'Specification',
    '@type': 'Product',
  },
  relatedParty: [
    {
      id: 'TDC',
      name: 'COLOMBIA TELECOMUNICACIONES SA ESP BIC',
      role: 'isp',
      '@referredType': 'CUSTOMER',
    },
  ],
  status: 'active',
}

const initialJson = JSON.stringify(sampleService, null, 2)
const initialComplementaryJson = JSON.stringify(sampleComplementaryService, null, 2)
const themeStorageKey = 'chinomatic-theme'
const primaryJsonStorageKey = 'chinomatic-primary-json'
const secondaryJsonStorageKey = 'chinomatic-secondary-json'

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
  const [primaryController, setPrimaryController] =
    useState<JsonItemController | null>(null)
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
  const compactReferenceItems = mergeCompactItems(
    primarySnapshotItems,
    secondarySnapshotItems,
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

  function handleCompactReferenceValueChange(
    itemId: string,
    nextValue: string,
  ) {
    primaryController?.setValue(itemId, nextValue)
  }

  return (
    <main className="app-shell app-shell--minimal">
      <Selector_Tema
        theme={theme}
        onSelectTheme={applyTheme}
        onToggleTheme={toggleTheme}
      />

      <section className="hero-panel hero-panel--minimal">
        <h1>Lectura operacional de Data.</h1>
      </section>

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
                    className={`panel__pill panel__pill--action ${
                      isPrimaryEditorEmpty ? 'panel__pill--hidden' : ''
                    }`}
                    onClick={handleClearPrimaryJson}
                    disabled={isPrimaryEditorEmpty}
                    tabIndex={isPrimaryEditorEmpty ? -1 : 0}
                    aria-hidden={isPrimaryEditorEmpty}
                  >
                    Borrar todo
                  </button>
                </div>

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
              </section>

              <div className="data-panels-grid">
                <ObtenerDataDelJasonOriginal
                  source={parsedJson}
                  sourceText={rawJson}
                  mismatchLabels={mismatchLabels}
                  editedMatchLabels={editedMatchLabels}
                  onControllerReady={setPrimaryController}
                  onComparableStateChange={setPrimaryComparableState}
                  onItemsSnapshotChange={setPrimarySnapshotItems}
                  onLineNumberClick={(lineNumber) =>
                    handleLineNumberClick('primary', lineNumber)
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
              </div>
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
                    className={`panel__pill panel__pill--action ${
                      isSecondaryEditorEmpty ? 'panel__pill--hidden' : ''
                    }`}
                    onClick={handleClearSecondaryJson}
                    disabled={isSecondaryEditorEmpty}
                    tabIndex={isSecondaryEditorEmpty ? -1 : 0}
                    aria-hidden={isSecondaryEditorEmpty}
                  >
                    Borrar todo
                  </button>
                </div>

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
              </section>

              <div className="data-panels-grid">
                <ObtenerDataDelJasonComplementario
                  source={parsedJsonSecondary}
                  sourceText={rawJsonSecondary}
                  mismatchLabels={mismatchLabels}
                  editedMatchLabels={editedMatchLabels}
                  onComparableStateChange={setSecondaryComparableState}
                  onItemsSnapshotChange={setSecondarySnapshotItems}
                  onLineNumberClick={(lineNumber) =>
                    handleLineNumberClick('secondary', lineNumber)
                  }
                />
              </div>
            </section>
          </div>
        </section>

        <CompactReferenceBar
          isVisible={canShowCompactReference}
          items={compactReferenceItems}
          onEditableValueChange={handleCompactReferenceValueChange}
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
