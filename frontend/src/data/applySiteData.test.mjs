// node --test src/data — checks the admin API payload reaches every place the site shows it.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import * as content from './content.js'

test('nothing to sell is built in: it all waits for the API', () => {
  assert.equal(content.PAYMENT_URL, null)
  assert.equal(content.WHATSAPP_COMMUNITY_URL, null)
  assert.equal(content.WEBINAR_DATE, '')
  assert.ok(content.PRICE_LADDER.every((g) => g.items.length === 0))
  assert.ok([...content.HERO_PRICES, ...content.PROGRAMMES].every((p) => p.hidden && p.price == null && p.url == null))
})

test('applySiteData patches dates, prices, links and keeps indexes', () => {
  const keys = content.HERO_PRICES.map((p) => p.key)
  content.applySiteData({ courses: [
    { key: 'webinar', name: 'Webinar', price: 599, paymentUrl: 'https://pay.example/w', startsAt: '2026-12-05T04:30:00Z', endsAt: '2026-12-05T08:30:00Z', language: 'English', isVisible: false,
      upcoming: [{ startsAt: '2026-12-05T04:30:00Z' }, { startsAt: '2026-12-12T04:30:00Z', endsAt: '2026-12-12T08:30:00Z', language: 'Tamil' }, { startsAt: '2026-12-19T04:30:00Z' }] },
    { key: 'workshop', name: 'Workshop', price: 5999, paymentUrl: 'https://pay.example/ws', startsAt: '2027-02-12T18:30:00Z', endsAt: null, language: 'Tamil', isVisible: false },
    { key: 'skill-builder', name: 'Skill', price: 3999, listPrice: 9999, paymentUrl: 'https://pay.example/s', isVisible: true },
    { key: 'ladder-new', name: 'Copilot for Planner', price: 1299, paymentUrl: 'https://pay.example/p', isVisible: true, category: 'single', description: 'Plans', duration: '30 days access', cta: 'Enrol', icon: 'app:planner', isFeatured: true },
    { key: 'excel', name: 'Excel', price: 559, originalPrice: 799, paymentUrl: 'https://pay.example/sale', isVisible: true, offer: { badge: 'Black Friday sale', endsAt: '2026-12-01T18:29:00Z' } },
  ], pricingTabs: [{ id: 'single', name: 'Single apps', blurb: null }], whatsappUrl: 'https://chat.whatsapp.com/NEW',
  shared: { 'program-details': { items: [
    { key: 'webinar', title: 'Webinar – Tamil', facts: [] },
    { key: 'workshop', title: 'Workshop', highlights: ['Date to be announced', 'Venue'], facts: [{ label: 'Language', value: 'Tamil' }, { label: 'Date', value: 'To be announced' }] },
  ] } } })
  assert.equal(content.WHATSAPP_COMMUNITY_URL, 'https://chat.whatsapp.com/NEW')
  assert.equal(content.WEBINAR_DATE, 'Sat 5 Dec 2026 · 10 AM – 2 PM IST in English')
  assert.deepEqual(content.MORE_DATES, ['Sat 12 Dec 2026 · 10 AM – 2 PM IST in Tamil', 'Sat 19 Dec 2026'])
  assert.equal(content.HERO_PRICES[0].meta, 'Saturday, 5 December 2026 · 10:00 AM – 2:00 PM IST · English')
  assert.equal(content.PAYMENT_URL, 'https://pay.example/w')
  assert.equal(content.HERO_PRICES[0].hidden, false) // the webinar can't be hidden
  const ws = content.HERO_PRICES.find((p) => p.key === 'workshop')
  assert.equal(ws.highlights[0], 'Saturday, 13 February 2027')
  assert.equal(ws.facts.find((f) => f.label === 'Date').value, '13 February 2027')
  assert.equal(content.HERO_PRICES[0].title, 'Webinar – English') // the language from the date
  assert.equal(ws.hidden, true)
  assert.equal(ws.price, 5999)
  assert.deepEqual(content.HERO_PRICES.map((p) => p.key), keys)
  const sb = content.PROGRAMMES.find((p) => p.key === 'skill-builder')
  assert.deepEqual([sb.price, sb.pkg, sb.save], ['₹3,999', '₹9,999', '₹6,000'])
  // The Pricing section now holds only the admin's cards: the new one, in the single tab.
  const single = content.PRICE_LADDER.find((g) => g.id === 'single').items
  assert.deepEqual(single.map((i) => [i.key, i.name, i.price, i.featured]), [['ladder-new', 'Copilot for Planner', 1299, true]])
  assert.match(single[0].logos[0], /planner.svg$/)
  assert.equal(content.PRICE_LADDER.find((g) => g.id === 'single').name, 'Single apps')
  const ex = content.HERO_PRICES.find((p) => p.key === 'excel')
  assert.deepEqual([ex.price, ex.originalPrice, ex.url], [559, 799, 'https://pay.example/sale'])
  assert.equal(content.SALE.badge, 'Black Friday sale') // the webinar has no offer here, so the first visible one
  // When the offer ends the API stops sending it and the normal price comes back.
  content.applySiteData({ courses: [{ key: 'excel', name: 'Excel', price: 799, paymentUrl: 'https://pay.example/x', isVisible: true }] })
  assert.deepEqual([ex.price, ex.originalPrice, content.SALE], [799, null, null])
})

test('sections come from the admin, and links only point at sections that are shown', () => {
  content.applySiteData({ courses: [], preview: 'draft', sections: [
    { id: 'navbar', type: 'navbar', anchor: null, content: {} },
    { id: 'overview', type: 'overview', anchor: '#overview', content: {} },
  ] })
  assert.deepEqual(content.SECTIONS.map((s) => s.type), ['navbar', 'overview'])
  assert.equal(content.PREVIEW, 'draft')
  assert.equal(content.linkLive('#overview'), true)
  assert.equal(content.linkLive('#pricing'), false) // Pricing hidden in the admin
  assert.equal(content.linkLive('https://pay.example/w'), true)
})
