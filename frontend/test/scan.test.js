import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { getScanWarnings } from '../src/services/scanWarnings.js'

// Vite supplies import.meta.env at build time. This module has no other imports.
const source = (await readFile(new URL('../src/api.js', import.meta.url), 'utf8'))
  .replaceAll('import.meta.env', '({})')
const { getStockMoverScan, getStockMovers } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`)
const response = (markets) => ({ movers: [], markets, checkedAt: '2026-11-13T06:00:00Z' })
const boards = (status) => ['KOSPI', 'KOSDAQ'].map((market) => ({ market, status }))

test('successful empty scan is distinct from transport failure', async () => {
  const original = globalThis.fetch
  try {
    globalThis.fetch = async () => new Response(JSON.stringify(response(boards('empty'))))
    const empty = await getStockMoverScan('domestic')
    assert.equal(empty.markets[0].status, 'empty')
    assert.match(getScanWarnings(empty)[0], /성공했지만/)
    globalThis.fetch = async () => { throw new Error('secret token in transport message') }
    const failed = await getStockMoverScan('domestic')
    assert.equal(failed.checkedAt, null)
    assert.ok(failed.markets.every((m) => m.status === 'error'))
    assert.match(getScanWarnings(failed)[0], /실패/)
    assert.doesNotMatch(JSON.stringify(failed), /secret token/)
  } finally { globalThis.fetch = original }
})

test('HTTP errors and malformed or incomplete payloads produce explicit scan errors', async () => {
  const original = globalThis.fetch
  try {
    for (const res of [new Response('', { status: 503 }), new Response('not JSON'),
      new Response('[]'), new Response(JSON.stringify(response([]))),
      new Response(JSON.stringify(response(boards('unknown'))))]) {
      globalThis.fetch = async () => res
      const scan = await getStockMoverScan('domestic')
      assert.ok(scan.markets.every((m) => m.status === 'error'))
      assert.equal(scan.movers.length, 0)
    }
  } finally { globalThis.fetch = original }
})

test('warnings cover partial, unconfigured and empty boards but omit successful boards', () => {
  const scan = response([
    { market: 'KOSPI', status: 'success' }, { market: 'KOSDAQ', status: 'partial' },
    { market: 'US', status: 'not_configured' },
  ])
  const warnings = getScanWarnings(scan)
  assert.equal(warnings.length, 2)
  assert.match(warnings[0], /코스닥.*일부/)
  assert.match(warnings[1], /미국.*설정/)
})

test('legacy candidate helper keeps its list return contract', async () => {
  const original = globalThis.fetch
  try {
    globalThis.fetch = async () => new Response(JSON.stringify({
      ...response(boards('success')), movers: [{ symbol: '005930', price: 70000 }],
    }))
    assert.deepEqual(await getStockMovers('domestic'), [{ symbol: '005930', price: 70000 }])
  } finally { globalThis.fetch = original }
})
