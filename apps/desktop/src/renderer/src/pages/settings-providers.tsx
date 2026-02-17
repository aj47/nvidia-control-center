import { useCallback, useMemo, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Control, ControlGroup, ControlLabel } from "@renderer/components/ui/control"
import { Input } from "@renderer/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@renderer/components/ui/select"
import { Switch } from "@renderer/components/ui/switch"
import { Button } from "@renderer/components/ui/button"
import {
  useConfigQuery,
  useSaveConfigMutation,
} from "@renderer/lib/query-client"
import { Config, ModelPreset } from "@shared/types"
import { ProviderModelSelector } from "@renderer/components/model-selector"
import { PresetModelSelector } from "@renderer/components/preset-model-selector"
import { ProfileBadgeCompact } from "@renderer/components/profile-badge"
import { Mic, Bot, Volume2, FileText, CheckCircle2, ChevronDown, ChevronRight, Brain, Zap, BookOpen, Cpu, Download, Loader2, Settings2 } from "lucide-react"
import { SettingsPageShell } from "@renderer/components/settings-page-shell"

import {
  TTS_PROVIDERS,
  TTS_PROVIDER_ID,
  KITTEN_TTS_VOICES,
  SUPERTONIC_TTS_VOICES,
  SUPERTONIC_TTS_LANGUAGES,
  getBuiltInModelPresets,
  DEFAULT_MODEL_PRESET_ID,
} from "@shared/index"

// Badge component to show which features are using this provider
function ActiveProviderBadge({ label, icon: Icon }: { label: string; icon: React.ElementType }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
      <Icon className="h-3 w-3" />
      {label}
    </span>
  )
}

// Parakeet Model Download Component
function ParakeetModelDownload() {
  const queryClient = useQueryClient()
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState(0)

  const modelStatusQuery = useQuery({
    queryKey: ["parakeetModelStatus"],
    queryFn: () => window.electron.ipcRenderer.invoke("getParakeetModelStatus"),
    // Poll while downloading (either local state or server state) to keep progress updated
    refetchInterval: (query) => {
      const status = query.state.data as { downloading?: boolean } | undefined
      return (isDownloading || status?.downloading) ? 500 : false
    },
  })

  const handleDownload = async () => {
    setIsDownloading(true)
    setDownloadProgress(0)
    try {
      await window.electron.ipcRenderer.invoke("downloadParakeetModel")
    } catch (error) {
      console.error("Failed to download Parakeet model:", error)
    } finally {
      setIsDownloading(false)
      // Always invalidate to show final state (success or error)
      queryClient.invalidateQueries({ queryKey: ["parakeetModelStatus"] })
    }
  }

  const status = modelStatusQuery.data as { downloaded: boolean; downloading: boolean; progress: number; error?: string } | undefined

  if (modelStatusQuery.isLoading) {
    return <span className="text-xs text-muted-foreground">Checking...</span>
  }

  if (status?.downloaded) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-green-600">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Model Ready
      </span>
    )
  }

  if (status?.downloading || isDownloading) {
    const progress = status?.progress ?? downloadProgress
    return (
      <div className="flex flex-col gap-1.5 w-full">
        <div className="flex items-center gap-2">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
          <span className="text-xs text-muted-foreground">
            Downloading... {Math.round(progress * 100)}%
          </span>
        </div>
        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-200"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>
    )
  }

  if (status?.error) {
    return (
      <div className="flex flex-col gap-1.5">
        <span className="text-xs text-destructive">{status.error}</span>
        <Button size="sm" variant="outline" onClick={handleDownload}>
          <Download className="h-3.5 w-3.5 mr-1.5" />
          Retry Download
        </Button>
      </div>
    )
  }

  return (
    <Button size="sm" variant="outline" onClick={handleDownload}>
      <Download className="h-3.5 w-3.5 mr-1.5" />
      Download Model (~200MB)
    </Button>
  )
}

// Parakeet Provider Section Component
function ParakeetProviderSection({
  isActive,
  isCollapsed,
  onToggleCollapse,
  usageBadges,
  numThreads,
  onNumThreadsChange,
}: {
  isActive: boolean
  isCollapsed: boolean
  onToggleCollapse: () => void
  usageBadges: { label: string; icon: React.ElementType }[]
  numThreads: number
  onNumThreadsChange: (value: number) => void
}) {
  return (
    <div className={`rounded-lg border ${isActive ? 'border-primary/30 bg-primary/5' : ''}`}>
      <button
        type="button"
        className="px-3 py-2 flex items-center justify-between w-full hover:bg-muted/30 transition-colors cursor-pointer"
        onClick={onToggleCollapse}
        aria-expanded={!isCollapsed}
        aria-controls="parakeet-provider-content"
      >
        <span className="flex items-center gap-2 text-sm font-semibold">
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
          <Cpu className="h-4 w-4" />
          Parakeet (Local)
          {isActive && (
            <CheckCircle2 className="h-4 w-4 text-primary" />
          )}
        </span>
        {isActive && usageBadges.length > 0 && (
          <div className="flex gap-1.5 flex-wrap justify-end">
            {usageBadges.map((badge) => (
              <ActiveProviderBadge key={badge.label} label={badge.label} icon={badge.icon} />
            ))}
          </div>
        )}
      </button>
      {!isCollapsed && (
        <div id="parakeet-provider-content" className="divide-y border-t">
          <div className="px-3 py-2 bg-muted/30 border-b">
            <p className="text-xs text-muted-foreground">
              {isActive
                ? "Local speech-to-text using NVIDIA Parakeet. No API key required - runs entirely on your device."
                : "This provider is not currently selected for any feature. Select it above to use it."}
            </p>
          </div>

          {/* Model Download Section */}
          <Control
            label={
              <ControlLabel
                label="Model Status"
                tooltip="Download the Parakeet model (~200MB) for local transcription"
              />
            }
            className="px-3"
          >
            <ParakeetModelDownload />
          </Control>

          {/* Thread Count */}
          <Control
            label={
              <ControlLabel
                label="CPU Threads"
                tooltip="Number of CPU threads to use for transcription (higher = faster but uses more resources)"
              />
            }
            className="px-3"
          >
            <Select
              value={String(numThreads)}
              onValueChange={(value) => onNumThreadsChange(parseInt(value))}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 thread</SelectItem>
                <SelectItem value="2">2 threads</SelectItem>
                <SelectItem value="4">4 threads</SelectItem>
                <SelectItem value="8">8 threads</SelectItem>
              </SelectContent>
            </Select>
          </Control>
        </div>
      )}
    </div>
  )
}

// Kitten Model Download Component
function KittenModelDownload() {
  const queryClient = useQueryClient()
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState(0)

  const modelStatusQuery = useQuery({
    queryKey: ["kittenModelStatus"],
    queryFn: () => window.electron.ipcRenderer.invoke("getKittenModelStatus"),
    refetchInterval: (query) => {
      const status = query.state.data as { downloading?: boolean } | undefined
      return (isDownloading || status?.downloading) ? 500 : false
    },
  })

  const handleDownload = async () => {
    setIsDownloading(true)
    setDownloadProgress(0)
    try {
      await window.electron.ipcRenderer.invoke("downloadKittenModel")
    } catch (error) {
      console.error("Failed to download Kitten model:", error)
    } finally {
      setIsDownloading(false)
      queryClient.invalidateQueries({ queryKey: ["kittenModelStatus"] })
    }
  }

  const status = modelStatusQuery.data as { downloaded: boolean; downloading: boolean; progress: number; error?: string } | undefined

  if (modelStatusQuery.isLoading) {
    return <span className="text-xs text-muted-foreground">Checking...</span>
  }

  if (status?.downloaded) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-green-600">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Model Ready
      </span>
    )
  }

  if (status?.downloading || isDownloading) {
    const progress = status?.progress ?? downloadProgress
    return (
      <div className="flex flex-col gap-1.5 w-full">
        <div className="flex items-center gap-2">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
          <span className="text-xs text-muted-foreground">
            Downloading... {Math.round(progress * 100)}%
          </span>
        </div>
        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-200"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>
    )
  }

  if (status?.error) {
    return (
      <div className="flex flex-col gap-1.5">
        <span className="text-xs text-destructive">{status.error}</span>
        <Button size="sm" variant="outline" onClick={handleDownload}>
          <Download className="h-3.5 w-3.5 mr-1.5" />
          Retry Download
        </Button>
      </div>
    )
  }

  return (
    <Button size="sm" variant="outline" onClick={handleDownload}>
      <Download className="h-3.5 w-3.5 mr-1.5" />
      Download Model (~24MB)
    </Button>
  )
}

// Kitten Provider Section Component
function KittenProviderSection({
  isActive,
  isCollapsed,
  onToggleCollapse,
  usageBadges,
  voiceId,
  onVoiceIdChange,
}: {
  isActive: boolean
  isCollapsed: boolean
  onToggleCollapse: () => void
  usageBadges: { label: string; icon: React.ElementType }[]
  voiceId: number
  onVoiceIdChange: (value: number) => void
}) {
  const modelStatusQuery = useQuery({
    queryKey: ["kittenModelStatus"],
    queryFn: () => window.electron.ipcRenderer.invoke("getKittenModelStatus"),
  })
  const modelDownloaded = (modelStatusQuery.data as { downloaded: boolean } | undefined)?.downloaded ?? false
  const handleTestVoice = async () => {
    try {
      const result = await window.electron.ipcRenderer.invoke("synthesizeWithKitten", {
        text: "Hello! This is a test of the Kitten text to speech voice.",
        voiceId,
      }) as { audio: string; sampleRate: number }
      const audioData = Uint8Array.from(atob(result.audio), c => c.charCodeAt(0))
      const blob = new Blob([audioData], { type: "audio/wav" })
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audio.onended = () => URL.revokeObjectURL(url)
      audio.onerror = () => URL.revokeObjectURL(url)
      await audio.play()
    } catch (error) {
      console.error("Failed to test Kitten voice:", error)
    }
  }

  return (
    <div className={`rounded-lg border ${isActive ? 'border-primary/30 bg-primary/5' : ''}`}>
      <button
        type="button"
        className="px-3 py-2 flex items-center justify-between w-full hover:bg-muted/30 transition-colors cursor-pointer"
        onClick={onToggleCollapse}
        aria-expanded={!isCollapsed}
        aria-controls="kitten-provider-content"
      >
        <span className="flex items-center gap-2 text-sm font-semibold">
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
          <Volume2 className="h-4 w-4" />
          Kitten (Local)
          {isActive && (
            <CheckCircle2 className="h-4 w-4 text-primary" />
          )}
        </span>
        {isActive && usageBadges.length > 0 && (
          <div className="flex gap-1.5 flex-wrap justify-end">
            {usageBadges.map((badge) => (
              <ActiveProviderBadge key={badge.label} label={badge.label} icon={badge.icon} />
            ))}
          </div>
        )}
      </button>
      {!isCollapsed && (
        <div id="kitten-provider-content" className="divide-y border-t">
          <div className="px-3 py-2 bg-muted/30 border-b">
            <p className="text-xs text-muted-foreground">
              {isActive
                ? "Local text-to-speech using Kitten TTS. No API key required - runs entirely on your device."
                : "This provider is not currently selected for any feature. Select it above to use it."}
            </p>
          </div>

          <Control
            label={
              <ControlLabel
                label="Model Status"
                tooltip="Download the Kitten TTS model (~24MB) for local speech synthesis"
              />
            }
            className="px-3"
          >
            <KittenModelDownload />
          </Control>

          {modelDownloaded && (
            <>
              <Control
                label={
                  <ControlLabel
                    label="Voice"
                    tooltip="Select the voice to use for text-to-speech synthesis"
                  />
                }
                className="px-3"
              >
                <Select
                  value={String(voiceId)}
                  onValueChange={(value) => onVoiceIdChange(parseInt(value))}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {KITTEN_TTS_VOICES.map((voice) => (
                      <SelectItem key={voice.value} value={String(voice.value)}>
                        {voice.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Control>

              <Control
                label={
                  <ControlLabel
                    label="Test Voice"
                    tooltip="Play a sample phrase using the selected voice"
                  />
                }
                className="px-3"
              >
                <Button size="sm" variant="outline" onClick={handleTestVoice}>
                  <Volume2 className="h-3.5 w-3.5 mr-1.5" />
                  Test Voice
                </Button>
              </Control>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// Supertonic Model Download Component
function SupertonicModelDownload() {
  const queryClient = useQueryClient()
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState(0)

  const modelStatusQuery = useQuery({
    queryKey: ["supertonicModelStatus"],
    queryFn: () => window.electron.ipcRenderer.invoke("getSupertonicModelStatus"),
    refetchInterval: (query) => {
      const status = query.state.data as { downloading?: boolean } | undefined
      return (isDownloading || status?.downloading) ? 500 : false
    },
  })

  const handleDownload = async () => {
    setIsDownloading(true)
    setDownloadProgress(0)
    try {
      await window.electron.ipcRenderer.invoke("downloadSupertonicModel")
    } catch (error) {
      console.error("Failed to download Supertonic model:", error)
    } finally {
      setIsDownloading(false)
      queryClient.invalidateQueries({ queryKey: ["supertonicModelStatus"] })
    }
  }

  const status = modelStatusQuery.data as { downloaded: boolean; downloading: boolean; progress: number; error?: string } | undefined

  if (modelStatusQuery.isLoading) {
    return <span className="text-xs text-muted-foreground">Checking...</span>
  }

  if (status?.downloaded) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-green-600">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Model Ready
      </span>
    )
  }

  if (status?.downloading || isDownloading) {
    const progress = status?.progress ?? downloadProgress
    return (
      <div className="flex flex-col gap-1.5 w-full">
        <div className="flex items-center gap-2">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
          <span className="text-xs text-muted-foreground">
            Downloading... {Math.round(progress * 100)}%
          </span>
        </div>
        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-200"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>
    )
  }

  if (status?.error) {
    return (
      <div className="flex flex-col gap-1.5">
        <span className="text-xs text-destructive">{status.error}</span>
        <Button size="sm" variant="outline" onClick={handleDownload}>
          <Download className="h-3.5 w-3.5 mr-1.5" />
          Retry Download
        </Button>
      </div>
    )
  }

  return (
    <Button size="sm" variant="outline" onClick={handleDownload}>
      <Download className="h-3.5 w-3.5 mr-1.5" />
      Download Model (~263MB)
    </Button>
  )
}

// Supertonic Provider Section Component
function SupertonicProviderSection({
  isActive,
  isCollapsed,
  onToggleCollapse,
  usageBadges,
  voice,
  onVoiceChange,
  language,
  onLanguageChange,
  speed,
  onSpeedChange,
  steps,
  onStepsChange,
}: {
  isActive: boolean
  isCollapsed: boolean
  onToggleCollapse: () => void
  usageBadges: { label: string; icon: React.ElementType }[]
  voice: string
  onVoiceChange: (value: string) => void
  language: string
  onLanguageChange: (value: string) => void
  speed: number
  onSpeedChange: (value: number) => void
  steps: number
  onStepsChange: (value: number) => void
}) {
  const modelStatusQuery = useQuery({
    queryKey: ["supertonicModelStatus"],
    queryFn: () => window.electron.ipcRenderer.invoke("getSupertonicModelStatus"),
  })
  const modelDownloaded = (modelStatusQuery.data as { downloaded: boolean } | undefined)?.downloaded ?? false

  const handleTestVoice = async () => {
    try {
      const result = await window.electron.ipcRenderer.invoke("synthesizeWithSupertonic", {
        text: "Hello! This is a test of the Supertonic text to speech voice.",
        voice,
        lang: language,
        speed,
        steps,
      }) as { audio: string; sampleRate: number }
      const audioData = Uint8Array.from(atob(result.audio), c => c.charCodeAt(0))
      const blob = new Blob([audioData], { type: "audio/wav" })
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audio.onended = () => URL.revokeObjectURL(url)
      audio.onerror = () => URL.revokeObjectURL(url)
      await audio.play()
    } catch (error) {
      console.error("Failed to test Supertonic voice:", error)
    }
  }

  return (
    <div className={`rounded-lg border ${isActive ? 'border-primary/30 bg-primary/5' : ''}`}>
      <button
        type="button"
        className="px-3 py-2 flex items-center justify-between w-full hover:bg-muted/30 transition-colors cursor-pointer"
        onClick={onToggleCollapse}
        aria-expanded={!isCollapsed}
        aria-controls="supertonic-provider-content"
      >
        <span className="flex items-center gap-2 text-sm font-semibold">
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
          <Volume2 className="h-4 w-4" />
          Supertonic (Local)
          {isActive && (
            <CheckCircle2 className="h-4 w-4 text-primary" />
          )}
        </span>
        {isActive && usageBadges.length > 0 && (
          <div className="flex gap-1.5 flex-wrap justify-end">
            {usageBadges.map((badge) => (
              <ActiveProviderBadge key={badge.label} label={badge.label} icon={badge.icon} />
            ))}
          </div>
        )}
      </button>
      {!isCollapsed && (
        <div id="supertonic-provider-content" className="divide-y border-t">
          <div className="px-3 py-2 bg-muted/30 border-b">
            <p className="text-xs text-muted-foreground">
              {isActive
                ? "Local text-to-speech using Supertonic. No API key required - runs entirely on your device. Supports English, Korean, Spanish, Portuguese, and French."
                : "This provider is not currently selected for any feature. Select it above to use it."}
            </p>
          </div>

          <Control
            label={
              <ControlLabel
                label="Model Status"
                tooltip="Download the Supertonic TTS model (~263MB) for local speech synthesis"
              />
            }
            className="px-3"
          >
            <SupertonicModelDownload />
          </Control>

          {modelDownloaded && (
            <>
              <Control
                label={
                  <ControlLabel
                    label="Voice"
                    tooltip="Select the voice style to use for speech synthesis"
                  />
                }
                className="px-3"
              >
                <Select
                  value={voice}
                  onValueChange={onVoiceChange}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SUPERTONIC_TTS_VOICES.map((v) => (
                      <SelectItem key={v.value} value={v.value}>
                        {v.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Control>

              <Control
                label={
                  <ControlLabel
                    label="Language"
                    tooltip="Select the language for speech synthesis"
                  />
                }
                className="px-3"
              >
                <Select
                  value={language}
                  onValueChange={onLanguageChange}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SUPERTONIC_TTS_LANGUAGES.map((l) => (
                      <SelectItem key={l.value} value={l.value}>
                        {l.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Control>

              <Control
                label={
                  <ControlLabel
                    label="Speed"
                    tooltip="Speech speed multiplier (default: 1.05)"
                  />
                }
                className="px-3"
              >
                <Input
                  type="number"
                  min={0.5}
                  max={2.0}
                  step={0.05}
                  className="w-[100px]"
                  value={speed}
                  onChange={(e) => {
                    const val = parseFloat(e.currentTarget.value)
                    if (!isNaN(val) && val >= 0.5 && val <= 2.0) {
                      onSpeedChange(val)
                    }
                  }}
                />
              </Control>

              <Control
                label={
                  <ControlLabel
                    label="Quality Steps"
                    tooltip="Number of denoising steps (2-10). Higher = better quality but slower."
                  />
                }
                className="px-3"
              >
                <Input
                  type="number"
                  min={2}
                  max={10}
                  step={1}
                  className="w-[100px]"
                  value={steps}
                  onChange={(e) => {
                    const val = parseInt(e.currentTarget.value)
                    if (!isNaN(val) && val >= 2 && val <= 10) {
                      onStepsChange(val)
                    }
                  }}
                />
              </Control>

              <Control
                label={
                  <ControlLabel
                    label="Test Voice"
                    tooltip="Play a sample phrase using the selected voice and settings"
                  />
                }
                className="px-3"
              >
                <Button size="sm" variant="outline" onClick={handleTestVoice}>
                  <Volume2 className="h-3.5 w-3.5 mr-1.5" />
                  Test Voice
                </Button>
              </Control>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export function Component() {
  const configQuery = useConfigQuery()

  const saveConfigMutation = useSaveConfigMutation()

  const saveConfig = useCallback(
    (config: Partial<Config>) => {
      saveConfigMutation.mutate({
        config: {
          ...configQuery.data,
          ...config,
        },
      })
    },
    [saveConfigMutation, configQuery.data],
  )

  // Compute which providers are actively being used for each function
  const activeProviders = useMemo(() => {
    if (!configQuery.data) return { nemotron: [], parakeet: [], kitten: [], supertonic: [] }

    const stt = configQuery.data.sttProviderId || "parakeet"
    const transcript = configQuery.data.transcriptPostProcessingProviderId || "nemotron"
    const mcp = configQuery.data.mcpToolsProviderId || "nemotron"
    const tts = configQuery.data.ttsProviderId || "kitten"

    return {
      nemotron: [
        ...(transcript === "nemotron" ? [{ label: "Transcript", icon: FileText }] : []),
        ...(mcp === "nemotron" ? [{ label: "Agent", icon: Bot }] : []),
      ],
      parakeet: [
        ...(stt === "parakeet" ? [{ label: "STT", icon: Mic }] : []),
      ],
      kitten: [
        ...(tts === "kitten" ? [{ label: "TTS", icon: Volume2 }] : []),
      ],
      supertonic: [
        ...(tts === "supertonic" ? [{ label: "TTS", icon: Volume2 }] : []),
      ],
    }
  }, [configQuery.data])

  // Determine which providers are active (selected for at least one feature)
  const isNemotronActive = activeProviders.nemotron.length > 0
  const isParakeetActive = activeProviders.parakeet.length > 0
  const isKittenActive = activeProviders.kitten.length > 0
  const isSupertonicActive = activeProviders.supertonic.length > 0

  // Get all available presets for dual-model selection
  const allPresets = useMemo(() => {
    const builtIn = getBuiltInModelPresets()
    const custom = configQuery.data?.modelPresets || []

    // Merge built-in presets with any saved data
    const mergedBuiltIn = builtIn.map(preset => {
      const saved = custom.find(c => c.id === preset.id)
      if (saved) {
        return { ...preset, ...saved }
      }
      return preset
    })

    // Add custom (non-built-in) presets
    const customOnly = custom.filter(c => !c.isBuiltIn)
    return [...mergedBuiltIn, ...customOnly]
  }, [configQuery.data?.modelPresets])

  // Get preset by ID helper
  const getPresetById = (presetId: string | undefined): ModelPreset | undefined => {
    if (!presetId) return undefined
    return allPresets.find(p => p.id === presetId)
  }

  if (!configQuery.data) return null

  const config = configQuery.data
  const dualModelEnabled = config.dualModelEnabled ?? false
  const strongPresetId = config.dualModelStrongPresetId || config.currentModelPresetId || DEFAULT_MODEL_PRESET_ID
  const weakPresetId = config.dualModelWeakPresetId || config.currentModelPresetId || DEFAULT_MODEL_PRESET_ID
  const strongPreset = getPresetById(strongPresetId)
  const weakPreset = getPresetById(weakPresetId)

  return (
    <SettingsPageShell className="modern-panel h-full overflow-auto px-6 py-4">

      <div className="grid gap-4">
        {/* Provider Selection with clear visual hierarchy */}
        <ControlGroup title="Provider Selection">
          <div className="px-3 py-2 bg-muted/30 border-b">
            <p className="text-xs text-muted-foreground">
              Configure AI providers for each feature. Nemotron (NVIDIA NIM) for chat/transcript, Parakeet for local STT, and Kitten/Supertonic for local TTS.
            </p>
          </div>

          <Control
            label={
              <ControlLabel
                label={
                  <span className="flex items-center gap-2">
                    <Mic className="h-4 w-4 text-muted-foreground" />
                    Voice Transcription (STT)
                  </span>
                }
                tooltip="Parakeet provides local speech-to-text transcription - no API key required."
              />
            }
            className="px-3"
          >
            <span className="text-sm text-muted-foreground">Parakeet (Local)</span>
          </Control>

          <Control
            label={
              <ControlLabel
                label={
                  <span className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    Transcript Post-Processing
                  </span>
                }
                tooltip="Nemotron processes and cleans up transcripts."
              />
            }
            className="px-3"
          >
            <span className="text-sm text-muted-foreground">Nemotron (NVIDIA)</span>
          </Control>

          <Control
            label={
              <ControlLabel
                label={
                  <span className="flex items-center gap-2">
                    <Bot className="h-4 w-4 text-muted-foreground" />
                    Agent/MCP Tools
                    <ProfileBadgeCompact />
                  </span>
                }
                tooltip="Nemotron handles agent mode and MCP tool calling. This setting is saved per-profile."
              />
            }
            className="px-3"
          >
            <span className="text-sm text-muted-foreground">Nemotron (NVIDIA)</span>
          </Control>

          <Control
            label={
              <ControlLabel
                label={
                  <span className="flex items-center gap-2">
                    <Volume2 className="h-4 w-4 text-muted-foreground" />
                    Text-to-Speech (TTS)
                  </span>
                }
                tooltip="Choose which provider to use for text-to-speech generation."
              />
            }
            className="px-3"
          >
            <Select
              value={configQuery.data.ttsProviderId || "kitten"}
              onValueChange={(value) => saveConfig({ ttsProviderId: value as TTS_PROVIDER_ID })}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TTS_PROVIDERS.map((provider) => (
                  <SelectItem key={provider.value} value={provider.value}>
                    {provider.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Control>
        </ControlGroup>

        {/* Nemotron (NVIDIA NIM) Provider Section - always visible since it's the only chat provider */}
          <div className="rounded-lg border border-primary/30 bg-primary/5">
            <button
              type="button"
              className="px-3 py-2 flex items-center justify-between w-full hover:bg-muted/30 transition-colors cursor-pointer"
              onClick={() => saveConfig({ providerSectionCollapsedNemotron: !configQuery.data.providerSectionCollapsedNemotron })}
              aria-expanded={!configQuery.data.providerSectionCollapsedNemotron}
              aria-controls="nemotron-provider-content"
            >
              <span className="flex items-center gap-2 text-sm font-semibold">
                {configQuery.data.providerSectionCollapsedNemotron ? (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
                Nemotron (NVIDIA)
                <CheckCircle2 className="h-4 w-4 text-primary" />
              </span>
              <div className="flex gap-1.5 flex-wrap justify-end">
                {activeProviders.nemotron.map((badge) => (
                  <ActiveProviderBadge key={badge.label} label={badge.label} icon={badge.icon} />
                ))}
              </div>
            </button>
            {!configQuery.data.providerSectionCollapsedNemotron && (
              <div id="nemotron-provider-content" className="divide-y border-t">
                <div className="px-3 py-2 bg-muted/30 border-b">
                  <p className="text-xs text-muted-foreground">
                    NVIDIA NIM provides access to Nemotron models. Get your API key from{" "}
                    <a href="https://build.nvidia.com/" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                      build.nvidia.com
                    </a>
                  </p>
                </div>

                <Control label="API Key" className="px-3">
                  <Input
                    type="password"
                    placeholder="nvapi-..."
                    defaultValue={configQuery.data.nemotronApiKey}
                    onChange={(e) => {
                      saveConfig({
                        nemotronApiKey: e.currentTarget.value,
                      })
                    }}
                  />
                </Control>

                <Control label="API Base URL" className="px-3">
                  <Input
                    type="url"
                    placeholder="https://integrate.api.nvidia.com/v1"
                    defaultValue={configQuery.data.nemotronBaseUrl}
                    onChange={(e) => {
                      saveConfig({
                        nemotronBaseUrl: e.currentTarget.value,
                      })
                    }}
                  />
                </Control>

                <div className="px-3 py-2">
                  <ProviderModelSelector
                    providerId="nemotron"
                    mcpModel={configQuery.data.mcpToolsNemotronModel}
                    transcriptModel={configQuery.data.transcriptPostProcessingNemotronModel}
                    onMcpModelChange={(value) => saveConfig({ mcpToolsNemotronModel: value })}
                    onTranscriptModelChange={(value) => saveConfig({ transcriptPostProcessingNemotronModel: value })}
                    showMcpModel={true}
                    showTranscriptModel={true}
                  />
                </div>
              </div>
            )}
          </div>

        {/* Parakeet (Local) Provider Section - always visible since it's the only STT provider */}
        <ParakeetProviderSection
          isActive={true}
          isCollapsed={configQuery.data.providerSectionCollapsedParakeet ?? true}
          onToggleCollapse={() => saveConfig({ providerSectionCollapsedParakeet: !(configQuery.data.providerSectionCollapsedParakeet ?? true) })}
          usageBadges={activeProviders.parakeet}
          numThreads={configQuery.data.parakeetNumThreads || 2}
          onNumThreadsChange={(value) => saveConfig({ parakeetNumThreads: value })}
        />

        {/* Kitten (Local) TTS Provider Section */}
        {isKittenActive && (
          <KittenProviderSection
            isActive={true}
            isCollapsed={configQuery.data.providerSectionCollapsedKitten ?? true}
            onToggleCollapse={() => saveConfig({ providerSectionCollapsedKitten: !(configQuery.data.providerSectionCollapsedKitten ?? true) })}
            usageBadges={activeProviders.kitten}
            voiceId={configQuery.data.kittenVoiceId ?? 0}
            onVoiceIdChange={(value) => saveConfig({ kittenVoiceId: value })}
          />
        )}

        {/* Supertonic (Local) TTS Provider Section */}
        {isSupertonicActive && (
          <SupertonicProviderSection
            isActive={true}
            isCollapsed={configQuery.data.providerSectionCollapsedSupertonic ?? true}
            onToggleCollapse={() => saveConfig({ providerSectionCollapsedSupertonic: !(configQuery.data.providerSectionCollapsedSupertonic ?? true) } as Partial<Config>)}
            usageBadges={activeProviders.supertonic}
            voice={configQuery.data.supertonicVoice ?? "M1"}
            onVoiceChange={(value) => saveConfig({ supertonicVoice: value })}
            language={configQuery.data.supertonicLanguage ?? "en"}
            onLanguageChange={(value) => saveConfig({ supertonicLanguage: value })}
            speed={configQuery.data.supertonicSpeed ?? 1.05}
            onSpeedChange={(value) => saveConfig({ supertonicSpeed: value })}
            steps={configQuery.data.supertonicSteps ?? 5}
            onStepsChange={(value) => saveConfig({ supertonicSteps: value })}
          />
        )}

        {/* Dual-Model Agent Mode Section */}
        <div className={`rounded-lg border ${dualModelEnabled ? 'border-primary/30 bg-primary/5' : ''}`}>
          <button
            type="button"
            className="px-3 py-2 flex items-center justify-between w-full hover:bg-muted/30 transition-colors cursor-pointer"
            onClick={() => saveConfig({ dualModelSectionCollapsed: !config.dualModelSectionCollapsed })}
            aria-expanded={!config.dualModelSectionCollapsed}
            aria-controls="dual-model-content"
          >
            <span className="flex items-center gap-2 text-sm font-semibold">
              {config.dualModelSectionCollapsed ? (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
              <Brain className="h-4 w-4" />
              Dual-Model Summarization
              {dualModelEnabled && (
                <CheckCircle2 className="h-4 w-4 text-primary" />
              )}
            </span>
          </button>
          {!config.dualModelSectionCollapsed && (
            <div id="dual-model-content" className="divide-y border-t">
              <div className="px-3 py-2 bg-muted/30 border-b">
                <p className="text-xs text-muted-foreground">
                  Use a weaker model to summarize agent steps for the UI and memory storage.
                </p>
              </div>

              <Control
                label={
                  <ControlLabel
                    label="Enable Summarization"
                    tooltip="When enabled, a separate model will generate summaries of each agent step"
                  />
                }
                className="px-3"
              >
                <Switch
                  checked={dualModelEnabled}
                  onCheckedChange={(checked) => saveConfig({ dualModelEnabled: checked })}
                />
              </Control>

              <Control
                label={
                  <ControlLabel
                    label="Inject Memories"
                    tooltip="Include saved memories in agent context. Works independently of summarization."
                  />
                }
                className="px-3"
              >
                <Switch
                  checked={config.dualModelInjectMemories ?? false}
                  onCheckedChange={(checked) => saveConfig({ dualModelInjectMemories: checked })}
                />
              </Control>

              {dualModelEnabled && (
                <>
                  {/* Strong Model Configuration */}
                  <div className="px-3 py-3 space-y-3">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Zap className="h-4 w-4 text-yellow-500" />
                      Strong Model (Planning)
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Primary model for reasoning and tool calls. Uses current agent model if not set.
                    </p>
                    <div className="space-y-2">
                      <Control
                        label={<ControlLabel label="Preset" tooltip="Select which model preset to use" />}
                      >
                        <Select
                          value={strongPresetId}
                          onValueChange={(value) => saveConfig({ dualModelStrongPresetId: value })}

                        >
                          <SelectTrigger className="w-[200px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {allPresets.map((preset) => (
                              <SelectItem key={preset.id} value={preset.id}>
                                {preset.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Control>
                      {strongPreset && (
                        <Control
                          label={<ControlLabel label="Model" tooltip="Select the model" />}
                        >
                          <PresetModelSelector
                            presetId={strongPresetId}
                            baseUrl={strongPreset.baseUrl}
                            apiKey={strongPreset.apiKey}
                            value={config.dualModelStrongModelName || ""}
                            onValueChange={(value) => saveConfig({ dualModelStrongModelName: value })}
                            label="Strong Model"
                            placeholder="Select model..."
                          />
                        </Control>
                      )}
                    </div>
                  </div>

                  {/* Weak Model Configuration */}
                  <div className="px-3 py-3 space-y-3">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <BookOpen className="h-4 w-4 text-blue-500" />
                      Weak Model (Summarization)
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Faster, cheaper model for summarizing agent steps.
                    </p>
                    <div className="space-y-2">
                      <Control
                        label={<ControlLabel label="Preset" tooltip="Select which model preset to use" />}
                      >
                        <Select
                          value={weakPresetId}
                          onValueChange={(value) => saveConfig({ dualModelWeakPresetId: value })}
                        >
                          <SelectTrigger className="w-[200px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {allPresets.map((preset) => (
                              <SelectItem key={preset.id} value={preset.id}>
                                {preset.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Control>
                      {weakPreset && (
                        <Control
                          label={<ControlLabel label="Model" tooltip="Select the model" />}
                        >
                          <PresetModelSelector
                            presetId={weakPresetId}
                            baseUrl={weakPreset.baseUrl}
                            apiKey={weakPreset.apiKey}
                            value={config.dualModelWeakModelName || ""}
                            onValueChange={(value) => saveConfig({ dualModelWeakModelName: value })}
                            label="Weak Model"
                            placeholder="Select model..."
                          />
                        </Control>
                      )}
                    </div>
                  </div>

                  {/* Summarization Settings */}
                  <div className="px-3 py-3 space-y-3">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Settings2 className="h-4 w-4" />
                      Summarization Settings
                    </div>
                    <Control
                      label={<ControlLabel label="Frequency" tooltip="How often to generate summaries" />}
                    >
                      <Select
                        value={config.dualModelSummarizationFrequency || "every_response"}
                        onValueChange={(value) =>
                          saveConfig({ dualModelSummarizationFrequency: value as "every_response" | "major_steps_only" })
                        }
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="every_response">Every Response</SelectItem>
                          <SelectItem value="major_steps_only">Major Steps Only</SelectItem>
                        </SelectContent>
                      </Select>
                    </Control>
                    <Control
                      label={<ControlLabel label="Detail Level" tooltip="How detailed the summaries should be" />}
                    >
                      <Select
                        value={config.dualModelSummaryDetailLevel || "compact"}
                        onValueChange={(value) =>
                          saveConfig({ dualModelSummaryDetailLevel: value as "compact" | "detailed" })
                        }
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="compact">Compact</SelectItem>
                          <SelectItem value="detailed">Detailed</SelectItem>
                        </SelectContent>
                      </Select>
                    </Control>
                    <Control
                      label={
                        <ControlLabel
                          label="Auto-save Important"
                          tooltip="Automatically save high and critical importance summaries to memory"
                        />
                      }
                    >
                      <Switch
                        checked={config.dualModelAutoSaveImportant ?? false}
                        onCheckedChange={(checked) => saveConfig({ dualModelAutoSaveImportant: checked })}
                      />
                    </Control>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </SettingsPageShell>
  )
}
