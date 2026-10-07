export type Snapshot = {
  model: string
  compactions: number
  tokens?: number
  window: number
  percent?: number
  session?: number
  weekly?: number
  resetsAt?: string
  usd?: number
}

declare module 'claude-code' {
  interface PluginState {
    'context-bar': { snap: Snapshot | null; compactions: number }
  }
}
