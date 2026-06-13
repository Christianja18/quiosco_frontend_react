const storageKey = 'tortas-gaby-settings'

export type LocalSettings = {
  readonly kioskName: string
  readonly receiptFooter: string
  readonly printerEnabled: boolean
}

export const defaultSettings: LocalSettings = {
  kioskName: 'Tortas Gaby',
  receiptFooter: 'Dulces, cupcakes y bocaditos',
  printerEnabled: false,
}

export const readLocalSettings = (): LocalSettings => {
  const rawValue = window.localStorage.getItem(storageKey)

  if (!rawValue) {
    return defaultSettings
  }

  try {
    const parsedValue: unknown = JSON.parse(rawValue)

    if (
      typeof parsedValue === 'object' &&
      parsedValue !== null &&
      'kioskName' in parsedValue &&
      'receiptFooter' in parsedValue &&
      'printerEnabled' in parsedValue &&
      typeof parsedValue.kioskName === 'string' &&
      typeof parsedValue.receiptFooter === 'string' &&
      typeof parsedValue.printerEnabled === 'boolean'
    ) {
      return {
        kioskName: parsedValue.kioskName,
        receiptFooter: parsedValue.receiptFooter,
        printerEnabled: parsedValue.printerEnabled,
      }
    }
  } catch {
    return defaultSettings
  }

  return defaultSettings
}

export const writeLocalSettings = (settings: LocalSettings): void => {
  window.localStorage.setItem(storageKey, JSON.stringify(settings))
}
