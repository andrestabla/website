export const CONSENT_STORAGE_KEY = 'algoritmot_data_consent_v1'
export const VISITOR_ID_KEY = 'algoritmot_visitor_id_v1'

export type StoredConsent = {
  decision: 'accepted' | 'rejected'
  policyVersion: string
  acceptedAt?: string
  updatedAt: string
}

export function getStoredConsent(): StoredConsent | null {
  try {
    const raw = localStorage.getItem(CONSENT_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    if (parsed.decision !== 'accepted' && parsed.decision !== 'rejected') return null
    return parsed as StoredConsent
  } catch {
    return null
  }
}

export function setStoredConsent(value: StoredConsent) {
  localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(value))
}

export function getOrCreateVisitorId() {
  try {
    const existing = localStorage.getItem(VISITOR_ID_KEY)
    if (existing) return existing
    const created = `v_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`
    localStorage.setItem(VISITOR_ID_KEY, created)
    return created
  } catch {
    return `v_${Date.now().toString(36)}`
  }
}

export function getSessionId() {
  try {
    const key = 'algoritmot_session_id_v1'
    const existing = sessionStorage.getItem(key)
    if (existing) return existing
    const created = `s_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`
    sessionStorage.setItem(key, created)
    return created
  } catch {
    return `s_${Date.now().toString(36)}`
  }
}

