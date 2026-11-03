import { useCallback, useEffect, useRef, useState } from "react"
import { api, readStorage, writeStorage } from "./api.js"

const soundPreference = "lt.message-sound"

function playChime(context) {
  if (context?.state !== "running") return false
  const start = context.currentTime
  const volume = context.createGain()
  volume.connect(context.destination)
  volume.gain.setValueAtTime(0.001, start)
  volume.gain.exponentialRampToValueAtTime(0.12, start + 0.025)
  volume.gain.exponentialRampToValueAtTime(0.001, start + 0.29)
  const note = context.createOscillator()
  note.type = "sine"
  note.frequency.setValueAtTime(660, start)
  note.frequency.setValueAtTime(880, start + 0.095)
  note.connect(volume)
  note.start(start)
  note.stop(start + 0.3)
  note.onended = () => {
    note.disconnect()
    volume.disconnect()
  }
  return true
}

export function useMessageAlerts(userId, admin = false) {
  const scope = (admin ? "admin:" : "account:") + userId
  const [receipt, setReceipt] = useState(null)
  const [enabled, setEnabled] = useState(
    () => readStorage(soundPreference, false) === true,
  )
  const context = useRef(null)
  const refreshRef = useRef(null)
  const seen = useRef(null)
  const refresh = useCallback(() => refreshRef.current?.(), [])

  async function unlockSound() {
    const Audio = window.AudioContext || window.webkitAudioContext
    if (!Audio) return
    try {
      context.current ||= new Audio()
      if (context.current.state === "suspended") await context.current.resume()
    } catch {}
  }

  function toggle() {
    const next = !enabled
    setEnabled(next)
    writeStorage(soundPreference, next)
    if (next) void unlockSound().then(() => playChime(context.current))
  }

  useEffect(() => {
    if (!enabled || !userId) return
    // Browsers require a gesture to play sound in a newly opened tab.
    const unlock = () => void unlockSound()
    window.addEventListener("click", unlock, { once: true })
    window.addEventListener("keydown", unlock, { once: true })
    return () => {
      window.removeEventListener("click", unlock)
      window.removeEventListener("keydown", unlock)
    }
  }, [enabled, userId])

  useEffect(
    () => () => {
      const audio = context.current
      context.current = null
      if (audio && audio.state !== "closed") void audio.close().catch(() => {})
    },
    [],
  )

  useEffect(() => {
    if (!userId) return
    const controller = new AbortController()
    const playedKey = "lt.message-chime:" + scope
    let timer,
      inFlight = false
    async function check() {
      if (
        inFlight ||
        controller.signal.aborted ||
        (document.hidden && !enabled)
      )
        return
      window.clearTimeout(timer)
      inFlight = true
      try {
        const path = admin ? "admin/messages/" : "messages/"
        const result = await api(path + "?summary=1", {
          cache: "no-store",
          signal: AbortSignal.any([
            controller.signal,
            AbortSignal.timeout(10000),
          ]),
        })
        if (
          controller.signal.aborted ||
          !Number.isSafeInteger(result.unreadTotal)
        )
          return
        setReceipt((current) =>
          current?.scope === scope && current.count === result.unreadTotal
            ? current
            : { scope, count: result.unreadTotal },
        )
        const incoming = result.latestInboundId
        if (
          enabled &&
          incoming &&
          seen.current?.scope === scope &&
          seen.current.id !== incoming &&
          readStorage(playedKey, null) !== incoming &&
          playChime(context.current)
        )
          writeStorage(playedKey, incoming)
        seen.current = { scope, id: incoming }
      } catch (error) {
        if (!controller.signal.aborted && [401, 403].includes(error.status)) {
          setReceipt(null)
          seen.current = null
          return
        }
      } finally {
        inFlight = false
        if (!controller.signal.aborted) timer = window.setTimeout(check, 4000)
      }
    }
    refreshRef.current = check
    void check()
    document.addEventListener("visibilitychange", check)
    window.addEventListener("focus", check)
    window.addEventListener("online", check)
    return () => {
      controller.abort()
      window.clearTimeout(timer)
      refreshRef.current = null
      document.removeEventListener("visibilitychange", check)
      window.removeEventListener("focus", check)
      window.removeEventListener("online", check)
    }
  }, [admin, enabled, scope, userId])

  return {
    unread: receipt?.scope === scope ? receipt.count : 0,
    enabled,
    toggle,
    refresh,
  }
}
