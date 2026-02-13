import { cn } from "@renderer/lib/utils"
import loadingSpinnerGif from "@renderer/assets/loading-spinner.gif"
import lightSpinnerGif from "@renderer/assets/light-spinner.gif"
import frostLogoGlobePng from "@renderer/assets/frost-logo-globe.png"
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
  useFrostSidebarLogo = false,
}: LoadingSpinnerProps) {
  const { isDark, isFrost } = useTheme()
  const showFrostSidebarLogo = useFrostSidebarLogo && isFrost
  const spinnerSrc = showFrostSidebarLogo
    ? frostLogoGlobePng
    : isDark
      ? loadingSpinnerGif
      : lightSpinnerGif
  const spinnerImageClassName = cn(
    sizeClasses[size],
    "object-contain",
    isFrost && "frost-gif-spinner-logo",
  )

  return (
    <div className={cn("flex items-center justify-center", className)}>
      <div className="flex items-center gap-2">
        {showFrostSidebarLogo ? (
          <div className={cn(sizeClasses[size], "frost-sidebar-spinner-frame")}>
            <img
              src={spinnerSrc}
              alt="Loading..."
              className="frost-sidebar-spinner-logo"
            />
          </div>
        ) : (
          <img
            src={spinnerSrc}
            alt="Loading..."
            className={spinnerImageClassName}
          />
        )}
        {showText && (
          <span className="text-muted-foreground text-sm">{text}</span>
        )}
      </div>
    </div>
  )
}
