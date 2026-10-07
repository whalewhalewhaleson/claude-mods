import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Snapshot } from '../types'

const snap = atom({ plugin: 'context-bar', key: 'snap' } as const, null)
const compactions = atom({ plugin: 'context-bar', key: 'compactions' } as const, 0)

const WIDTH = 24

export const bar = (percent: number) => {
  const full = Math.round((Math.min(100, Math.max(0, percent)) / 100) * WIDTH)
  return '█'.repeat(full) + '░'.repeat(WIDTH - full)
}

export const shade = (percent: number) =>
  percent >= 80 ? 'red' : percent >= 50 ? 'yellow' : 'green'

export const k = (n: number) => (n >= 1000 ? `${Math.round(n / 1000)}k` : `${n}`)

export const countdown = (resetsAt: string, now: number) => {
  const mins = Math.max(0, Math.round((Date.parse(resetsAt) - now) / 60000))
  const h = Math.floor(mins / 60)
  return h > 0 ? `${h}h ${mins % 60}m` : `${mins}m`
}

async function refresh($: EngineInterface) {
  const usage = await $.session.usage()
  const limit = (kind: string) => usage.rateLimits.find(r => r.kind === kind)
  const five = limit('five_hour')
  const week = limit('seven_day')
  const now: Snapshot = {
    model: await $.session.model(),
    compactions: await read($, compactions),
    tokens: usage.context.tokens,
    window: usage.context.window,
    percent: usage.context.percent,
    session: five?.percentUsed,
    weekly: week?.percentUsed,
    resetsAt: five?.resetsAt,
    usd: usage.cost?.usd,
  }
  await update($, snap, () => now)
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    void refresh($).catch(() => {})
    return next(e)
  })

  on('session.compact', async ($, e, next) => {
    const done = await next(e)
    await update($, compactions, n => n + 1)
    void refresh($).catch(() => {})
    return done
  })

  on('tool.call', async ($, e, next) => {
    const ran = await next(e)
    void refresh($).catch(() => {})
    return ran
  })

  on('turn.complete', async ($, e, next) => {
    void refresh($).catch(() => {})
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) return next(e)
    const s = await read($, snap)
    if (s === null) return next(e)

    const { Box, Text } = $.ui.resolve(e)
    const sep = <Text dimColor> | </Text>
    const clock = await $.clock.now()
    const pct = (n?: number) => (n === undefined ? '–' : `${Math.round(n)}%`)

    return (
      <Box flexDirection="column">
        <Box>
          <Text color="magentaBright">{s.model}</Text>
          {sep}
          <Text color="magentaBright">Compactions: {s.compactions}</Text>
          {s.usd !== undefined && sep}
          {s.usd !== undefined && <Text dimColor>${s.usd.toFixed(2)}</Text>}
        </Box>
        <Box>
          <Text>Session: {pct(s.session)}</Text>
          {sep}
          <Text>Weekly: {pct(s.weekly)}</Text>
          {s.resetsAt !== undefined && sep}
          {s.resetsAt !== undefined && <Text>Reset: {countdown(s.resetsAt, clock)}</Text>}
        </Box>
        <Box>
          <Text color="yellow">Context: </Text>
          {s.percent === undefined ? (
            <Text dimColor>{'░'.repeat(WIDTH)} waiting for first reply…</Text>
          ) : (
            <Box>
              <Text color={shade(s.percent)}>{bar(s.percent)}</Text>
              <Text bold> {s.percent}%</Text>
              <Text dimColor> ({k(s.tokens ?? 0)}/{k(s.window)})</Text>
            </Box>
          )}
        </Box>
      </Box>
    )
  })
}
