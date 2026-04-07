import { useEffect, useRef, useCallback } from 'react'
import { saveCanvas, loadCanvas } from '../services/storage'

export function usePersistence(canvasState, loadState) {
  const initialized = useRef(false)
  const saveTimer = useRef(null)

  // Load on mount
  useEffect(() => {
    loadCanvas().then((data) => {
      if (data && (data.nodes?.length || data.edges?.length)) {
        loadState(data)
      }
      initialized.current = true
    }).catch((err) => {
      console.warn('Failed to load canvas:', err)
      initialized.current = true
    })
  }, [loadState])

  // Auto-save on changes (debounced)
  useEffect(() => {
    if (!initialized.current) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      saveCanvas(canvasState).catch((err) => console.warn('Failed to save canvas:', err))
    }, 500)
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current) }
  }, [canvasState.nodes, canvasState.edges, canvasState.viewport])
}
