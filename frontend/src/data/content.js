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

/* 1:1 coaching programmes shown after the Speaker section. Hidden until the admin
   sends them; name, price, package price and link come from there. */
export const PROGRAMMES = [
  {
    key: 'skill-builder',
    hidden: true,
    tagline: 'Build hands-on Copilot skills with a personal coach.',
    points: ['15-day programme', '2.5 hours of 1:1 coaching', '5 calls of 30 minutes'],
  },
  {
    key: 'project-builder',
    hidden: true,
    tagline: 'Ship a real AI project with guided reviews.',
    points: ['30-day programme', '5 hours of 1:1 coaching', 'Project guidance and review'],
    featured: true,
  },
]

/* Shown under "Join the Webinar" in the hero: the webinar's next date from the admin. */
export let WEBINAR_DATE = ''
/* The webinar's later dates from the admin (after the one in WEBINAR_DATE), written the same way. */
export let MORE_DATES = []

export const HERO_CHECKS = ['Live demonstration', 'Practical use cases', 'Q&A session', 'Limited seats']

/* Hero price table. `name`, `price`, `url` (where Register goes) and the dates come
   from the admin; an entry it doesn't send stays hidden.
   The rest fills the "View details" popup; every popup field is optional:
   `meta` bold line, `facts` [label, value] lines, `descLead` bold start of
   `desc`, `pointsHeading` above the `points` list.
   The first entry gets the row highlight.
   `scene`, `format`, `summary` and `highlights` drive the Other Programs cards
   (`formatIcon: 'excel'` puts the Excel logo in the format label)
   (Programs.jsx); `scene` picks the animated header: excel | video | coach | workshop. */
export const HERO_PRICES = [
  {
    key: 'webinar',
    hidden: true,
    title: 'Microsoft Copilot Live Webinar – Tamil',
    meta: '',
    desc: 'Explore Microsoft 365 apps, AI tips and tricks through live Copilot product demonstrations.',
    pointsHeading: 'What you will explore',
    points: [
      'Copilot fundamentals',
      'Building AI agents and skills',
      'Excel, Word and PowerPoint',
      'Copilot Notebook',
      'AI image generation',
      'Building AI apps',
      'Practical demonstrations and Q&A',
    ],
  },
  {
    key: 'excel',
    hidden: true,
    title: 'Microsoft Excel with Copilot',
    scene: 'excel',
    format: 'Excel only',
    formatIcon: 'excel',
    summary: 'Analyse data, build workflows and practise on sample datasets with Copilot in Excel.',
    highlights: ['80% Excel, 20% Word and PowerPoint', 'Build Copilot skills and agents'],
    descLead: 'End-to-end Excel with Copilot',
    desc: 'training with practical examples, demonstrations and sample datasets.',
    points: [
      '80% Excel: Copilot in Excel, end-to-end workflows, data analysis, practical exercises and sample data',
      '10% PowerPoint: Copilot tips for presentations',
      '10% Word: Copilot tips for documents',
      'Building Copilot skills and agents',
    ],
  },
  {
    key: 'recorded',
    hidden: true,
    title: 'Copilot Recorded Videos',
    scene: 'video',
    format: 'Self-paced',
    summary: 'Watch the Copilot demonstrations and workflows whenever it suits you.',
    highlights: ['Tamil and English', 'One-time payment'],
    facts: [['Languages', 'Tamil / English']],
    desc: 'One-time recorded videos for flexible, self-paced viewing of Microsoft Copilot demonstrations and workflows.',
  },
  {
    key: 'project-support',
    hidden: true,
    title: '1-to-1 Project Support – 15 Days',
    scene: 'coach',
    format: '1-to-1, 15 days',
    summary: 'Bring a real problem and build your Copilot project with personal guidance.',
    highlights: ['3 hours of one-to-one calls', 'Progress tracking tool included'],
    facts: [
      ['Languages', 'Tamil / English'],
      ['Duration', '15 days'],
      ['One-to-one calls', '3 hours total'],
    ],
    points: [
      'Identify and define your real-world problem',
      'Receive access to a personalized tool to monitor project progress',
      'Build your Copilot project with guided one-to-one support',
      'Schedule calls flexibly based on project requirements',
      'Work through implementation and delivery',
    ],
  },
  {
    key: 'workshop',
    hidden: true,
    title: 'Offline Copilot Workshop – Chennai',
    scene: 'workshop',
    format: 'In person, Chennai',
    summary: 'A full day of hands-on Copilot demonstrations, in Tamil.',
    highlights: ['Date to be announced', 'Venue to be announced'],
    facts: [
      ['Language', 'Tamil'],
      ['Date', 'To be announced'],
      ['Format', 'One-day, in-person workshop'],
      ['Venue', 'Chennai; exact venue to be announced'],
    ],
    desc: 'Hands-on Copilot demonstrations covering:',
    points: [
      'Excel, Word and PowerPoint',
      'Building Copilot agents and skills',
      'Copilot Notebook',
      'OneDrive and SharePoint',
      'Microsoft Forms and To Do',
      'Microsoft Bookings',
    ],
  },
]

/* The founder profile: the hero "know your trainer" chip, its popup, and the
   Speaker section's bio all read from here. Public LinkedIn shows only the
   location, current company, the 14 years at TCS and the services list. */
export const TRAINER = {
  name: 'Ambrose Denny',
  photo: '/assets/fonunder-200.webp',
  role: 'Founder & CEO, AmBot365',
  tags: 'AI • Automation • Microsoft 365 Solutions',
  location: 'Dubai, UAE · Coimbatore, India',
  linkedin: 'https://www.linkedin.com/in/ambrose-denny-39320692/',
  // Cycled by the typewriter beside the photo.
  typed: ['Know your trainer', 'Ambrose Denny', '18+ years in automation', 'Microsoft 365 & Copilot trainer'],
  bio: [
    'Ambrose brings extensive experience across Microsoft 365, Business Automation, Lean Transformation, AI and Digital Transformation. His journey spans corporate transformation, large-scale automation delivery, product development and building AmBot365 across India and the UAE, with experience presenting solutions to VPs, Directors, senior business leaders and Ministers.',
    'Today, he transforms this real-world experience into structured, visual and practical learning, helping professionals learn, apply and replicate Microsoft Copilot, AI and automation solutions in their workplace.',
  ],
  // In order: where he started, what he built, what he does now.
  path: [
    { org: 'Tata Consultancy Services', role: '14 years of global experience', note: 'Specialised automation skills, built on global delivery.' },
    { org: 'AmBot365', role: 'Founder & CEO', note: 'RPA, Microsoft 365, AI and analytics solutions across India and the UAE.' },
    { org: 'Copilot trainer', role: 'Today', note: 'Structured, visual, practical learning you can repeat at work.' },
  ],
  services: ['Data reporting', 'Application development', 'IT consulting', 'Custom software development', 'Business analytics', 'Business consulting'],
}

export const HERO_TITLE_PHRASES = ['Master Prompt', 'Develop AI Skills', 'Build Intelligent Agents']

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

export const BENEFITS = [
  { i: 'LT', icon: 'live', t: 'Live Training', d: 'Instructor-led interactive webinar.' },
  { i: 'UC', icon: 'cases', t: 'Real Use Cases', d: 'Practical Microsoft 365 scenarios.' },
  { i: 'WF', icon: 'workflow', t: 'AI Workflows', d: 'Reusable productivity techniques.' },
  { i: 'QA', icon: 'qa', t: 'Q&A', d: 'Ask implementation questions directly.' },
  { i: 'LM', icon: 'materials', t: 'Learning Materials', d: 'Resources and checklists where applicable.' },
]

// The founder's credentials as pills: `v` is the figure that leads, `l` says
// what it counts.
export const EXPERTISE = [
  { v: '18+ Years', l: 'Professional Experience' },
  { v: '47+ Clients', l: 'Global Delivery Experience' },
  { v: 'Microsoft 365', l: 'Expertise' },
  { v: '1,200+', l: 'Automation Deliveries' },
  { v: '200+', l: 'Lean Projects' },
  { v: '10+', l: 'Products Built' },
  { v: 'India Patent', l: 'Innovation' },
]

/* ⚠️ MOCK DATA — NOT REAL PEOPLE, NOT REAL QUOTES.
   Written to design and test the feedback strip. Every name, role and quote
   below is invented. Swap the whole array for verified participant feedback
   before this page goes live: publishing invented reviews attributed to named
   people is a legal and trust problem, not just a content gap. */
export const TESTIMONIALS = [
  { rating: 5, quote: 'I automated my monthly sales report in Excel the same week. What took a full day now takes twenty minutes.', name: 'Priya Raghavan', role: 'Sales Manager' },
  { rating: 5, quote: 'Building an agent in Copilot Studio was the part I expected to lose. Ambrose walked it through without jargon.', name: 'Vinod Menon', role: 'Operations Head' },
  { rating: 5, quote: 'Our finance team drafts the month-end summary with Copilot now and reviews it, instead of retyping it.', name: 'Fatima Al-Harbi', role: 'Finance Lead' },
  { rating: 4, quote: 'Practical from the first minute. Every demonstration used a task I actually do on a Monday morning.', name: 'Sneha Kulkarni', role: 'HR Manager' },
  { rating: 5, quote: 'I came for the Excel tips and left with a prompt library I reuse across Word and Outlook every day.', name: 'Arjun Desai', role: 'Business Owner' },
  { rating: 5, quote: 'Straight answers in the Q&A, even on the awkward rollout and licensing questions.', name: 'Rahul Iyer', role: 'IT Administrator' },
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
        if (!c.startsAt && courses.some((x) => x.key === 'webinar')) WEBINAR_DATE = 'New dates announced soon'
        MORE_DATES = (c.upcoming ?? []).slice(1).map(whenLine)
      }
      if (c.startsAt) {
        const facts = hero.facts ?? []
        const setFact = (label, value) => { const f = facts.find(([l]) => l === label); if (f) f[1] = value }
        if (c.key === 'webinar') {
          const longSpan = c.endsAt ? ` · ${istTime(c.startsAt)} – ${istTime(c.endsAt)} IST` : ''
          WEBINAR_DATE = whenLine(c)
          if (c.language) hero.title = hero.title.replace(/– [^–]+$/, `– ${c.language}`)
          hero.meta = `${longDay(c.startsAt)}${longSpan}${c.language ? ` · ${c.language}` : ''}`
        } else if (c.key === 'workshop') {
          hero.highlights[0] = longDay(c.startsAt)
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
