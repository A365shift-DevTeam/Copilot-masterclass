import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fromIstInput, toIstInput } from './api.js'

test('IST input round-trips through UTC', () => {
  assert.equal(toIstInput('2026-11-28T03:30:00Z'), '2026-11-28T09:00')
  assert.equal(+new Date(fromIstInput('2026-11-28T09:00')), +new Date('2026-11-28T03:30:00Z'))
  assert.equal(toIstInput(null), '')
  assert.equal(fromIstInput(''), null)
})
