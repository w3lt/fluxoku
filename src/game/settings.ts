// Player settings persisted across sessions, matching the design's
// 'fluxoku-settings' localStorage contract.

import { useState } from 'react'

const STORAGE_KEY = 'fluxoku-settings'

export interface Settings {
  /** See GameOptions.autoAssist; this is the player-toggled source of it. */
  autoAssist: boolean
}

export const DEFAULT_SETTINGS: Settings = {
  autoAssist: true,
}

function loadSettings(): Settings {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof (parsed as Record<string, unknown>).autoAssist === 'boolean'
    ) {
      return { autoAssist: (parsed as Record<string, boolean>).autoAssist }
    }
  } catch {
    // Corrupted or unavailable storage falls back to defaults.
  }
  return DEFAULT_SETTINGS
}

function saveSettings(settings: Settings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // Storage may be unavailable (private mode); the toggle still works for the session.
  }
}

export interface UseSettings {
  settings: Settings
  toggleAutoAssist: () => void
}

export function useSettings(): UseSettings {
  const [settings, setSettings] = useState(loadSettings)

  const toggleAutoAssist = () => {
    const next = { ...settings, autoAssist: !settings.autoAssist }
    setSettings(next)
    saveSettings(next)
  }

  return { settings, toggleAutoAssist }
}
