import React from "react"

// Compose the existing Providers and Models settings into a single view
import { Component as ProvidersSettings } from "./settings-providers"
import { Component as ModelsSettings } from "./settings-models"
import { SettingsPageShell } from "@renderer/components/settings-page-shell"

export function Component() {
  return (
    <SettingsPageShell className="modern-panel h-full overflow-auto px-6 py-4">
      <div className="space-y-8">
        {/* Providers section */}
        <div>
          <ProvidersSettings />
        </div>
        {/* Models section */}
        <div>
          <ModelsSettings />
        </div>
      </div>
    </SettingsPageShell>
  )
}

