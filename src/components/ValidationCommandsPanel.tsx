import { useEffect, useRef, useState } from 'react'
import validationRows from '../assets/_DATA/tables/validation_commands.json'
import { oltReferenceByIp } from '../assets/_DATA/oltReferenceLookup'
import CloneIcon from './CloneIcon'
import CornerUpLeftIcon from './CornerUpLeftIcon'
import PlusIcon from './PlusIcon'
import PlusLargeIcon from './PlusLargeIcon'
import TrashIcon from './TrashIcon'
import type { DataItemTone } from './jsonToneShared'
import './ValidationCommandsPanel.css'

type Vendor = 'huawei' | 'nokia'
type CommandValueLabel = 'SLOT' | 'PORT' | 'ONUID'
type CommandValues = Record<Lowercase<CommandValueLabel>, string>
type CommandTones = Record<CommandValueLabel, DataItemTone>
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
  baseline: string | null
  value: string
}

const rows = validationRows as ValidationRow[]
const commandOverridesStorageKey = 'chinomatic-validation-command-overrides-v1'
const personalCommandsStorageKey = 'chinomatic-personal-validation-commands-v1'
const validationCommandsExpandedStorageKey =
  'chinomatic-validation-commands-expanded-v1'

const defaultCommandTones: CommandTones = {
  SLOT: 'red',
  PORT: 'green',
  ONUID: 'blue',
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

    return parsedValue.filter((command): command is PersonalCommand => {
      if (!command || typeof command !== 'object') {
        return false
      }

      const candidate = command as Partial<PersonalCommand>

      return (
        typeof candidate.id === 'string' &&
        typeof candidate.scope === 'string' &&
        (candidate.vendor === 'nokia' || candidate.vendor === 'huawei') &&
        (candidate.baseline === null ||
          typeof candidate.baseline === 'string') &&
        typeof candidate.value === 'string'
      )
    })
  } catch {
    return []
  }
}

function readStoredValidationCommandsExpanded(): boolean {
  if (typeof window === 'undefined') {
    return true
  }

  const storedValue = window.localStorage.getItem(
    validationCommandsExpandedStorageKey,
  )

  return storedValue === null ? true : storedValue === 'true'
}

function createPersonalCommandId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
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
): string {
  const propertiesByLabel = new Map(
    availableProperties.map((property) => [
      property.label.toUpperCase(),
      property,
    ]),
  )

  return commandText.replace(
    /::ADD\(([^)]+)\)/gi,
    (marker, propertyLabel: string) =>
      propertiesByLabel.get(propertyLabel.toUpperCase())?.value ?? marker,
  )
}

function commandTemplateToEditorText(template: string): string {
  return template.replace(
    /\{(slot|port|onuid)\}/g,
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

function compileCommandText(template: string, values: CommandValues): string {
  return template.replace(/\{(slot|port|onuid)\}/g, (_, valueKey: keyof CommandValues) =>
    values[valueKey],
  )
}

function getCommandLabels(template: string): CommandValueLabel[] {
  return Array.from(
    new Set(
      Array.from(template.matchAll(/\{(slot|port|onuid)\}/g)).map(
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
  const parts = template.split(/(\{(?:slot|port|onuid)\})/g)
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

      return renderPropertyToken(
        `custom-${property.label}-${part.index}`,
        property,
        showMarkers ? marker : property.value,
      )
    })
  }

  return (
    <div
      className={`validation-commands__editor-shell ${
        isEditing ? 'validation-commands__editor-shell--editing' : ''
      }`}
      title={isEditing ? undefined : 'Doble clic para editar el comando'}
      onDoubleClick={() => {
        setIsEditing(true)
        window.requestAnimationFrame(() => {
          inputRef.current?.focus()
          inputRef.current?.setSelectionRange(
            commandText.length,
            commandText.length,
          )
        })
      }}
    >
      <code className="validation-commands__command-preview" aria-hidden="true">
        {isEditing
          ? renderSemanticCommand(true)
          : isCustomized
            ? renderSemanticCommand(false)
          : parts.map((part, index) => {
              const valueKey = part.match(/^\{(slot|port|onuid)\}$/)?.[1] as
                | keyof CommandValues
                | undefined

              if (!valueKey) {
                return part
              }

              const label = valueKey.toUpperCase() as CommandValueLabel
              const property = availableProperties.find(
                (availableProperty) => availableProperty.label === label,
              )

              if (property) {
                return renderPropertyToken(
                  `${valueKey}-${index}`,
                  { ...property, tone: tones[label] },
                  values[valueKey],
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
                  title={`${label}: ${values[valueKey]}`}
                  onMouseEnter={() => onHighlightedLabelChange?.(label)}
                  onMouseLeave={() => onHighlightedLabelChange?.(null)}
                >
                  {values[valueKey]}
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
            event.currentTarget.blur()
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
        onBlur={() => {
          setPropertyTrigger(null)
          setIsEditing(false)
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
  isDetected,
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
  onPersonalCommandChange,
  onPersonalCommandComplete,
  onPersonalCommandReset,
  onPersonalCommandDelete,
  onPropertyValueChange,
  onPropertyValueReset,
}: {
  vendor: Vendor
  isDetected: boolean
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
  onPersonalCommandAdd: (vendor: Vendor) => void
  onPersonalCommandChange: (commandId: string, value: string) => void
  onPersonalCommandComplete: (commandId: string, value: string) => void
  onPersonalCommandReset: (commandId: string) => void
  onPersonalCommandDelete: (commandId: string) => void
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
  const commands = rows.flatMap((row) => {
    const command = row[vendor]
    return command ? [{ command, excelRow: row.excelRow }] : []
  })

  return (
    <section
      className={`validation-commands__vendor validation-commands__vendor--${vendor}`}
    >
      <div className="validation-commands__vendor-header">
        <div>
          <span className="validation-commands__vendor-dot" aria-hidden="true" />
          <h4>{label}</h4>
        </div>

        {isDetected ? (
          <span className="validation-commands__active-badge">Detectado</span>
        ) : (
          <span className="validation-commands__alternate-badge">
            Vista alterna
          </span>
        )}
      </div>

      <ol className="validation-commands__list">
        {commands.map(({ command, excelRow }) => {
          const template = getCommandTemplate(command, excelRow, vendor, values)
          const commandLabels = getCommandLabels(template)
          const commandKey = `${commandScope}:${vendor}:${excelRow}`
          const isCustomized = Object.hasOwn(commandOverrides, commandKey)
          const compiledCommand = compileCommandText(template, values)
          const editableCommand = isCustomized
            ? commandOverrides[commandKey]
            : commandTemplateToEditorText(template)
          const resolvedCommand = isCustomized
            ? resolveCustomCommandText(
                commandOverrides[commandKey],
                availableProperties,
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
                command.type === 'literal'
                  ? 'validation-commands__item--literal'
                  : ''
              } ${
                isCustomized ? 'validation-commands__item--dirty' : ''
              }`}
            >
              <span className="validation-commands__flag" aria-hidden="true">
                <span className="validation-commands__flag-dot" />
              </span>
              <span className="validation-commands__row">LINE {excelRow}</span>
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
              />
              {command.type === 'literal' ? (
                <span className="validation-commands__literal-badge">
                  Literal Excel
                </span>
              ) : null}
              <div className="validation-commands__item-actions">
                <button
                  type="button"
                  className="validation-commands__item-action"
                  onClick={() =>
                    void navigator.clipboard.writeText(resolvedCommand)
                  }
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
        {personalCommands.map((personalCommand, index) => {
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

          return (
            <li
              key={personalCommand.id}
              className={`validation-commands__item validation-commands__item--personal ${
                isDirty ? 'validation-commands__item--dirty' : ''
              }`}
            >
              <span className="validation-commands__flag" aria-hidden="true">
                <span className="validation-commands__flag-dot" />
              </span>
              <span className="validation-commands__row">
                CUSTOM {index + 1}
              </span>
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
                    className="validation-commands__item-action"
                    onClick={() =>
                      void navigator.clipboard.writeText(resolvedCommand)
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
        <li className="validation-commands__item validation-commands__item--add">
          <button
            type="button"
            className="validation-commands__add-command"
            onClick={() => onPersonalCommandAdd(vendor)}
            aria-label={`Agregar comando personalizado para ${label}`}
          >
            <PlusLargeIcon className="validation-commands__add-command-icon" />
            <span>Agregar línea personal</span>
          </button>
        </li>
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
  const [isExpanded, setIsExpanded] = useState(
    readStoredValidationCommandsExpanded,
  )
  const [isDisclosureAnimating, setIsDisclosureAnimating] = useState(false)
  const disclosureAnimationTimerRef = useRef<number | null>(null)
  const visibleVendor =
    vendorOverride?.ip === normalizedIp
      ? vendorOverride.vendor
      : detectedVendor
  const values = {
    slot: slot.trim(),
    port: port.trim(),
    onuid: onuid.trim(),
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
      validationCommandsExpandedStorageKey,
      String(isExpanded),
    )
  }, [isExpanded])

  useEffect(
    () => () => {
      if (disclosureAnimationTimerRef.current !== null) {
        window.clearTimeout(disclosureAnimationTimerRef.current)
      }
    },
    [],
  )

  function finishDisclosureAnimation() {
    if (disclosureAnimationTimerRef.current !== null) {
      window.clearTimeout(disclosureAnimationTimerRef.current)
      disclosureAnimationTimerRef.current = null
    }

    setIsDisclosureAnimating(false)
  }

  function toggleDisclosure() {
    setIsDisclosureAnimating(true)
    setIsExpanded((currentValue) => !currentValue)

    if (disclosureAnimationTimerRef.current !== null) {
      window.clearTimeout(disclosureAnimationTimerRef.current)
    }

    disclosureAnimationTimerRef.current = window.setTimeout(
      finishDisclosureAnimation,
      420,
    )
  }

  if (!values.slot || !values.port || !values.onuid || !visibleVendor) {
    return null
  }

  const alternateVendor: Vendor =
    visibleVendor === 'nokia' ? 'huawei' : 'nokia'
  const alternateLabel = alternateVendor === 'nokia' ? 'Nokia' : 'Huawei'

  return (
    <section
      className={`validation-commands ${
        isExpanded ? '' : 'validation-commands--collapsed'
      } ${
        isDisclosureAnimating ? 'validation-commands--animating' : ''
      } validation-commands--vendor-${visibleVendor}`}
    >
      <div className="validation-commands__header">
        <button
          type="button"
          className="validation-commands__disclosure"
          aria-expanded={isExpanded}
          aria-controls="validation-commands-content"
          onClick={toggleDisclosure}
        >
          <span
            className="validation-commands__disclosure-icon"
            aria-hidden="true"
          />
          <span className="validation-commands__disclosure-copy">
            <span className="validation-commands__eyebrow">
              (datos de servicio)
            </span>
            <span className="validation-commands__title">
              Comandos de validación
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
        id="validation-commands-content"
        className="validation-commands__content"
        aria-hidden={!isExpanded}
        inert={isExpanded ? undefined : true}
        onTransitionEnd={(event) => {
          if (
            event.target === event.currentTarget &&
            event.propertyName === 'grid-template-rows'
          ) {
            finishDisclosureAnimation()
          }
        }}
      >
        <div className="validation-commands__content-inner">
          <VendorTable
        vendor={visibleVendor}
        isDetected={visibleVendor === detectedVendor}
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
            command.vendor === visibleVendor,
        )}
        onPersonalCommandAdd={(vendor) =>
          setPersonalCommands((currentCommands) => [
            ...currentCommands,
            {
              id: createPersonalCommandId(),
              scope: normalizedIp,
              vendor,
              baseline: null,
              value: '',
            },
          ])
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
        onPersonalCommandDelete={(commandId) =>
          setPersonalCommands((currentCommands) =>
            currentCommands.filter((command) => command.id !== commandId),
          )
        }
            onPropertyValueChange={onPropertyValueChange}
            onPropertyValueReset={onPropertyValueReset}
          />
        </div>
      </div>
    </section>
  )
}

export default ValidationCommandsPanel
