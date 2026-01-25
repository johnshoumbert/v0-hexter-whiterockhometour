import { ThemeSettingsPanel } from "@/components/theme-settings-panel"

export default function AdminThemesPage() {
  return (
    <div className="space-y-8 p-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Theme Settings</h1>
        <p className="text-muted-foreground">Customize your platform's appearance</p>
      </div>

      <ThemeSettingsPanel />
    </div>
  )
}
