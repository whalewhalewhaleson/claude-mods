import { expect, test } from 'claude-code/testing'

import { countdown, k, shade } from './register'

test('shade goes green → yellow → red', () => {
  expect(shade(10)).toBe('#9ccfd8')
  expect(shade(60)).toBe('#f6c177')
  expect(shade(90)).toBe('#eb6f92')
})

test('k and countdown format like the status line', () => {
  expect(k(84321)).toBe('84k')
  expect(k(512)).toBe('512')
  const now = Date.parse('2026-10-07T10:00:00Z')
  expect(countdown('2026-10-07T12:15:00Z', now)).toBe('2h 15m')
  expect(countdown('2026-10-07T10:40:00Z', now)).toBe('40m')
})
