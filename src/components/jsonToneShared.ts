export type DataItemTone =
  | 'gray'
  | 'violet'
  | 'red'
  | 'green'
  | 'blue'
  | 'yellow'
  | 'orange'
  | 'teal'
  | 'pink'
  | 'cyan'

export type ToneMap = Record<string, DataItemTone>

export const sharedToneStorageKey = 'chinomatic-shared-json-item-colors-v1'
export const toneSyncEventName = 'chinomatic-shared-tone-sync'
export const tonePalette: DataItemTone[] = [
  'gray',
  'yellow',
  'orange',
  'red',
  'pink',
  'violet',
  'blue',
  'cyan',
  'teal',
  'green',
]

export function isDataItemTone(value: unknown): value is DataItemTone {
  return (
    typeof value === 'string' && tonePalette.includes(value as DataItemTone)
  )
}

export function readToneMapFromStorage(storageKey: string): ToneMap {
  if (typeof window === 'undefined') {
    return {}
  }

  const storedValue = window.localStorage.getItem(storageKey)

  if (!storedValue) {
    return {}
  }

  try {
    const parsedValue = JSON.parse(storedValue)

    if (!parsedValue || typeof parsedValue !== 'object') {
      return {}
    }

    return Object.fromEntries(
      Object.entries(parsedValue).filter((entry): entry is [string, DataItemTone] =>
        isDataItemTone(entry[1]),
      ),
    )
  } catch {
    return {}
  }
}

export function areToneMapsEqual(left: ToneMap, right: ToneMap): boolean {
  const leftEntries = Object.entries(left)
  const rightEntries = Object.entries(right)

  if (leftEntries.length !== rightEntries.length) {
    return false
  }

  return leftEntries.every(([key, value]) => right[key] === value)
}

export function dispatchToneSyncEvent() {
  if (typeof window === 'undefined') {
    return
  }

  window.dispatchEvent(new CustomEvent(toneSyncEventName))
}
