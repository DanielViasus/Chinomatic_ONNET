export type JsonLineLookupMode = 'property' | 'characteristic'

type JsonLineLookupConfig = {
  mode: JsonLineLookupMode
  searchKey: string
  sourceText: string
  expectedValue?: string
}

function normalizeSearchToken(value: string | undefined): string {
  return (value ?? '').trim()
}

function findLineNumberByProperty(
  sourceText: string,
  searchKey: string,
  expectedValue?: string,
): number | null {
  const lines = sourceText.split('\n')
  const normalizedValue = normalizeSearchToken(expectedValue)
  let fallbackLineNumber: number | null = null

  for (const [index, line] of lines.entries()) {
    if (!line.includes(searchKey)) {
      continue
    }

    if (fallbackLineNumber === null) {
      fallbackLineNumber = index + 1
    }

    if (normalizedValue.length === 0 || line.includes(normalizedValue)) {
      return index + 1
    }
  }

  return fallbackLineNumber
}

function findLineNumberByCharacteristic(
  sourceText: string,
  searchKey: string,
  expectedValue?: string,
): number | null {
  const lines = sourceText.split('\n')
  const normalizedValue = normalizeSearchToken(expectedValue)
  const characteristicIndex = lines.findIndex((line) => line.includes(searchKey))

  if (characteristicIndex === -1) {
    return null
  }

  for (
    let lineIndex = characteristicIndex;
    lineIndex < Math.min(characteristicIndex + 8, lines.length);
    lineIndex += 1
  ) {
    const currentLine = lines[lineIndex]
    const isValueLine = currentLine.includes('value')

    if (!isValueLine) {
      continue
    }

    if (normalizedValue.length === 0 || currentLine.includes(normalizedValue)) {
      return lineIndex + 1
    }
  }

  return characteristicIndex + 1
}

export function findJsonLineNumber({
  mode,
  searchKey,
  sourceText,
  expectedValue,
}: JsonLineLookupConfig): number | null {
  if (sourceText.trim().length === 0 || searchKey.trim().length === 0) {
    return null
  }

  return mode === 'characteristic'
    ? findLineNumberByCharacteristic(sourceText, searchKey, expectedValue)
    : findLineNumberByProperty(sourceText, searchKey, expectedValue)
}
