export interface SkillInput {
  name: string
  label: string
  type: 'text' | 'number' | 'toggle' | 'select'
  placeholder?: string
  required?: boolean
  default?: string | number | boolean
  options?: { label: string; value: string }[]
}

interface PluginBase {
  id: string
  name: string
  icon: string
  color: string
  description: string
  enabled?: boolean
}

export interface ViewPlugin extends PluginBase {
  type: 'view'
  widget: {
    component: string
    defaultEnabled: boolean
    refreshInterval?: number
  }
  api?: {
    routes: string
    prefix: string
  }
}

export interface ActionPlugin extends PluginBase {
  type: 'action'
  skill: {
    agent: string
    command: string
    inputs?: SkillInput[]
    component?: string
  }
  api?: {
    routes: string
    prefix: string
  }
}

export interface ConnectorPlugin extends PluginBase {
  type: 'connector'
  mcp: {
    serverName: string
    configSchema?: Record<string, SkillInput>
    defaultConfig?: Record<string, unknown>
  }
  component?: string
}

export type PluginManifest = ViewPlugin | ActionPlugin | ConnectorPlugin
