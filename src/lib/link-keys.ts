const STORAGE_PREFIX = 'snaplink_key_'

export function getLinkKey(linkId: string): string | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem(STORAGE_PREFIX + linkId)
  } catch {
    return null
  }
}

export function setLinkKey(linkId: string, key: string): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_PREFIX + linkId, key)
  } catch {
    // ignore
  }
}
