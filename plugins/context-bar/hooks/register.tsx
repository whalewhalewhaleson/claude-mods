import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Snapshot } from '../types'

const snap = atom({ plugin: 'context-bar', key: 'snap' } as const, null)
const compactions = atom({ plugin: 'context-bar', key: 'compactions' } as const, 0)

const WIDTH = 24

const C = {
  model: '#c4a7e7',
  label: '#908caa',
  value: '#e0def4',
  ok: '#9ccfd8',
  warn: '#f6c177',
  hot: '#eb6f92',
  empty: '#403d52',
}

export const shade = (percent: number) =>
  percent >= 80 ? C.hot : percent >= 50 ? C.warn : C.ok

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
    const sep = <Text color={C.empty}> · </Text>
    const clock = await $.clock.now()
    const stat = (label: string, n?: number) => (
      <Box>
        <Text color={C.label}>{label} </Text>
        {n === undefined ? (
          <Text color={C.empty}>–</Text>
        ) : (
          <Text color={shade(n)}>{Math.round(n)}%</Text>
        )}
      </Box>
    )
    const full = s.percent === undefined ? 0 : Math.round((s.percent / 100) * WIDTH)

    return (
      <Box flexDirection="column">
        <Box>
          <Text color={C.model} bold>✦ {s.model}</Text>
          {sep}
          <Text color={C.label}>compactions </Text>
          <Text color={C.value}>{s.compactions}</Text>
          {s.usd !== undefined && sep}
          {s.usd !== undefined && <Text color={C.value}>${s.usd.toFixed(2)}</Text>}
        </Box>
        <Box>
          {stat('session', s.session)}
          {sep}
          {stat('weekly', s.weekly)}
          {s.resetsAt !== undefined && sep}
          {s.resetsAt !== undefined && <Text color={C.label}>resets in </Text>}
          {s.resetsAt !== undefined && <Text color={C.value}>{countdown(s.resetsAt, clock)}</Text>}
        </Box>
        <Box>
          <Text color={C.label}>context </Text>
          {s.percent === undefined ? (
            <Box>
              <Text color={C.empty}>{'━'.repeat(WIDTH)}</Text>
              <Text color={C.label} italic> waiting for first reply…</Text>
            </Box>
          ) : (
            <Box>
              <Text color={shade(s.percent)}>{'━'.repeat(full)}</Text>
              <Text color={C.empty}>{'━'.repeat(WIDTH - full)}</Text>
              <Text color={shade(s.percent)} bold> {s.percent}%</Text>
              <Text color={C.label}> {k(s.tokens ?? 0)} / {k(s.window)}</Text>
            </Box>
          )}
        </Box>
      </Box>
    )
  })
}
