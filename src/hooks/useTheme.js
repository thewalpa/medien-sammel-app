import { useState, useEffect, useCallback, useRef } from 'react'
import { THEMES, ANIMATED_BACKGROUNDS, DEFAULT_THEME_ID, DEFAULT_BG_ID } from '../data/themes'
import { saveSettings, loadSettings } from '../services/storage'

// Collect ALL possible CSS custom property keys across every theme
// so we can reset them all when switching
const ALL_THEME_KEYS = new Set()
THEMES.forEach((t) => Object.keys(t.colors).forEach((k) => ALL_THEME_KEYS.add(k)))

export function useTheme() {
  const [themeId, setThemeId] = useState(DEFAULT_THEME_ID)
  const [bgId, setBgId] = useState(DEFAULT_BG_ID)
  const [customBgUrl, setCustomBgUrl] = useState('')
  const [loaded, setLoaded] = useState(false)
  const prevKeys = useRef(new Set())

  // Load settings on mount
  useEffect(() => {
    loadSettings().then((s) => {
      if (s) {
        if (s.themeId) setThemeId(s.themeId)
        if (s.bgId) setBgId(s.bgId)
        if (s.customBgUrl) setCustomBgUrl(s.customBgUrl)
      }
      setLoaded(true)
    }).catch(() => setLoaded(true))
  }, [])

  // Apply theme to :root
  useEffect(() => {
    if (!loaded) return
    const theme = THEMES.find((t) => t.id === themeId) || THEMES[0]
    const root = document.documentElement

    // FIRST: clear ALL known theme properties so stale values from
    // the previous theme (e.g. warm-light's glass/shadow overrides)
    // don't bleed through.
    ALL_THEME_KEYS.forEach((key) => {
      root.style.removeProperty(key)
    })

    // Also clear any keys we set last time that might not be in ALL_THEME_KEYS
    prevKeys.current.forEach((key) => {
      root.style.removeProperty(key)
    })

    // THEN: apply the new theme's properties
    const newKeys = new Set()
    Object.entries(theme.colors).forEach(([key, value]) => {
      root.style.setProperty(key, value)
      newKeys.add(key)
    })
    prevKeys.current = newKeys

    // Background image
    if (customBgUrl) {
      root.style.setProperty('--custom-bg-image', 'url(' + customBgUrl + ')')
    } else {
      root.style.setProperty('--custom-bg-image', 'none')
    }

    // Animated background class
    const body = document.body
    ANIMATED_BACKGROUNDS.forEach((bg) => {
      if (bg.className) body.classList.remove(bg.className)
    })
    const activeBg = ANIMATED_BACKGROUNDS.find((b) => b.id === bgId)
    if (activeBg?.className) body.classList.add(activeBg.className)

    // Persist
    saveSettings({ themeId, bgId, customBgUrl }).catch(() => {})
  }, [themeId, bgId, customBgUrl, loaded])

  const changeTheme = useCallback((id) => setThemeId(id), [])
  const changeBg = useCallback((id) => { setBgId(id); if (id !== 'custom') setCustomBgUrl('') }, [])
  const changeCustomBg = useCallback((url) => { setCustomBgUrl(url); setBgId('custom') }, [])

  return { themeId, bgId, customBgUrl, changeTheme, changeBg, changeCustomBg, loaded }
}
