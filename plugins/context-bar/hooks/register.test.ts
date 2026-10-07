import { expect, test } from 'claude-code/testing'

import { bar, countdown, k, shade } from './register'

test('bar fills proportionally and clamps', () => {
  expect(bar(0)).toBe('░'.repeat(24))
  expect(bar(50)).toBe('█'.repeat(12) + '░'.repeat(12))
  expect(bar(150)).toBe('█'.repeat(24))
})

test('shade goes green → yellow → red', () => {
  expect(shade(10)).toBe('green')
  expect(shade(60)).toBe('yellow')
  expect(shade(90)).toBe('red')
})

test('k and countdown format like the status line', () => {
  expect(k(84321)).toBe('84k')
  expect(k(512)).toBe('512')
  const now = Date.parse('2026-10-07T10:00:00Z')
  expect(countdown('2026-10-07T12:15:00Z', now)).toBe('2h 15m')
  expect(countdown('2026-10-07T10:40:00Z', now)).toBe('40m')
})
