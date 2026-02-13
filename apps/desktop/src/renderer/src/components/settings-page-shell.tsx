import { cn } from "@renderer/lib/utils"
import { CSSProperties, PropsWithChildren, useMemo } from "react"

type SettingsPageShellProps = PropsWithChildren<{
  className?: string
}>

type PulseAxis = "x" | "y"
type PulseDirection = "forward" | "reverse"

type PulseStyle = CSSProperties &
  Record<
    | "--frost-energy-start-x"
    | "--frost-energy-end-x"
    | "--frost-energy-start-y"
    | "--frost-energy-end-y",
    string
  >

type PulseConfig = {
  id: string
  axis: PulseAxis
  direction: PulseDirection
  style: PulseStyle
}

const PULSES_PER_AXIS = 4
const TOTAL_PULSES = PULSES_PER_AXIS * 2

function createPulseConfigs(): PulseConfig[] {
  const travelStart = "calc(var(--ncc-main-lane-travel-padding, 320px) * -1)"
  const travelEnd = "calc(100% + var(--ncc-main-lane-travel-padding, 320px))"
  const rand = (() => {
    let seed = (Math.random() * 0x7fffffff) | 0
    return () => {
      seed = (seed * 1664525 + 1013904223) | 0
      return (seed >>> 0) / 0xffffffff
    }
  })()

  const createAxisPulse = (axis: PulseAxis, laneIndex: number): PulseConfig => {
    const direction: PulseDirection =
      (laneIndex + (axis === "x" ? 0 : 1)) % 2 === 0 ? "forward" : "reverse"
    const base = (laneIndex + 1) / (PULSES_PER_AXIS + 1)
    const jitter = (rand() - 0.5) * 0.16
    const lane = Math.min(0.92, Math.max(0.08, base + jitter))
    const duration = 24 + rand() * 14
    const phase = 0.12 + rand() * 0.76
    const delay = -phase * duration

    const style: PulseStyle = {
      animationDuration: `${duration.toFixed(2)}s`,
      animationDelay: `${delay.toFixed(2)}s`,
      "--frost-energy-start-x":
        direction === "forward" ? travelStart : travelEnd,
      "--frost-energy-end-x": direction === "forward" ? travelEnd : travelStart,
      "--frost-energy-start-y":
        direction === "forward" ? travelStart : travelEnd,
      "--frost-energy-end-y": direction === "forward" ? travelEnd : travelStart,
    }

    if (axis === "x") {
      style.top = `${(lane * 100).toFixed(2)}%`
    } else {
      style.left = `${(lane * 100).toFixed(2)}%`
    }

    return {
      id: `${axis}-${laneIndex}`,
      axis,
      direction,
      style,
    }
  }

  return Array.from({ length: TOTAL_PULSES }, (_, index) => {
    const axis: PulseAxis = index < PULSES_PER_AXIS ? "x" : "y"
    const laneIndex = index % PULSES_PER_AXIS
    return createAxisPulse(axis, laneIndex)
  })
}

export function SettingsPageShell({
  className,
  children,
}: SettingsPageShellProps) {
  const pulses = useMemo(() => createPulseConfigs(), [])

  return (
    <div
      className={cn("settings-page-shell settings-main-lane-tuning", className)}
    >
      <div className="settings-page-energy-overlay" aria-hidden="true">
        {pulses.map((pulse) => (
          <div
            key={pulse.id}
            className={cn(
              "settings-page-energy-pulse",
              pulse.axis === "x"
                ? "settings-page-energy-pulse-x"
                : "settings-page-energy-pulse-y",
              pulse.direction === "forward"
                ? "settings-page-energy-pulse-forward"
                : "settings-page-energy-pulse-reverse",
            )}
            style={pulse.style}
          >
            <span className="settings-page-energy-pulse-line" />
            <span className="settings-page-energy-pulse-dot" />
          </div>
        ))}
      </div>

      {children}
    </div>
  )
}
