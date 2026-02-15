import { cn } from "@renderer/lib/utils"
import nvidiaLogo from "@renderer/assets/nvidia-cc-icon.png"
import { useTheme } from "@renderer/contexts/theme-context"

interface LoadingSpinnerProps {
  className?: string
  size?: "sm" | "md" | "lg"
  showText?: boolean
  text?: string
  useFrostSidebarLogo?: boolean
}

const sizeClasses = {
  sm: "w-6 h-6",
  md: "w-8 h-8",
  lg: "w-12 h-12",
}

export function LoadingSpinner({
  className,
  size = "md",
  showText = false,
  text = "Loading...",
}: LoadingSpinnerProps) {
  const { isDark } = useTheme()
  const spinnerImageClassName = cn(
    sizeClasses[size],
    "object-contain animate-pulse",
  )

  return (
    <div className={cn("flex items-center justify-center", className)}>
      <div className="flex items-center gap-2">
        <img
          src={nvidiaLogo}
          alt="Loading..."
          className={spinnerImageClassName}
        />
        {showText && (
          <span className="text-sm text-muted-foreground">{text}</span>
        )}
      </div>
    </div>
  )
}
