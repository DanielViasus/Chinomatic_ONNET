import type { DataItemTone } from './jsonToneShared'

export type JsonItemSnapshot = {
  id: string
  label: string
  value: string
  originalValue: string
  tone: DataItemTone
  isEditable: boolean
  isDirty: boolean
  hasMismatch: boolean
  hasEditedMatch: boolean
}

export type JsonItemController = {
  setValue: (itemId: string, nextValue: string) => void
  resetValue: (itemId: string) => void
}
