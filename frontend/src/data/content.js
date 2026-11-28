// Microsoft Copilot icon used by the pricing cards and the hero course popup.
export const COPILOT_ICON = 'https://cdn.jsdelivr.net/gh/DamoBird365/microsoft-cloud-icons@master/icons/copilot/copilot-365.svg'

/* Names, prices, payment links, dates, Pricing cards and the WhatsApp link come only
   from the admin backend (applySiteData below). Nothing here is a fallback: the page
   isn't shown until the API answers (see siteData.js). */

/* Every "Reserve a seat" CTA on the page — nav, hero, the ticket and seat
   reveals, the repeating section pill and the footer link — goes to the webinar's
   payment link from the admin. */
export let PAYMENT_URL = null

/* Thank-you page: the WhatsApp Community invite, from the admin's Settings. */
export let WHATSAPP_COMMUNITY_URL = null

/* Every entry must point at a section that is actually rendered in App.jsx.
   Agenda and FAQ were dropped because Agenda.jsx and Faq.jsx are commented
   out there — re-add them here if those sections come back. */

/* 1:1 coaching programmes (the coaching section). Hidden until the admin sends them: name, price, package
   price and link come from Pricing & dates, the tagline and points from the section's content. */
export const PROGRAMMES = ['skill-builder', 'project-builder'].map((key) => ({ key, hidden: true }))

/* Shown under "Join the Webinar" in the hero: the webinar's next date from the admin. */
export let WEBINAR_DATE = ''
/* The webinar's later dates from the admin (after the one in WEBINAR_DATE), written the same way. */
export let MORE_DATES = []

/* The programs the hero and "Other programs" sell, in order ([0] is the webinar the hero leads with).
   Name, price, link and dates come from Pricing & dates; the title, description, points, facts and card
   text from Site-wide content > Program details. An entry the admin doesn't send stays hidden. */
export const HERO_PRICES = ['webinar', 'excel', 'recorded', 'project-support', 'workshop'].map((key) => ({ key, hidden: true }))

// Left column = what the agent reads from. Right column = where it acts.
export const AGENT_APPS = [
  { id: 'excel', name: 'Excel', mono: 'X', file: 'microsoft-365/excel.svg', side: 'in' },
  { id: 'powerpoint', name: 'PowerPoint', mono: 'P', file: 'microsoft-365/powerpoint.svg', side: 'in' },
  { id: 'word', name: 'Word', mono: 'W', file: 'microsoft-365/word.svg', side: 'in' },
  { id: 'outlook', name: 'Outlook', mono: 'O', file: 'microsoft-365/outlook.svg', side: 'in' },
  { id: 'onedrive', name: 'OneDrive', mono: 'D', file: 'microsoft-365/onedrive.svg', side: 'out' },
  { id: 'teams', name: 'Teams', mono: 'T', file: 'microsoft-365/teams.svg', side: 'out' },
  { id: 'copilot-chat', name: 'Copilot Chat', mono: 'C', file: 'copilot/copilot-365.svg', side: 'out' },
  { id: 'sharepoint', name: 'SharePoint', mono: 'S', file: 'microsoft-365/sharepoint.svg', side: 'out' },
]

export const INCLUDED = ['Live training', 'Demonstrations', 'Q&A', 'Practical examples', 'Learning resources']

// The apps the prompt fans out to in the closing flow strip.
export const LEARN_FLOW_APPS = [
  { id: 'word', name: 'Word', mono: 'W', file: 'microsoft-365/word.svg' },
  { id: 'excel', name: 'Excel', mono: 'X', file: 'microsoft-365/excel.svg' },
  { id: 'powerpoint', name: 'PowerPoint', mono: 'P', file: 'microsoft-365/powerpoint.svg' },
  { id: 'outlook', name: 'Outlook', mono: 'O', file: 'microsoft-365/outlook.svg' },
  { id: 'teams', name: 'Teams', mono: 'T', file: 'microsoft-365/teams.svg' },
]

export const DISCLAIMER = {
  badge: 'Independent Webinar',
  title: 'Disclaimer',
  text: 'Microsoft, Microsoft 365, Copilot, Excel, Word, PowerPoint, Outlook, and their respective logos/icons are trademarks of Microsoft Corporation. This webinar is independently delivered by Ambot365 and is not affiliated with, endorsed by, sponsored by, or authorized by Microsoft Corporation.',
  acceptLabel: 'I Understand',
  moreLabel: 'Read full disclaimer',
}

const MS_ICON = (app) => `https://cdn.jsdelivr.net/gh/DamoBird365/microsoft-cloud-icons@master/icons/microsoft-365/${app}.svg`

/* The Pricing section. The tabs are fixed here (the admin can rename them); every
   card comes from the admin: applySiteData fills each tab's items. */
export const PRICE_LADDER = [
  {
    id: 'once',
    name: 'One-time access',
    blurb: 'A single session. Pay once, no commitment.',
    items: [],
  },
  {
    id: 'single',
    name: 'Individual programs',
    blurb: 'Go deep on one app. 30 days of access each.',
    items: [],
  },
  {
    id: 'bundle',
    name: 'Skill bundles',
    blurb: 'Several related skills, taught together.',
    items: [],
  },
  {
    id: 'master',
    name: 'Complete packages',
    blurb: 'Microsoft 365 apps, end to end.',
    items: [],
  },
]

/* ── Live values from the admin API ──────────────────────────────────────────
   main.jsx fetches /api/public/site before the app loads and hands it here.
   Only names, prices, payment links, dates and visibility come from the API;
   everything else above stays the copy. Entries are matched by `key` and never
   removed or reordered, since the hero and Programs open dialogs by index:
   a hidden program gets `hidden: true` and the lists skip it. */
const inr = (n) => `₹${Number(n).toLocaleString('en-IN')}`

function istParts(iso, opts) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kolkata', ...opts }).formatToParts(new Date(iso))
  return Object.fromEntries(parts.map((p) => [p.type, p.value]))
}
// '9:00 AM' in long form, '9 AM' in short form.
function istTime(iso, short) {
  const t = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit' }).format(new Date(iso))
  return short ? t.replace(':00', '') : t
}
// 'Saturday, 28 November 2026'
const longDay = (iso) => { const p = istParts(iso, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }); return `${p.weekday}, ${p.day} ${p.month} ${p.year}` }

/* The page's sections from the admin, visible ones only, in order: [{ id, type, anchor, content }].
   App.jsx draws one component per entry. */
export let SECTIONS = []
/* Content several sections use (the agenda, the trainer profile, contact details…), by type. Always sent,
   whether or not the sections that use it are shown. */
export let SHARED = {}
// 'draft' while the admin's Preview link is open, 'expired' for an old link (the live page is shown), else null.
export let PREVIEW = null

/* A link that points at a section on this page (#pricing) only counts while that section is shown;
   any other link always does. */
/* A label from Site-wide content > Buttons, popups & messages, with {name}-style blanks filled from `vars`. */
export const fill = (text, vars = {}) => (text ?? '').replace(/\{(\w+)\}/g, (m, k) => (vars[k] ?? m))
export const label = (key, vars) => fill(SHARED.labels?.[key], vars)

export const linkLive = (href) => !href?.startsWith('#') || SECTIONS.some((s) => s.anchor === href)

/* The offer the site-wide sale banner shows: the webinar's, else the first
   program's. { badge, endsAt } or null. */
export let SALE = null

/* Programs that take registrations and payment on the site, by key: { title, price,
   originalPrice, form }. A key missing here means its button opens the payment link. */
export const CHECKOUT = {}

// 'Sat 28 Nov 2026 · 9 AM – 1 PM IST in Tamil' for a { startsAt, endsAt, language } date.
function whenLine({ startsAt, endsAt, language }) {
  const s = istParts(startsAt, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
  const span = endsAt ? `${istTime(startsAt, true)} – ${istTime(endsAt, true)} IST` : ''
  return [`${s.weekday} ${s.day} ${s.month} ${s.year}`, span].filter(Boolean).join(' · ') + (language ? ` in ${language}` : '')
}

export function applySiteData({ courses = [], whatsappUrl, pricingTabs = [], sections = [], shared = {}, preview = null } = {}) {
  SECTIONS = sections
  SHARED = shared
  PREVIEW = preview
  // Tab names and their one-line intro, where renamed in the admin.
  for (const t of pricingTabs) {
    const g = PRICE_LADDER.find((x) => x.id === t.id)
    if (g && t.name) g.name = t.name
    if (g && t.blurb != null) g.blurb = t.blurb
  }
  if (whatsappUrl) WHATSAPP_COMMUNITY_URL = whatsappUrl
  // The offer the site promotes (strip, popup, hero badge): the webinar's, else the first program's,
  // with what it saves on that program.
  const promo = courses.find((c) => c.key === 'webinar' && c.offer) ?? courses.find((c) => c.offer && c.isVisible)
  SALE = promo ? { ...promo.offer, key: promo.key, title: promo.cardTitle || promo.name, price: Number(promo.price), originalPrice: Number(promo.originalPrice ?? promo.price), url: promo.paymentUrl } : null
  // Each program's copy, fresh on every load (the dates below write into it).
  const details = shared['program-details']?.items ?? []
  for (const hero of HERO_PRICES) {
    const d = details.find((x) => x.key === hero.key)
    Object.assign(hero, {
      hidden: true, title: '', meta: '', descLead: '', desc: '', pointsHeading: '', points: [], facts: [],
      scene: '', format: '', formatIcon: '', summary: '', highlights: [],
    }, d && structuredClone(d))
  }
  for (const k of Object.keys(CHECKOUT)) delete CHECKOUT[k]
  for (const c of courses) {
    if (c.checkout) CHECKOUT[c.key] = {
      title: c.cardTitle || c.name, price: Number(c.price), form: c.form ?? [], paysByLink: !!c.paysByLink,
      originalPrice: c.originalPrice != null ? Number(c.originalPrice) : null,
    }
    const hero = HERO_PRICES.find((p) => p.key === c.key)
    const coaching = PROGRAMMES.find((p) => p.key === c.key)
    if (hero) {
      // originalPrice and offer are set only while an offer runs; the cards strike the original through.
      Object.assign(hero, {
        name: c.name, price: Number(c.price), url: c.paymentUrl, hidden: !c.isVisible,
        originalPrice: c.originalPrice != null ? Number(c.originalPrice) : null, offer: c.offer ?? null,
      })
      if (c.key === 'webinar') {
        // The API sends the next date; once every date has passed there is none to show.
        if (!c.startsAt && courses.some((x) => x.key === 'webinar')) WEBINAR_DATE = label('noDates')
        MORE_DATES = (c.upcoming ?? []).slice(1).map(whenLine)
      }
      if (c.startsAt) {
        const facts = hero.facts ?? []
        const setFact = (name, value) => { const f = facts.find((x) => x.label === name); if (f) f.value = value }
        if (c.key === 'webinar') {
          const longSpan = c.endsAt ? ` · ${istTime(c.startsAt)} – ${istTime(c.endsAt)} IST` : ''
          WEBINAR_DATE = whenLine(c)
          if (c.language) hero.title = hero.title.replace(/– [^–]+$/, `– ${c.language}`)
          hero.meta = `${longDay(c.startsAt)}${longSpan}${c.language ? ` · ${c.language}` : ''}`
        } else if (c.key === 'workshop') {
          if (hero.highlights.length) hero.highlights[0] = longDay(c.startsAt)
          setFact('Date', longDay(c.startsAt).split(', ')[1])
        }
        if (c.language) { setFact('Language', c.language); setFact('Languages', c.language) }
      }
    }
    if (coaching) {
      // The struck-through figure is the package price, or the normal price during an offer with none.
      const was = c.listPrice ?? c.originalPrice
      Object.assign(coaching, { name: c.name, price: inr(c.price), url: c.paymentUrl, hidden: !c.isVisible, offer: c.offer ?? null })
      if (was != null) Object.assign(coaching, { pkg: inr(was), save: inr(Number(was) - Number(c.price)) })
    }
  }
  // The Pricing section is built from the admin's cards: every program with a tab (category), in its order.
  for (const g of PRICE_LADDER) {
    g.items = courses.filter((c) => c.category === g.id).map((c) => ({
      key: c.key, name: c.cardTitle || c.name, includes: c.description ?? '', duration: c.duration ?? '',
      price: Number(c.price), originalPrice: c.originalPrice != null ? Number(c.originalPrice) : null, offer: c.offer ?? null,
      url: c.paymentUrl, hidden: !c.isVisible, cta: c.cta || 'Enrol', featured: !!c.isFeatured,
      ...(c.icon?.startsWith('app:') ? { logos: c.icon.slice(4).split(',').map(MS_ICON) } : { icon: c.icon || 'bot' }),
    }))
  }
  // Every "Reserve a seat" button sells the webinar.
  PAYMENT_URL = HERO_PRICES[0].url ?? null

  HERO_PRICES[0].hidden = false
}
