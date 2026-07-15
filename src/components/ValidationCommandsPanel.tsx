import {
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type KeyboardEvent,
} from 'react'
import { createPortal } from 'react-dom'
import validationRows from '../assets/_DATA/tables/validation_commands.json'
import searchRows from '../assets/_DATA/tables/search_commands.json'
import serialChangeRows from '../assets/_DATA/tables/serial_change_commands.json'
import passwordChangeRows from '../assets/_DATA/tables/password_change_commands.json'
import profileChangeRows from '../assets/_DATA/tables/profile_change_commands.json'
import deleteIgmpRows from '../assets/_DATA/tables/delete_igmp_commands.json'
import deleteVlanServiceRows from '../assets/_DATA/tables/delete_vlan_service_commands.json'
import { oltReferenceByIp } from '../assets/_DATA/oltReferenceLookup'
import CloneIcon from './CloneIcon'
import CommandLockToast, {
  type CommandLockNotice,
} from './CommandLockToast'
import CornerUpLeftIcon from './CornerUpLeftIcon'
import LockIcon from './LockIcon'
import LockSlashIcon from './LockSlashIcon'
import PlusIcon from './PlusIcon'
import PlusLargeIcon from './PlusLargeIcon'
import TrashIcon from './TrashIcon'
import type { DataItemTone } from './jsonToneShared'
import './ValidationCommandsPanel.css'

type Vendor = 'huawei' | 'nokia'
type CommandSection =
  | 'validation'
  | 'search'
  | 'serial-change'
  | 'password-change'
  | 'profile-change'
  | 'delete-igmp'
  | 'delete-vlan-service'
type CommandValueLabel =
  | 'SLOT'
  | 'PORT'
  | 'ONUID'
  | 'PASSWORD'
  | 'NETWORKVLAN'
  | 'INNERVLAN'
  | 'PROFILEDATA'
type CommandValues = Record<Lowercase<CommandValueLabel>, string>
type CommandTones = Record<CommandValueLabel, DataItemTone>
type CommandValueTransforms = Partial<
  Record<CommandValueLabel, (value: string) => string>
>
type AvailableCommandProperty = {
  label: string
  value: string
  tone: DataItemTone
  itemId?: string
  isEditable?: boolean
  isDirty?: boolean
  originalValue?: string
  source?: 'primary' | 'secondary'
}
type CommandPropertyTrigger = {
  start: number
  end: number
  query: string
}
type CustomCommandPart =
  | string
  | {
      index: number
      marker: string
      property: AvailableCommandProperty
    }
type ValidationCommand = {
  type: string
  template: string
  sourceFormula: string | null
}
type ValidationRow = {
  excelRow: number
  huawei: ValidationCommand | null
  nokia: ValidationCommand | null
}
type ValidationCommandsPanelProps = {
  ip?: string
  slot?: string
  port?: string
  onuid?: string
  tones?: Partial<CommandTones>
  highlightedLabel?: string | null
  onHighlightedLabelChange?: (label: string | null) => void
  dirtyLabels?: string[]
  onResetValues?: (labels: CommandValueLabel[]) => void
  availableProperties?: AvailableCommandProperty[]
  onPropertyValueChange?: (
    source: 'primary' | 'secondary',
    itemId: string,
    nextValue: string,
  ) => void
  onPropertyValueReset?: (
    source: 'primary' | 'secondary',
    itemId: string,
    originalValue: string,
  ) => void
}
type VendorOverride = {
  ip: string
  vendor: Vendor
}
type CommandOverrides = Record<string, string>
type PersonalCommand = {
  id: string
  scope: string
  vendor: Vendor
  section: CommandSection
  title: string
  baseline: string | null
  value: string
}

type CopiedCommandToast = {
  id: number
  value: string
}

type CommandLockDetails = {
  title: string
  command: string
}

const validationCommandRows = validationRows as ValidationRow[]
const searchCommandRows = searchRows as ValidationRow[]
const serialChangeCommandRows = serialChangeRows as ValidationRow[]
const passwordChangeCommandRows = passwordChangeRows as ValidationRow[]
const profileChangeCommandRows = profileChangeRows as ValidationRow[]
const deleteIgmpCommandRows = deleteIgmpRows as ValidationRow[]
const deleteVlanServiceCommandRows = deleteVlanServiceRows as ValidationRow[]
const commandOverridesStorageKey = 'chinomatic-validation-command-overrides-v1'
const personalCommandsStorageKey = 'chinomatic-personal-validation-commands-v1'
const lockedCommandsStorageKey = 'chinomatic-locked-validation-commands-v1'
const validationCommandsExpandedStorageKey =
  'chinomatic-validation-commands-expanded-v1'
const searchCommandsExpandedStorageKey = 'chinomatic-search-commands-expanded-v1'
const serialChangeCommandsExpandedStorageKey =
  'chinomatic-serial-change-commands-expanded-v1'
const passwordChangeCommandsExpandedStorageKey =
  'chinomatic-password-change-commands-expanded-v1'
const profileChangeCommandsExpandedStorageKey =
  'chinomatic-profile-change-commands-expanded-v1'
const deleteIgmpCommandsExpandedStorageKey =
  'chinomatic-delete-igmp-commands-expanded-v1'
const deleteVlanServiceCommandsExpandedStorageKey =
  'chinomatic-delete-vlan-service-commands-expanded-v1'
let nextCopiedCommandToastId = 0

const defaultCommandTones: CommandTones = {
  SLOT: 'red',
  PORT: 'green',
  ONUID: 'blue',
  PASSWORD: 'yellow',
  NETWORKVLAN: 'orange',
  INNERVLAN: 'pink',
  PROFILEDATA: 'violet',
}

const commandTitles: Record<Vendor, Record<number, string>> = {
  huawei: {
    19: 'Habilitar acceso',
    20: 'Configuración',
    22: 'Tarjeta y puerto',
    23: 'Configuración ONT',
    24: 'Interfaz GPON',
    25: 'Información ONT',
    26: 'Potencia óptica',
    27: 'Puertos de servicio',
    28: 'Servicio IPTV',
    29: 'VLAN IPTV',
    30: 'Dirección MAC',
  },
  nokia: {
    19: 'Inhibir alarmas',
    21: 'Ranuras del equipo',
    22: 'Estado ONT',
    23: 'Configuración ONT',
    27: 'Puerto bridge',
    28: 'Canal IGMP',
    29: 'Detalle interfaz',
    30: 'Configuración QoS',
    31: 'Tabla MAC VLAN',
  },
}

const searchCommandTitles: Record<Vendor, Record<number, string>> = {
  huawei: {
    34: 'Buscar VLAN',
    35: 'MAC por VLAN',
    36: 'Listar VLAN',
    37: 'VLAN del puerto',
    38: 'ONT sin registrar',
    39: 'Buscar por serial',
    40: 'Buscar por password',
    41: 'Resumen ONT',
  },
  nokia: {
    34: 'Buscar bridge',
    35: 'Buscar VLAN',
    36: 'Buscar servicio',
    38: 'ONT sin registrar',
    39: 'Servicios activos',
    41: 'Datos operativos ONT',
    42: 'Uso perfiles QoS',
  },
}

const serialChangeCommandTitles: Record<Vendor, Record<number, string>> = {
  huawei: {
    45: 'Configuración',
    46: 'Interfaz GPON',
    47: 'Modificar serial',
  },
  nokia: {
    45: 'Desactivar ONT',
    46: 'Cambiar serial',
    47: 'Activar ONT',
  },
}

const passwordChangeCommandTitles: Record<Vendor, Record<number, string>> = {
  huawei: {},
  nokia: {
    49: 'Desactivar ONT',
    50: 'Cambiar password',
    51: 'Activar ONT',
  },
}

const profileChangeCommandTitles: Record<Vendor, Record<number, string>> = {
  huawei: {},
  nokia: {
    53: 'Cambiar perfil',
    54: 'Confirmar cambio',
  },
}

const deleteIgmpCommandTitles: Record<Vendor, Record<number, string>> = {
  huawei: {
    56: 'Modo BTV',
    57: 'Servicio IGMP',
    58: 'Confirmar',
    59: 'Salir',
  },
  nokia: {
    56: 'Desactivar ONT',
    57: 'Eliminar ONT',
  },
}

const deleteVlanServiceCommandTitles: Record<
  Vendor,
  Record<number, string>
> = {
  huawei: {
    61: 'Servicio VLAN 7526',
    62: 'Servicio VLAN 7527',
    63: 'Servicio VLAN 7530',
    64: 'Interfaz GPON',
    65: 'Eliminar ONT',
  },
  nokia: {},
}

function readStoredCommandOverrides(): CommandOverrides {
  if (typeof window === 'undefined') {
    return {}
  }

  try {
    const parsedValue = JSON.parse(
      window.localStorage.getItem(commandOverridesStorageKey) ?? '{}',
    )

    if (!parsedValue || typeof parsedValue !== 'object') {
      return {}
    }

    return Object.fromEntries(
      Object.entries(parsedValue).filter(
        (entry): entry is [string, string] => typeof entry[1] === 'string',
      ),
    )
  } catch {
    return {}
  }
}

function readStoredPersonalCommands(): PersonalCommand[] {
  if (typeof window === 'undefined') {
    return []
  }

  try {
    const parsedValue: unknown = JSON.parse(
      window.localStorage.getItem(personalCommandsStorageKey) ?? '[]',
    )

    if (!Array.isArray(parsedValue)) {
      return []
    }

    return parsedValue.flatMap((command) => {
      if (!command || typeof command !== 'object') {
        return []
      }

      const candidate = command as Partial<PersonalCommand>

      if (
        typeof candidate.id !== 'string' ||
        typeof candidate.scope !== 'string' ||
        (candidate.vendor !== 'nokia' && candidate.vendor !== 'huawei') ||
        (candidate.baseline !== null &&
          typeof candidate.baseline !== 'string') ||
        typeof candidate.value !== 'string'
      ) {
        return []
      }

      return [
        {
          id: candidate.id,
          scope: candidate.scope,
          vendor: candidate.vendor,
          section:
            candidate.section === 'search' ||
            candidate.section === 'serial-change' ||
            candidate.section === 'password-change' ||
            candidate.section === 'profile-change' ||
            candidate.section === 'delete-igmp' ||
            candidate.section === 'delete-vlan-service'
              ? candidate.section
              : 'validation',
          title:
            typeof candidate.title === 'string'
              ? candidate.title.slice(0, 20)
              : '',
          baseline: candidate.baseline,
          value: candidate.value,
        },
      ]
    })
  } catch {
    return []
  }
}

function readStoredCommandsExpanded(storageKey: string): boolean {
  if (typeof window === 'undefined') {
    return true
  }

  const storedValue = window.localStorage.getItem(storageKey)

  return storedValue === null ? true : storedValue === 'true'
}

function readStoredLockedCommands(): Set<string> {
  if (typeof window === 'undefined') {
    return new Set()
  }

  try {
    const storedValue = window.localStorage.getItem(lockedCommandsStorageKey)
    const parsedValue = storedValue ? JSON.parse(storedValue) : []

    return new Set(
      Array.isArray(parsedValue)
        ? parsedValue.filter((value): value is string => typeof value === 'string')
        : [],
    )
  } catch {
    return new Set()
  }
}

function getVisibleCommandRows(container: ParentNode): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      '[data-command-navigation="true"]',
    ),
  ).filter(
    (commandRow) =>
      commandRow.closest('.validation-commands__content')?.getAttribute(
        'aria-hidden',
      ) !== 'true',
  )
}

function getAdjacentSectionCommandRow(
  currentGroup: Element,
  direction: -1 | 1,
): HTMLElement | null {
  const commandsPanel = currentGroup.closest('.validation-commands')

  if (!commandsPanel) {
    return null
  }

  const groups = Array.from(
    commandsPanel.querySelectorAll<HTMLElement>(
      '.validation-commands__group',
    ),
  )
  const currentGroupIndex = groups.indexOf(currentGroup as HTMLElement)

  for (
    let groupIndex = currentGroupIndex + direction;
    groupIndex >= 0 && groupIndex < groups.length;
    groupIndex += direction
  ) {
    const commandRows = getVisibleCommandRows(groups[groupIndex])

    if (commandRows.length > 0) {
      return direction === 1
        ? commandRows[0]
        : commandRows[commandRows.length - 1]
    }
  }

  return null
}

function createPersonalCommandId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function formatNokiaSerial(value: string): string {
  if (!value) {
    return value
  }

  return `${value.slice(0, 4)}:${value.slice(-8)}`
}

function findCommandPropertyTrigger(
  value: string,
  cursorPosition: number | null,
): CommandPropertyTrigger | null {
  if (cursorPosition === null) {
    return null
  }

  const textBeforeCursor = value.slice(0, cursorPosition)
  const match = textBeforeCursor.match(/::ADD(?:\(([^)]*)?)?$/i)

  if (!match) {
    return null
  }

  return {
    start: cursorPosition - match[0].length,
    end: cursorPosition,
    query: match[1] ?? '',
  }
}

function buildCustomCommandParts(
  commandText: string,
  availableProperties: AvailableCommandProperty[],
): CustomCommandPart[] {
  const propertiesByLabel = new Map(
    availableProperties.map((property) => [
      property.label.toUpperCase(),
      property,
    ]),
  )
  const parts: CustomCommandPart[] = []
  const markerPattern = /::ADD\(([^)]+)\)/gi
  let plainTextStart = 0
  let match: RegExpExecArray | null

  while ((match = markerPattern.exec(commandText)) !== null) {
    const property = propertiesByLabel.get(match[1].toUpperCase())

    if (!property) {
      continue
    }

    if (plainTextStart < match.index) {
      parts.push(commandText.slice(plainTextStart, match.index))
    }

    parts.push({ index: match.index, marker: match[0], property })
    plainTextStart = match.index + match[0].length
  }

  parts.push(commandText.slice(plainTextStart))

  return parts
}

function resolveCustomCommandText(
  commandText: string,
  availableProperties: AvailableCommandProperty[],
  valueTransforms: CommandValueTransforms = {},
): string {
  const propertiesByLabel = new Map(
    availableProperties.map((property) => [
      property.label.toUpperCase(),
      property,
    ]),
  )

  return commandText.replace(
    /::ADD\(([^)]+)\)/gi,
    (marker, propertyLabel: string) => {
      const normalizedLabel = propertyLabel.toUpperCase()
      const property = propertiesByLabel.get(normalizedLabel)

      if (!property) {
        return marker
      }

      const valueTransform =
        valueTransforms[normalizedLabel as CommandValueLabel]
      return valueTransform?.(property.value) ?? property.value
    },
  )
}

function commandTemplateToEditorText(template: string): string {
  return template.replace(
    /\{(slot|port|onuid|password|networkvlan|innervlan|profiledata)\}/g,
    (_, valueKey: keyof CommandValues) => `::ADD(${valueKey.toUpperCase()})`,
  )
}

function getCommandTemplate(
  command: ValidationCommand,
  row: number,
  vendor: Vendor,
  values: CommandValues,
): string {
  if (vendor === 'huawei' && row === 22) {
    const separator = Number(values.slot) < 10 ? '0/ ' : '0/'
    return `display board 0/{slot} | begin ${separator}{slot}/{port}`
  }

  return command.template
}

function compileCommandText(
  template: string,
  values: CommandValues,
  valueTransforms: CommandValueTransforms = {},
): string {
  return template.replace(
    /\{(slot|port|onuid|password|networkvlan|innervlan|profiledata)\}/g,
    (_, valueKey: keyof CommandValues) => {
      const label = valueKey.toUpperCase() as CommandValueLabel
      return valueTransforms[label]?.(values[valueKey]) ?? values[valueKey]
    },
  )
}

function getCommandLabels(template: string): CommandValueLabel[] {
  return Array.from(
    new Set(
      Array.from(
        template.matchAll(
          /\{(slot|port|onuid|password|networkvlan|innervlan|profiledata)\}/g,
        ),
      ).map(
        (match) => match[1].toUpperCase() as CommandValueLabel,
      ),
    ),
  )
}

function getReferencedCommandProperties(
  template: string,
  commandText: string,
  availableProperties: AvailableCommandProperty[],
): AvailableCommandProperty[] {
  const referencedLabels = new Set<string>(getCommandLabels(template))

  for (const match of commandText.matchAll(/::ADD\(([^)]+)\)/gi)) {
    referencedLabels.add(match[1].toUpperCase())
  }

  return availableProperties.filter((property) =>
    referencedLabels.has(property.label.toUpperCase()),
  )
}

function CommandEditor({
  commandText,
  template,
  row,
  values,
  tones,
  isCustomized,
  highlightedLabel,
  onHighlightedLabelChange,
  dirtyLabels,
  onCommandChange,
  availableProperties,
  initiallyEditing = false,
  onEditingComplete,
  onPropertyValueChange,
  valueTransforms = {},
}: {
  commandText: string
  template: string
  row: number | string
  values: CommandValues
  tones: CommandTones
  isCustomized: boolean
  highlightedLabel?: string | null
  onHighlightedLabelChange?: (label: string | null) => void
  dirtyLabels: Set<string>
  onCommandChange: (value: string) => void
  availableProperties: AvailableCommandProperty[]
  initiallyEditing?: boolean
  onEditingComplete?: (value: string) => void
  onPropertyValueChange?: (
    source: 'primary' | 'secondary',
    itemId: string,
    nextValue: string,
  ) => void
  valueTransforms?: CommandValueTransforms
}) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const activePropertyRef = useRef<HTMLButtonElement | null>(null)
  const initialCursorPositionRef = useRef(commandText.length)
  const cancelPropertyEditRef = useRef(false)
  const [isEditing, setIsEditing] = useState(initiallyEditing)
  const [editingPropertyKey, setEditingPropertyKey] = useState<string | null>(
    null,
  )
  const [propertyDraftValue, setPropertyDraftValue] = useState('')
  const [propertyTrigger, setPropertyTrigger] =
    useState<CommandPropertyTrigger | null>(null)
  const [activePropertyIndex, setActivePropertyIndex] = useState(0)
  const parts = template.split(
    /(\{(?:slot|port|onuid|password|networkvlan|innervlan|profiledata)\})/g,
  )
  const semanticParts = buildCustomCommandParts(
    commandText,
    availableProperties,
  )
  const filteredProperties = propertyTrigger
    ? availableProperties.filter((property) =>
        property.label
          .toLowerCase()
          .includes(propertyTrigger.query.toLowerCase()),
      )
    : []

  useEffect(() => {
    if (!initiallyEditing) {
      return
    }

    const animationFrame = window.requestAnimationFrame(() => {
      inputRef.current?.focus()
      inputRef.current?.setSelectionRange(
        initialCursorPositionRef.current,
        initialCursorPositionRef.current,
      )
    })

    return () => window.cancelAnimationFrame(animationFrame)
  }, [initiallyEditing])

  useEffect(() => {
    activePropertyRef.current?.scrollIntoView({
      block: 'nearest',
      inline: 'nearest',
    })
  }, [activePropertyIndex, propertyTrigger?.query])

  function updatePropertyTrigger(value: string, cursorPosition: number | null) {
    setPropertyTrigger(findCommandPropertyTrigger(value, cursorPosition))
    setActivePropertyIndex(0)
  }

  function insertProperty(property: AvailableCommandProperty) {
    if (!propertyTrigger) {
      return
    }

    const propertyMarker = `::ADD(${property.label.toUpperCase()})`
    const nextCommandText = `${commandText.slice(0, propertyTrigger.start)}${propertyMarker}${commandText.slice(propertyTrigger.end)}`
    const nextCursorPosition = propertyTrigger.start + propertyMarker.length

    onCommandChange(nextCommandText)
    setPropertyTrigger(null)

    window.requestAnimationFrame(() => {
      inputRef.current?.focus()
      inputRef.current?.setSelectionRange(
        nextCursorPosition,
        nextCursorPosition,
      )
    })
  }

  function openPropertyPickerAtCursor() {
    const selectionStart = inputRef.current?.selectionStart ?? commandText.length
    const selectionEnd = inputRef.current?.selectionEnd ?? selectionStart
    const propertyTriggerText = '::ADD'
    const nextCommandText = `${commandText.slice(0, selectionStart)}${propertyTriggerText}${commandText.slice(selectionEnd)}`
    const nextCursorPosition = selectionStart + propertyTriggerText.length

    onCommandChange(nextCommandText)
    setPropertyTrigger({
      start: selectionStart,
      end: nextCursorPosition,
      query: '',
    })
    setActivePropertyIndex(0)

    window.requestAnimationFrame(() => {
      inputRef.current?.focus()
      inputRef.current?.setSelectionRange(
        nextCursorPosition,
        nextCursorPosition,
      )
    })
  }

  function beginPropertyEdit(
    propertyKey: string,
    property: AvailableCommandProperty,
  ) {
    if (!property.itemId || !property.isEditable || !onPropertyValueChange) {
      return
    }

    cancelPropertyEditRef.current = false
    setPropertyDraftValue(property.value)
    setEditingPropertyKey(propertyKey)
  }

  function beginCommandEditing() {
    setIsEditing(true)
    window.requestAnimationFrame(() => {
      inputRef.current?.focus()
      inputRef.current?.setSelectionRange(
        commandText.length,
        commandText.length,
      )
    })
  }

  function renderPropertyToken(
    propertyKey: string,
    property: AvailableCommandProperty,
    displayValue: string,
  ) {
    const isPropertyEditable = Boolean(
      property.itemId &&
        property.isEditable &&
        property.source &&
        onPropertyValueChange,
    )

    if (editingPropertyKey === propertyKey && isPropertyEditable) {
      return (
        <input
          key={propertyKey}
          type="text"
          className={`validation-commands__value-token validation-commands__value-token--${property.tone} validation-commands__value-token-editor`}
          value={propertyDraftValue}
          size={Math.max(propertyDraftValue.length, 1)}
          aria-label={`Editar propiedad ${property.label}`}
          autoFocus
          onFocus={(event) => event.currentTarget.select()}
          onDoubleClick={(event) => event.stopPropagation()}
          onChange={(event) => setPropertyDraftValue(event.currentTarget.value)}
          onBlur={() => {
            if (!cancelPropertyEditRef.current) {
              onPropertyValueChange?.(
                property.source as 'primary' | 'secondary',
                property.itemId as string,
                propertyDraftValue,
              )
            }

            cancelPropertyEditRef.current = false
            setEditingPropertyKey(null)
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              event.currentTarget.blur()
            } else if (event.key === 'Escape') {
              event.preventDefault()
              cancelPropertyEditRef.current = true
              event.currentTarget.blur()
            }
          }}
        />
      )
    }

    return (
      <span
        key={propertyKey}
        className={`validation-commands__value-token validation-commands__value-token--${property.tone} ${
          isPropertyEditable
            ? 'validation-commands__value-token--editable'
            : ''
        } ${
          highlightedLabel === property.label
            ? 'validation-commands__value-token--highlighted'
            : ''
        } ${
          dirtyLabels.has(property.label)
            ? 'validation-commands__value-token--dirty'
            : ''
        }`}
        title={
          isPropertyEditable
            ? `${property.label}: ${property.value}. Clic para editar.`
            : `${property.label}: ${property.value}`
        }
        onMouseEnter={() => onHighlightedLabelChange?.(property.label)}
        onMouseLeave={() => onHighlightedLabelChange?.(null)}
        onClick={() => beginPropertyEdit(propertyKey, property)}
        onDoubleClick={(event) => event.stopPropagation()}
      >
        {displayValue}
      </span>
    )
  }

  function renderSemanticCommand(showMarkers: boolean) {
    if (!commandText) {
      return 'Linea vacia'
    }

    return semanticParts.map((part) => {
      if (typeof part === 'string') {
        return part
      }

      const { marker, property } = part
      const propertyValueTransform =
        valueTransforms[property.label.toUpperCase() as CommandValueLabel]

      return renderPropertyToken(
        `custom-${property.label}-${part.index}`,
        property,
        showMarkers
          ? marker
          : propertyValueTransform?.(property.value) ?? property.value,
      )
    })
  }

  return (
    <div
      className={`validation-commands__editor-shell ${
        isEditing ? 'validation-commands__editor-shell--editing' : ''
      }`}
      title={isEditing ? undefined : 'Doble clic para editar el comando'}
      onDoubleClick={beginCommandEditing}
    >
      <code className="validation-commands__command-preview" aria-hidden="true">
        {isEditing
          ? renderSemanticCommand(true)
          : isCustomized
            ? renderSemanticCommand(false)
          : parts.map((part, index) => {
              const valueKey = part.match(
                /^\{(slot|port|onuid|password|networkvlan|innervlan|profiledata)\}$/,
              )?.[1] as keyof CommandValues | undefined

              if (!valueKey) {
                return part
              }

              const label = valueKey.toUpperCase() as CommandValueLabel
              const displayCommandValue =
                valueTransforms[label]?.(values[valueKey]) ?? values[valueKey]
              const property = availableProperties.find(
                (availableProperty) => availableProperty.label === label,
              )

              if (property) {
                return renderPropertyToken(
                  `${valueKey}-${index}`,
                  { ...property, tone: tones[label] },
                  displayCommandValue,
                )
              }

              return (
                <span
                  key={`${valueKey}-${index}`}
                  className={`validation-commands__value-token validation-commands__value-token--${tones[label]} ${
                    highlightedLabel === label
                      ? 'validation-commands__value-token--highlighted'
                      : ''
                  } ${
                    dirtyLabels.has(label)
                      ? 'validation-commands__value-token--dirty'
                      : ''
                  }`}
                  title={`${label}: ${displayCommandValue}`}
                  onMouseEnter={() => onHighlightedLabelChange?.(label)}
                  onMouseLeave={() => onHighlightedLabelChange?.(null)}
                >
                  {displayCommandValue}
                </span>
              )
            })}
      </code>
      <input
        ref={inputRef}
        type="text"
        className="validation-commands__command-input"
        role="combobox"
        aria-autocomplete="list"
        aria-label={`Editar comando completo de la fila ${row}`}
        aria-expanded={filteredProperties.length > 0}
        aria-controls={`validation-command-properties-${row}`}
        autoComplete="off"
        readOnly={!isEditing}
        tabIndex={isEditing ? 0 : -1}
        value={commandText}
        onFocus={() => {
          if (!isEditing) {
            beginCommandEditing()
          }
        }}
        onChange={(event) => {
          onCommandChange(event.currentTarget.value)
          updatePropertyTrigger(
            event.currentTarget.value,
            event.currentTarget.selectionStart,
          )
        }}
        onClick={(event) =>
          updatePropertyTrigger(
            event.currentTarget.value,
            event.currentTarget.selectionStart,
          )
        }
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault()
            setPropertyTrigger(null)
            setIsEditing(false)
            event.currentTarget.blur()
            return
          }

          if (event.key === 'Enter' && filteredProperties.length === 0) {
            event.preventDefault()
            const currentRow = event.currentTarget.closest<HTMLElement>(
              '.validation-commands__item',
            )

            event.currentTarget.blur()
            window.requestAnimationFrame(() => currentRow?.focus())
            return
          }

          if (filteredProperties.length === 0) {
            return
          }

          if (event.key === 'ArrowDown') {
            event.preventDefault()
            setActivePropertyIndex(
              (currentIndex) =>
                (currentIndex + 1) % filteredProperties.length,
            )
          } else if (event.key === 'ArrowUp') {
            event.preventDefault()
            setActivePropertyIndex(
              (currentIndex) =>
                (currentIndex - 1 + filteredProperties.length) %
                filteredProperties.length,
            )
          } else if (event.key === 'Enter') {
            event.preventDefault()
            const activeProperty = filteredProperties[activePropertyIndex]

            if (activeProperty) {
              insertProperty(activeProperty)
            }
          }
        }}
        onKeyUp={(event) => {
          if (
            !['ArrowDown', 'ArrowUp', 'Enter', 'Escape'].includes(event.key)
          ) {
            updatePropertyTrigger(
              event.currentTarget.value,
              event.currentTarget.selectionStart,
            )
          }
        }}
        onBlur={(event) => {
          setPropertyTrigger(null)
          setIsEditing(false)

          const nextFocusedElement = event.relatedTarget
          const currentRow = event.currentTarget.closest(
            '.validation-commands__item',
          )

          if (
            nextFocusedElement instanceof HTMLElement &&
            currentRow?.contains(nextFocusedElement)
          ) {
            return
          }

          onEditingComplete?.(commandText)
        }}
        onScroll={(event) => {
          const preview = event.currentTarget.previousElementSibling

          if (preview instanceof HTMLElement) {
            preview.scrollLeft = event.currentTarget.scrollLeft
          }
        }}
      />
      {isEditing ? (
        <button
          type="button"
          className="validation-commands__insert-property"
          aria-label={`Agregar propiedad en la fila ${row}`}
          aria-haspopup="listbox"
          onMouseDown={(event) => event.preventDefault()}
          onClick={openPropertyPickerAtCursor}
        >
          <PlusIcon className="validation-commands__insert-property-icon" />
          <span>Agregar propiedad</span>
        </button>
      ) : null}
      {filteredProperties.length > 0 ? (
        <div
          id={`validation-command-properties-${row}`}
          className="validation-commands__property-menu"
          role="listbox"
          aria-label={`Propiedades disponibles para la fila ${row}`}
        >
          {filteredProperties.map((property, propertyIndex) => (
            <button
              key={property.label}
              ref={
                propertyIndex === activePropertyIndex
                  ? activePropertyRef
                  : undefined
              }
              type="button"
              className={`validation-commands__property-option validation-commands__property-option--${property.tone} ${
                propertyIndex === activePropertyIndex
                  ? 'validation-commands__property-option--active'
                  : ''
              }`}
              role="option"
              aria-selected={propertyIndex === activePropertyIndex}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => insertProperty(property)}
            >
              <span
                className="validation-commands__property-option-dot"
                aria-hidden="true"
              />
              <span className="validation-commands__property-option-label">
                {property.label}
              </span>
              <span
                className="validation-commands__property-option-value"
                title={property.value}
              >
                {property.value || 'Sin dato'}
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function VendorTable({
  vendor,
  commandSection,
  commandRows,
  commandTitleMap,
  values,
  tones,
  highlightedLabel,
  onHighlightedLabelChange,
  dirtyLabels,
  onResetValues,
  commandScope,
  commandOverrides,
  onCommandChange,
  onCommandReset,
  availableProperties,
  personalCommands,
  onPersonalCommandAdd,
  onPersonalCommandTitleChange,
  onPersonalCommandChange,
  onPersonalCommandComplete,
  onPersonalCommandReset,
  onPersonalCommandDelete,
  isExpanded,
  lockedCommandKeys,
  onToggleCommandLock,
  onPropertyValueChange,
  onPropertyValueReset,
}: {
  vendor: Vendor
  commandSection: CommandSection
  commandRows: ValidationRow[]
  commandTitleMap: Record<Vendor, Record<number, string>>
  values: CommandValues
  tones: CommandTones
  highlightedLabel?: string | null
  onHighlightedLabelChange?: (label: string | null) => void
  dirtyLabels: Set<string>
  onResetValues?: (labels: CommandValueLabel[]) => void
  commandScope: string
  commandOverrides: CommandOverrides
  onCommandChange: (commandKey: string, value: string) => void
  onCommandReset: (commandKey: string) => void
  availableProperties: AvailableCommandProperty[]
  personalCommands: PersonalCommand[]
  onPersonalCommandAdd: (vendor: Vendor, section: CommandSection) => void
  onPersonalCommandTitleChange: (commandId: string, title: string) => void
  onPersonalCommandChange: (commandId: string, value: string) => void
  onPersonalCommandComplete: (commandId: string, value: string) => void
  onPersonalCommandReset: (commandId: string) => void
  onPersonalCommandDelete: (commandId: string) => void
  isExpanded: boolean
  lockedCommandKeys: Set<string>
  onToggleCommandLock: (
    commandKey: string,
    details: CommandLockDetails,
  ) => void
  onPropertyValueChange?: (
    source: 'primary' | 'secondary',
    itemId: string,
    nextValue: string,
  ) => void
  onPropertyValueReset?: (
    source: 'primary' | 'secondary',
    itemId: string,
    originalValue: string,
  ) => void
}) {
  const label = vendor === 'huawei' ? 'Huawei' : 'Nokia'
  const [copiedCommandKey, setCopiedCommandKey] = useState<string | null>(null)
  const [copiedCommandToasts, setCopiedCommandToasts] = useState<
    CopiedCommandToast[]
  >([])
  const copiedCommandToastTimersRef = useRef(
    new Map<number, number>(),
  )
  const copiedCommandTimerRef = useRef<number | null>(null)
  const navigationAudioContextRef = useRef<AudioContext | null>(null)
  const commands = commandRows.flatMap((row) => {
    const command = row[vendor]
    return command ? [{ command, excelRow: row.excelRow }] : []
  })

  useEffect(
    () => () => {
      if (copiedCommandTimerRef.current !== null) {
        window.clearTimeout(copiedCommandTimerRef.current)
      }

      for (const timer of copiedCommandToastTimersRef.current.values()) {
        window.clearTimeout(timer)
      }

      copiedCommandToastTimersRef.current.clear()

      void navigationAudioContextRef.current?.close()
    },
    [],
  )

  function playNavigationSound(direction: -1 | 1) {
    const audioContext =
      navigationAudioContextRef.current ?? new window.AudioContext()
    navigationAudioContextRef.current = audioContext

    if (audioContext.state === 'suspended') {
      void audioContext.resume()
    }

    const now = audioContext.currentTime
    const oscillator = audioContext.createOscillator()
    const gain = audioContext.createGain()

    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(direction === 1 ? 520 : 460, now)
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(0.022, now + 0.006)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05)
    oscillator.connect(gain)
    gain.connect(audioContext.destination)
    oscillator.start(now)
    oscillator.stop(now + 0.055)
  }

  function playCopiedFeedbackSound() {
    const audioContext =
      navigationAudioContextRef.current ?? new window.AudioContext()
    navigationAudioContextRef.current = audioContext

    if (audioContext.state === 'suspended') {
      void audioContext.resume()
    }

    const now = audioContext.currentTime
    const gain = audioContext.createGain()

    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(0.032, now + 0.012)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.24)
    gain.connect(audioContext.destination)

    for (const [index, frequency] of [620, 820].entries()) {
      const oscillator = audioContext.createOscillator()
      const startTime = now + index * 0.075

      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(frequency, startTime)
      oscillator.connect(gain)
      oscillator.start(startTime)
      oscillator.stop(startTime + 0.15)
    }
  }

  function showCopiedFeedback(commandKey: string, commandValue: string) {
    const toastId = ++nextCopiedCommandToastId

    playCopiedFeedbackSound()
    setCopiedCommandKey(commandKey)
    setCopiedCommandToasts((currentToasts) => [
      ...currentToasts,
      { id: toastId, value: commandValue },
    ])

    if (copiedCommandTimerRef.current !== null) {
      window.clearTimeout(copiedCommandTimerRef.current)
    }

    copiedCommandTimerRef.current = window.setTimeout(() => {
      setCopiedCommandKey(null)
      copiedCommandTimerRef.current = null
    }, 2600)

    copiedCommandToastTimersRef.current.set(
      toastId,
      window.setTimeout(() => {
        setCopiedCommandToasts((currentToasts) =>
          currentToasts.filter((toast) => toast.id !== toastId),
        )
        copiedCommandToastTimersRef.current.delete(toastId)
      }, 3300),
    )
  }

  function copyCommand(commandKey: string, commandValue: string) {
    showCopiedFeedback(commandKey, commandValue)
    void navigator.clipboard.writeText(commandValue)
  }

  function handleCommandNavigation(
    event: KeyboardEvent<HTMLLIElement>,
  ) {
    const eventTarget = event.target
    const actionButton =
      eventTarget instanceof HTMLElement
        ? eventTarget.closest<HTMLButtonElement>(
            '.validation-commands__item-action',
          )
        : null

    if (
      eventTarget instanceof HTMLElement &&
      (eventTarget.closest('input, textarea, [contenteditable="true"]') ||
        (eventTarget.closest('button') && !actionButton))
    ) {
      return
    }

    if (event.key === 'Enter') {
      if (actionButton) {
        return
      }

      event.preventDefault()
      event.currentTarget
        .querySelector<HTMLInputElement>('.validation-commands__command-input')
        ?.focus()
      return
    }

    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault()
      const commandsPanel = event.currentTarget.closest(
        '.validation-commands',
      )
      const commandRows = commandsPanel
        ? getVisibleCommandRows(commandsPanel)
        : []
      const currentIndex = commandRows.indexOf(event.currentTarget)
      const direction = event.key === 'ArrowUp' ? -1 : 1
      const nextIndex = Math.min(
        Math.max(currentIndex + direction, 0),
        commandRows.length - 1,
      )

      if (nextIndex !== currentIndex) {
        commandRows[nextIndex]?.focus()
        playNavigationSound(direction)
      }
      return
    }

    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault()
      const actionButtons = Array.from(
        event.currentTarget.querySelectorAll<HTMLButtonElement>(
          '.validation-commands__item-action:not(:disabled)',
        ),
      ).filter((button) => button.offsetParent !== null)
      const currentActionIndex = actionButton
        ? actionButtons.indexOf(actionButton)
        : -1
      const nextTarget =
        event.key === 'ArrowRight'
          ? actionButtons[currentActionIndex + 1]
          : currentActionIndex <= 0
            ? event.currentTarget
            : actionButtons[currentActionIndex - 1]

      if (nextTarget && nextTarget !== eventTarget) {
        nextTarget.focus()
        playNavigationSound(event.key === 'ArrowLeft' ? -1 : 1)
      }

      return
    }
  }

  function handleCommandCopy(
    event: ClipboardEvent<HTMLLIElement>,
    commandKey: string,
    resolvedCommand: string,
  ) {
    const eventTarget = event.target

    if (
      eventTarget instanceof HTMLElement &&
      eventTarget.closest('input, textarea, [contenteditable="true"]')
    ) {
      return
    }

    event.preventDefault()
    event.clipboardData.setData('text/plain', resolvedCommand)
    showCopiedFeedback(commandKey, resolvedCommand)
  }

  return (
    <section
      className={`validation-commands__vendor validation-commands__vendor--${vendor}`}
    >
      {copiedCommandToasts.map((toast) =>
        createPortal(
            <aside
              className={`app-toast validation-commands__copy-toast validation-commands__copy-toast--${vendor}`}
              role="status"
              aria-live="polite"
              style={{ zIndex: 2000 + toast.id }}
            >
              <CloneIcon className="validation-commands__copy-toast-icon" />
              <div className="validation-commands__copy-toast-content">
                <strong>Se copió el comando</strong>
                <span>Listo en el portapapeles</span>
                <p>{toast.value}</p>
              </div>
            </aside>,
            document.body,
            String(toast.id),
          ),
      )}

      <ol className="validation-commands__list">
        {commands.filter(({ excelRow }) => {
          const commandKey = `${commandScope}:${commandSection}:${vendor}:${excelRow}`
          return isExpanded || lockedCommandKeys.has(commandKey)
        }).map(({ command, excelRow }) => {
          const commandTitle = commandTitleMap[vendor][excelRow] ?? 'Comando'
          const template = getCommandTemplate(command, excelRow, vendor, values)
          const valueTransforms: CommandValueTransforms =
            commandSection === 'serial-change' &&
            vendor === 'nokia' &&
            excelRow === 46
              ? { PASSWORD: formatNokiaSerial }
              : {}
          const commandLabels = getCommandLabels(template)
          const commandKey = `${commandScope}:${commandSection}:${vendor}:${excelRow}`
          const isLocked = lockedCommandKeys.has(commandKey)
          const isCustomized = Object.hasOwn(commandOverrides, commandKey)
          const compiledCommand = compileCommandText(
            template,
            values,
            valueTransforms,
          )
          const editableCommand = isCustomized
            ? commandOverrides[commandKey]
            : commandTemplateToEditorText(template)
          const resolvedCommand = isCustomized
            ? resolveCustomCommandText(
                commandOverrides[commandKey],
                availableProperties,
                valueTransforms,
              )
            : compiledCommand
          const referencedProperties = getReferencedCommandProperties(
            template,
            editableCommand,
            availableProperties,
          )
          const hasDirtyProperty = referencedProperties.some(
            (property) => property.isDirty,
          )

          return (
            <li
              key={`${vendor}-${excelRow}`}
              className={`validation-commands__item ${
                isCustomized ? 'validation-commands__item--dirty' : ''
              } ${
                copiedCommandKey === commandKey
                  ? 'validation-commands__item--copied'
                  : ''
              }`}
              data-command-navigation="true"
              data-command-locked={isLocked ? 'true' : 'false'}
              tabIndex={0}
              onKeyDown={handleCommandNavigation}
              onCopy={(event) =>
                handleCommandCopy(event, commandKey, resolvedCommand)
              }
            >
              <span className="validation-commands__flag" aria-hidden="true">
                <span className="validation-commands__flag-dot" />
              </span>
              <span
                className="validation-commands__row"
                title={commandTitle}
              >
                {commandTitle}
              </span>
              <CommandEditor
                commandText={editableCommand}
                template={template}
                row={excelRow}
                values={values}
                tones={tones}
                isCustomized={isCustomized}
                highlightedLabel={highlightedLabel}
                onHighlightedLabelChange={onHighlightedLabelChange}
                dirtyLabels={dirtyLabels}
                onCommandChange={(value) => onCommandChange(commandKey, value)}
                availableProperties={availableProperties}
                onPropertyValueChange={onPropertyValueChange}
                valueTransforms={valueTransforms}
              />
              <div className="validation-commands__item-actions">
                <button
                  type="button"
                  className={`validation-commands__item-action validation-commands__item-action--lock ${
                    isLocked
                      ? 'validation-commands__item-action--locked'
                      : ''
                  }`}
                  aria-pressed={isLocked}
                  onClick={() =>
                    onToggleCommandLock(commandKey, {
                      title: commandTitle,
                      command: resolvedCommand,
                    })
                  }
                  aria-label={`${isLocked ? 'Desbloquear' : 'Bloquear'} comando de la fila ${excelRow}`}
                >
                  {isLocked ? (
                    <LockIcon className="validation-commands__item-action-icon" />
                  ) : (
                    <LockSlashIcon className="validation-commands__item-action-icon" />
                  )}
                </button>
                <button
                  type="button"
                  className="validation-commands__item-action"
                  onClick={() => copyCommand(commandKey, resolvedCommand)}
                  aria-label={`Copiar comando de la fila ${excelRow}`}
                >
                  <CloneIcon className="validation-commands__item-action-icon" />
                </button>
                {isCustomized || hasDirtyProperty ? (
                  <button
                    type="button"
                    className="validation-commands__item-action"
                    onClick={() => {
                      onCommandReset(commandKey)
                      onResetValues?.(commandLabels)
                      for (const property of referencedProperties) {
                        if (
                          property.isDirty &&
                          property.source &&
                          property.itemId &&
                          property.originalValue !== undefined
                        ) {
                          onPropertyValueReset?.(
                            property.source,
                            property.itemId,
                            property.originalValue,
                          )
                        }
                      }
                    }}
                    aria-label={`Restablecer valores de la fila ${excelRow}`}
                  >
                    <CornerUpLeftIcon className="validation-commands__item-action-icon" />
                  </button>
                ) : null}
              </div>
            </li>
          )
        })}
        {personalCommands.filter((personalCommand) => {
          const personalCommandKey = `personal:${personalCommand.id}`
          return isExpanded || lockedCommandKeys.has(personalCommandKey)
        }).map((personalCommand, index) => {
          const isInitialized = personalCommand.baseline !== null
          const isDirty =
            isInitialized &&
            personalCommand.value !== personalCommand.baseline
          const referencedProperties = getReferencedCommandProperties(
            '',
            personalCommand.value,
            availableProperties,
          )
          const hasDirtyProperty = referencedProperties.some(
            (property) => property.isDirty,
          )
          const resolvedCommand = resolveCustomCommandText(
            personalCommand.value,
            availableProperties,
          )
          const personalCommandKey = `personal:${personalCommand.id}`
          const isLocked = lockedCommandKeys.has(personalCommandKey)

          return (
            <li
              key={personalCommand.id}
              className={`validation-commands__item validation-commands__item--personal ${
                isDirty ? 'validation-commands__item--dirty' : ''
              } ${
                copiedCommandKey === personalCommandKey
                  ? 'validation-commands__item--copied'
                  : ''
              }`}
              data-command-navigation="true"
              data-command-locked={isLocked ? 'true' : 'false'}
              tabIndex={0}
              onKeyDown={handleCommandNavigation}
              onCopy={(event) =>
                handleCommandCopy(
                  event,
                  personalCommandKey,
                  resolvedCommand,
                )
              }
            >
              <span className="validation-commands__flag" aria-hidden="true">
                <span className="validation-commands__flag-dot" />
              </span>
              <input
                type="text"
                className="validation-commands__title-input"
                value={personalCommand.title}
                maxLength={20}
                placeholder={`Personal ${index + 1}`}
                aria-label={`Título del comando personalizado ${index + 1}`}
                title={personalCommand.title || `Personal ${index + 1}`}
                onChange={(event) =>
                  onPersonalCommandTitleChange(
                    personalCommand.id,
                    event.target.value.slice(0, 20),
                  )
                }
              />
              <CommandEditor
                commandText={personalCommand.value}
                template=""
                row={`personal-${personalCommand.id}`}
                values={values}
                tones={tones}
                isCustomized
                highlightedLabel={highlightedLabel}
                onHighlightedLabelChange={onHighlightedLabelChange}
                dirtyLabels={dirtyLabels}
                onCommandChange={(value) =>
                  onPersonalCommandChange(personalCommand.id, value)
                }
                availableProperties={availableProperties}
                initiallyEditing={!isInitialized}
                onEditingComplete={(value) =>
                  onPersonalCommandComplete(personalCommand.id, value)
                }
                onPropertyValueChange={onPropertyValueChange}
              />
              {isInitialized ? (
                <div className="validation-commands__item-actions">
                  <button
                    type="button"
                    className={`validation-commands__item-action validation-commands__item-action--lock ${
                      isLocked
                        ? 'validation-commands__item-action--locked'
                        : ''
                    }`}
                    aria-pressed={isLocked}
                    onClick={() =>
                      onToggleCommandLock(personalCommandKey, {
                        title:
                          personalCommand.title || `Personal ${index + 1}`,
                        command: resolvedCommand,
                      })
                    }
                    aria-label={`${isLocked ? 'Desbloquear' : 'Bloquear'} comando personalizado ${index + 1}`}
                  >
                    {isLocked ? (
                      <LockIcon className="validation-commands__item-action-icon" />
                    ) : (
                      <LockSlashIcon className="validation-commands__item-action-icon" />
                    )}
                  </button>
                  <button
                    type="button"
                    className="validation-commands__item-action"
                    onClick={() =>
                      copyCommand(personalCommandKey, resolvedCommand)
                    }
                    aria-label={`Copiar comando personalizado ${index + 1}`}
                  >
                    <CloneIcon className="validation-commands__item-action-icon" />
                  </button>
                  {isDirty || hasDirtyProperty ? (
                    <button
                      type="button"
                      className="validation-commands__item-action"
                      onClick={() => {
                        if (isDirty) {
                          onPersonalCommandReset(personalCommand.id)
                        }

                        for (const property of referencedProperties) {
                          if (
                            property.isDirty &&
                            property.source &&
                            property.itemId &&
                            property.originalValue !== undefined
                          ) {
                            onPropertyValueReset?.(
                              property.source,
                              property.itemId,
                              property.originalValue,
                            )
                          }
                        }
                      }}
                      aria-label={`Restablecer comando personalizado ${index + 1}`}
                    >
                      <CornerUpLeftIcon className="validation-commands__item-action-icon" />
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="validation-commands__item-action validation-commands__item-action--delete"
                    onClick={() =>
                      onPersonalCommandDelete(personalCommand.id)
                    }
                    aria-label={`Eliminar comando personalizado ${index + 1}`}
                  >
                    <TrashIcon className="validation-commands__item-action-icon" />
                  </button>
                </div>
              ) : null}
            </li>
          )
        })}
        {isExpanded ? (
          <li className="validation-commands__item validation-commands__item--add">
            <button
              type="button"
              className="validation-commands__add-command"
              onClick={() => onPersonalCommandAdd(vendor, commandSection)}
              aria-label={`Agregar comando personalizado para ${label}`}
            >
              <PlusLargeIcon className="validation-commands__add-command-icon" />
              <span>Agregar línea personal</span>
            </button>
          </li>
        ) : null}
      </ol>
    </section>
  )
}

function ValidationCommandsPanel({
  ip = '',
  slot = '',
  port = '',
  onuid = '',
  tones = {},
  highlightedLabel,
  onHighlightedLabelChange,
  dirtyLabels = [],
  onResetValues,
  availableProperties = [],
  onPropertyValueChange,
  onPropertyValueReset,
}: ValidationCommandsPanelProps) {
  const normalizedIp = ip.trim()
  const manufacturer = oltReferenceByIp[normalizedIp]?.manufacturer.toLowerCase()
  const detectedVendor: Vendor | null =
    manufacturer === 'huawei' || manufacturer === 'wawei'
      ? 'huawei'
      : manufacturer === 'nokia'
        ? 'nokia'
        : null
  const [vendorOverride, setVendorOverride] =
    useState<VendorOverride | null>(null)
  const [commandOverrides, setCommandOverrides] =
    useState<CommandOverrides>(readStoredCommandOverrides)
  const [personalCommands, setPersonalCommands] = useState<PersonalCommand[]>(
    readStoredPersonalCommands,
  )
  const [lockedCommandKeys, setLockedCommandKeys] = useState(
    readStoredLockedCommands,
  )
  const [commandLockNotice, setCommandLockNotice] =
    useState<CommandLockNotice | null>(null)
  const commandLockNoticeIdRef = useRef(0)
  const commandLockNoticeTimerRef = useRef<number | null>(null)
  const [expandedSections, setExpandedSections] = useState({
    validation: readStoredCommandsExpanded(
      validationCommandsExpandedStorageKey,
    ),
    search: readStoredCommandsExpanded(searchCommandsExpandedStorageKey),
    'serial-change': readStoredCommandsExpanded(
      serialChangeCommandsExpandedStorageKey,
    ),
    'password-change': readStoredCommandsExpanded(
      passwordChangeCommandsExpandedStorageKey,
    ),
    'profile-change': readStoredCommandsExpanded(
      profileChangeCommandsExpandedStorageKey,
    ),
    'delete-igmp': readStoredCommandsExpanded(
      deleteIgmpCommandsExpandedStorageKey,
    ),
    'delete-vlan-service': readStoredCommandsExpanded(
      deleteVlanServiceCommandsExpandedStorageKey,
    ),
  })
  const [animatingSections, setAnimatingSections] = useState({
    validation: false,
    search: false,
    'serial-change': false,
    'password-change': false,
    'profile-change': false,
    'delete-igmp': false,
    'delete-vlan-service': false,
  })
  const disclosureAnimationTimerRef = useRef<
    Partial<Record<CommandSection, number>>
  >({})
  const visibleVendor =
    vendorOverride?.ip === normalizedIp
      ? vendorOverride.vendor
      : detectedVendor
  const values = {
    slot: slot.trim(),
    port: port.trim(),
    onuid: onuid.trim(),
    password:
      availableProperties.find((property) => property.label === 'PASSWORD')
        ?.value.trim() ?? '',
    networkvlan:
      availableProperties.find(
        (property) => property.label === 'NETWORKVLAN',
      )?.value.trim() ?? '',
    innervlan:
      availableProperties.find((property) => property.label === 'INNERVLAN')
        ?.value.trim() ?? '',
    profiledata:
      availableProperties.find((property) => property.label === 'PROFILEDATA')
        ?.value.trim() ?? '',
  }
  const commandTones: CommandTones = {
    ...defaultCommandTones,
    ...tones,
  }

  useEffect(() => {
    window.localStorage.setItem(
      commandOverridesStorageKey,
      JSON.stringify(commandOverrides),
    )
  }, [commandOverrides])

  useEffect(() => {
    window.localStorage.setItem(
      personalCommandsStorageKey,
      JSON.stringify(personalCommands),
    )
  }, [personalCommands])

  useEffect(() => {
    window.localStorage.setItem(
      lockedCommandsStorageKey,
      JSON.stringify(Array.from(lockedCommandKeys)),
    )
  }, [lockedCommandKeys])

  useEffect(() => {
    window.localStorage.setItem(
      validationCommandsExpandedStorageKey,
      String(expandedSections.validation),
    )
    window.localStorage.setItem(
      searchCommandsExpandedStorageKey,
      String(expandedSections.search),
    )
    window.localStorage.setItem(
      serialChangeCommandsExpandedStorageKey,
      String(expandedSections['serial-change']),
    )
    window.localStorage.setItem(
      passwordChangeCommandsExpandedStorageKey,
      String(expandedSections['password-change']),
    )
    window.localStorage.setItem(
      profileChangeCommandsExpandedStorageKey,
      String(expandedSections['profile-change']),
    )
    window.localStorage.setItem(
      deleteIgmpCommandsExpandedStorageKey,
      String(expandedSections['delete-igmp']),
    )
    window.localStorage.setItem(
      deleteVlanServiceCommandsExpandedStorageKey,
      String(expandedSections['delete-vlan-service']),
    )
  }, [expandedSections])

  useEffect(
    () => () => {
      for (const timer of Object.values(
        disclosureAnimationTimerRef.current,
      )) {
        window.clearTimeout(timer)
      }

      if (commandLockNoticeTimerRef.current !== null) {
        window.clearTimeout(commandLockNoticeTimerRef.current)
      }
    },
    [],
  )

  function finishDisclosureAnimation(section: CommandSection) {
    const currentTimer = disclosureAnimationTimerRef.current[section]

    if (currentTimer !== undefined) {
      window.clearTimeout(currentTimer)
      delete disclosureAnimationTimerRef.current[section]
    }

    setAnimatingSections((currentSections) => ({
      ...currentSections,
      [section]: false,
    }))
  }

  function toggleDisclosure(section: CommandSection) {
    setAnimatingSections((currentSections) => ({
      ...currentSections,
      [section]: true,
    }))
    setExpandedSections((currentSections) => ({
      ...currentSections,
      [section]: !currentSections[section],
    }))

    const currentTimer = disclosureAnimationTimerRef.current[section]

    if (currentTimer !== undefined) {
      window.clearTimeout(currentTimer)
    }

    disclosureAnimationTimerRef.current[section] = window.setTimeout(
      () => finishDisclosureAnimation(section),
      420,
    )
  }

  function toggleCommandLock(
    commandKey: string,
    details: CommandLockDetails,
  ) {
    const isLocked = lockedCommandKeys.has(commandKey)
    const nextIsLocked = !isLocked

    setLockedCommandKeys((currentKeys) => {
      const nextKeys = new Set(currentKeys)

      if (nextKeys.has(commandKey)) {
        nextKeys.delete(commandKey)
      } else {
        nextKeys.add(commandKey)
      }

      return nextKeys
    })

    const noticeId = ++commandLockNoticeIdRef.current
    setCommandLockNotice({
      id: noticeId,
      vendor: visibleVendor as Vendor,
      title: details.title,
      command: details.command,
      isLocked: nextIsLocked,
    })

    if (commandLockNoticeTimerRef.current !== null) {
      window.clearTimeout(commandLockNoticeTimerRef.current)
    }

    commandLockNoticeTimerRef.current = window.setTimeout(() => {
      setCommandLockNotice(null)
      commandLockNoticeTimerRef.current = null
    }, 3300)
  }

  if (!values.slot || !values.port || !values.onuid || !visibleVendor) {
    return null
  }

  const alternateVendor: Vendor =
    visibleVendor === 'nokia' ? 'huawei' : 'nokia'
  const alternateLabel = alternateVendor === 'nokia' ? 'Nokia' : 'Huawei'

  function renderVendorTable(
    commandSection: CommandSection,
    commandRows: ValidationRow[],
    commandTitleMap: Record<Vendor, Record<number, string>>,
    isExpanded: boolean,
  ) {
    return (
      <VendorTable
        vendor={visibleVendor as Vendor}
        commandSection={commandSection}
        commandRows={commandRows}
        commandTitleMap={commandTitleMap}
        values={values}
        tones={commandTones}
        highlightedLabel={highlightedLabel}
        onHighlightedLabelChange={onHighlightedLabelChange}
        dirtyLabels={new Set(dirtyLabels)}
        onResetValues={onResetValues}
        commandScope={normalizedIp}
        commandOverrides={commandOverrides}
        onCommandChange={(commandKey, value) =>
          setCommandOverrides((currentOverrides) => ({
            ...currentOverrides,
            [commandKey]: value,
          }))
        }
        onCommandReset={(commandKey) =>
          setCommandOverrides((currentOverrides) => {
            const nextOverrides = { ...currentOverrides }
            delete nextOverrides[commandKey]
            return nextOverrides
          })
        }
        availableProperties={availableProperties}
        personalCommands={personalCommands.filter(
          (command) =>
            command.scope === normalizedIp &&
            command.vendor === visibleVendor &&
            command.section === commandSection,
        )}
        onPersonalCommandAdd={(vendor, section) =>
          setPersonalCommands((currentCommands) => [
            ...currentCommands,
            {
              id: createPersonalCommandId(),
              scope: normalizedIp,
              vendor,
              section,
              title: '',
              baseline: null,
              value: '',
            },
          ])
        }
        onPersonalCommandTitleChange={(commandId, title) =>
          setPersonalCommands((currentCommands) =>
            currentCommands.map((command) =>
              command.id === commandId
                ? { ...command, title: title.slice(0, 20) }
                : command,
            ),
          )
        }
        onPersonalCommandChange={(commandId, value) =>
          setPersonalCommands((currentCommands) =>
            currentCommands.map((command) =>
              command.id === commandId ? { ...command, value } : command,
            ),
          )
        }
        onPersonalCommandComplete={(commandId, value) =>
          setPersonalCommands((currentCommands) => {
            if (!value.trim()) {
              return currentCommands.filter(
                (command) => command.id !== commandId,
              )
            }

            return currentCommands.map((command) =>
              command.id === commandId && command.baseline === null
                ? { ...command, baseline: value, value }
                : command,
            )
          })
        }
        onPersonalCommandReset={(commandId) =>
          setPersonalCommands((currentCommands) =>
            currentCommands.map((command) =>
              command.id === commandId && command.baseline !== null
                ? { ...command, value: command.baseline }
                : command,
            ),
          )
        }
        onPersonalCommandDelete={(commandId) => {
          setPersonalCommands((currentCommands) =>
            currentCommands.filter((command) => command.id !== commandId),
          )
          setLockedCommandKeys((currentKeys) => {
            const nextKeys = new Set(currentKeys)
            nextKeys.delete(`personal:${commandId}`)
            return nextKeys
          })
        }}
        isExpanded={isExpanded}
        lockedCommandKeys={lockedCommandKeys}
        onToggleCommandLock={toggleCommandLock}
        onPropertyValueChange={onPropertyValueChange}
        onPropertyValueReset={onPropertyValueReset}
      />
    )
  }

  function renderCommandGroup(
    section: CommandSection,
    title: string,
    commandRows: ValidationRow[],
    commandTitleMap: Record<Vendor, Record<number, string>>,
  ) {
    const isExpanded = expandedSections[section]
    const currentVendor = visibleVendor as Vendor
    const vendorLabel = currentVendor === 'nokia' ? 'Nokia' : 'Huawei'
    const detectedLabel = currentVendor === detectedVendor ? ' (Detectado)' : ''
    const hasLockedCommands =
      commandRows.some(
        (row) =>
          Boolean(row[currentVendor]) &&
          lockedCommandKeys.has(
            `${normalizedIp}:${section}:${currentVendor}:${row.excelRow}`,
          ),
      ) ||
      personalCommands.some(
        (command) =>
          command.scope === normalizedIp &&
          command.vendor === currentVendor &&
          command.section === section &&
          command.baseline !== null &&
          lockedCommandKeys.has(`personal:${command.id}`),
      )
    const isContentVisible = isExpanded || hasLockedCommands

    return (
      <section
        className={`validation-commands__group ${
          isExpanded ? '' : 'validation-commands--collapsed'
        } ${
          !isExpanded && hasLockedCommands
            ? 'validation-commands--collapsed-with-locked'
            : ''
        } ${
          animatingSections[section] ? 'validation-commands--animating' : ''
        } validation-commands--vendor-${currentVendor}`}
      >
        <div className="validation-commands__header">
          <button
            type="button"
            className="validation-commands__disclosure"
            aria-expanded={isExpanded}
            aria-controls={`${section}-commands-content`}
            onClick={() => toggleDisclosure(section)}
            onKeyDown={(event) => {
              const currentGroup = event.currentTarget.closest(
                '.validation-commands__group',
              )

              if (
                currentGroup &&
                (event.key === 'ArrowUp' || event.key === 'ArrowDown')
              ) {
                event.preventDefault()
                const direction = event.key === 'ArrowUp' ? -1 : 1
                const currentSectionRows = getVisibleCommandRows(currentGroup)
                const nextCommandRow =
                  direction === 1 && currentSectionRows.length > 0
                    ? currentSectionRows[0]
                    : getAdjacentSectionCommandRow(currentGroup, direction)

                nextCommandRow?.focus()
                return
              }
            }}
          >
            <span
              className="validation-commands__disclosure-icon"
              aria-hidden="true"
            />
            <span className="validation-commands__disclosure-copy">
              <span className="validation-commands__title">
                {title} - {vendorLabel}{detectedLabel}
              </span>
            </span>
          </button>

          {isExpanded ? (
            <button
              type="button"
              className="validation-commands__toggle"
              onClick={() =>
                setVendorOverride({ ip: normalizedIp, vendor: alternateVendor })
              }
            >
              Ver tabla {alternateLabel}
            </button>
          ) : null}
        </div>

        <div
          id={`${section}-commands-content`}
          className="validation-commands__content"
          aria-hidden={!isContentVisible}
          inert={isContentVisible ? undefined : true}
          onTransitionEnd={(event) => {
            if (
              event.target === event.currentTarget &&
              event.propertyName === 'grid-template-rows'
            ) {
              finishDisclosureAnimation(section)
            }
          }}
        >
          <div className="validation-commands__content-inner">
            {renderVendorTable(
              section,
              commandRows,
              commandTitleMap,
              isExpanded,
            )}
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="validation-commands">
      <CommandLockToast notice={commandLockNotice} />

      <div className="validation-commands__section-heading">
        <h3>Tabla de Comandos</h3>
      </div>

      {renderCommandGroup(
        'validation',
        'Validación',
        validationCommandRows,
        commandTitles,
      )}
      {renderCommandGroup(
        'search',
        'Buscar',
        searchCommandRows,
        searchCommandTitles,
      )}
      {renderCommandGroup(
        'serial-change',
        'Cambio de Serial',
        serialChangeCommandRows,
        serialChangeCommandTitles,
      )}
      {renderCommandGroup(
        'password-change',
        'Cambio de Password',
        passwordChangeCommandRows,
        passwordChangeCommandTitles,
      )}
      {renderCommandGroup(
        'profile-change',
        'Cambio de Perfil',
        profileChangeCommandRows,
        profileChangeCommandTitles,
      )}
      {renderCommandGroup(
        'delete-igmp',
        'Eliminar Servicio IGMP',
        deleteIgmpCommandRows,
        deleteIgmpCommandTitles,
      )}
      {renderCommandGroup(
        'delete-vlan-service',
        'Eliminar Servicio VLAN',
        deleteVlanServiceCommandRows,
        deleteVlanServiceCommandTitles,
      )}
    </section>
  )
}

export default ValidationCommandsPanel
