import React, { createContext, useContext, useEffect, useState, ReactNode } from "react"

export type ThemeMode = "light" | "dark" | "frost" | "system"

interface ThemeContextType {
  theme: "light" | "dark" | "frost"
  themeMode: ThemeMode
  isDark: boolean
  isLight: boolean
  isFrost: boolean
  setThemeMode: (mode: ThemeMode) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

const VALID_MODES: ThemeMode[] = ["light", "dark", "frost", "system"]

interface ThemeProviderProps {
  children: ReactNode
}

function applyThemeClass(resolved: "light" | "dark" | "frost") {
  const root = document.documentElement
  root.classList.remove("dark", "frost")
  if (resolved === "dark") {
    root.classList.add("dark")
  } else if (resolved === "frost") {
    root.classList.add("frost")
  }
}

function resolveTheme(mode: ThemeMode): "light" | "dark" | "frost" {
  if (mode === "light") return "light"
  if (mode === "dark") return "dark"
  if (mode === "frost") return "frost"
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => {
    try {
      const stored = localStorage.getItem("theme-preference")
      if (stored && VALID_MODES.includes(stored as ThemeMode)) {
        return stored as ThemeMode
      }
    } catch (e) {}
    return "system"
  })

  const [theme, setTheme] = useState<"light" | "dark" | "frost">(() => {
    return resolveTheme(themeMode)
  })

  // Update theme when themeMode changes
  useEffect(() => {
    const newTheme = resolveTheme(themeMode)
    setTheme(newTheme)
    applyThemeClass(newTheme)

    try {
      localStorage.setItem("theme-preference", themeMode)
    } catch (e) {}

    window.dispatchEvent(
      new CustomEvent("theme-preference-changed", {
        detail: themeMode,
      })
    )
  }, [themeMode])

  // Listen for system theme changes when in system mode
  useEffect(() => {
    if (themeMode !== "system") return undefined

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")

    const handleChange = (e: MediaQueryListEvent) => {
      const newTheme = e.matches ? "dark" : "light"
      setTheme(newTheme)
      applyThemeClass(newTheme)
    }

    mediaQuery.addEventListener("change", handleChange)
    return () => mediaQuery.removeEventListener("change", handleChange)
  }, [themeMode])

  useEffect(() => {
    const handleThemeChange = (e: CustomEvent) => {
      const newMode = e.detail as ThemeMode
      if (VALID_MODES.includes(newMode)) {
        setThemeModeState(newMode)
      }
    }

    window.addEventListener("theme-preference-changed", handleThemeChange as EventListener)
    return () => window.removeEventListener("theme-preference-changed", handleThemeChange as EventListener)
  }, [])

  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation.type === "attributes" &&
          mutation.attributeName === "class"
        ) {
          const root = document.documentElement
          const hasDark = root.classList.contains("dark")
          const hasFrost = root.classList.contains("frost")
          const expectedTheme = resolveTheme(themeMode)

          const currentFromClass = hasFrost ? "frost" : hasDark ? "dark" : "light"
          if (currentFromClass !== expectedTheme) {
            setTheme(currentFromClass as "light" | "dark" | "frost")
          }
        }
      })
    })

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    })

    return () => observer.disconnect()
  }, [themeMode])

  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode)
  }

  const toggleTheme = () => {
    setThemeMode(theme === "dark" ? "light" : "dark")
  }

  const contextValue: ThemeContextType = {
    theme,
    themeMode,
    isDark: theme === "dark" || theme === "frost",
    isLight: theme === "light",
    isFrost: theme === "frost",
    setThemeMode,
    toggleTheme,
  }

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }
  return context
}

export function useThemeDetection() {
  const { isDark } = useTheme()
  return { isDark }
}
