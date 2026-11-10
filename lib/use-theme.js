'use client'
// Reading and changing the active theme (the list itself is lib/themes.js).
import { useEffect, useSyncExternalStore } from 'react'
import { THEMES, DEFAULT_THEME, THEME_STORAGE_KEY } from '@/lib/themes'

const CHANGE_EVENT = 'vinyl-crate-theme-change'

function currentThemeId() {
  const id = document.documentElement.dataset.theme
  return id in THEMES ? id : DEFAULT_THEME
}

export function setTheme(id) {
  if (!(id in THEMES)) return
  document.documentElement.dataset.theme = id
  try {
    localStorage.setItem(THEME_STORAGE_KEY, id)
  } catch {
    // Storage can be unavailable (private mode); the choice lasts this visit.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

function subscribe(onChange) {
  window.addEventListener(CHANGE_EVENT, onChange)
  return () => window.removeEventListener(CHANGE_EVENT, onChange)
}

// The active theme's entry; re-renders when the look is changed.
export function useTheme() {
  const id = useSyncExternalStore(subscribe, currentThemeId, () => DEFAULT_THEME)
  // Keep the browser chrome / home-screen status bar colour in step.
  useEffect(() => {
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEMES[id].themeColor)
  }, [id])
  return THEMES[id]
}
