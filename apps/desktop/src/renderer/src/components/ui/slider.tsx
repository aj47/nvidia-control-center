import React from "react"
import { cn } from "@renderer/lib/utils"

interface SliderProps {
  value: number[]
  onValueChange: (value: number[]) => void
  max?: number
  min?: number
  step?: number
  className?: string
  disabled?: boolean
}

export function Slider({
  value,
  onValueChange,
  max = 100,
  min = 0,
  step = 1,
  className,
  disabled = false,
}: SliderProps) {
  const currentValue = value[0] || 0
  const percentage = ((currentValue - min) / (max - min)) * 100
  const trackBackground = `linear-gradient(to right, hsl(var(--primary)) 0%, hsl(var(--primary)) ${percentage}%, hsl(var(--muted)) ${percentage}%, hsl(var(--muted)) 100%)`

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value)
    onValueChange([newValue])
  }

  return (
    <div className={cn("relative flex items-center", className)}>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={currentValue}
        onChange={handleChange}
        disabled={disabled}
        className={cn(
          "h-2 w-full cursor-pointer appearance-none rounded-lg bg-muted",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4",
          "[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-primary/70 [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:cursor-pointer",
          "[&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:transition-all [&::-webkit-slider-thumb]:hover:bg-primary/90",
          "[&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full",
          "[&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-primary/70 [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:cursor-pointer",
          "[&::-moz-range-thumb]:shadow-md [&::-moz-range-thumb]:transition-all [&::-moz-range-thumb]:hover:bg-primary/90"
        )}
        style={{
          background: trackBackground,
        }}
      />
    </div>
  )
}
