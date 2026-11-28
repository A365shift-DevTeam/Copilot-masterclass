// Microsoft Copilot icon used by the pricing cards and the hero course popup.
export const COPILOT_ICON = 'https://cdn.jsdelivr.net/gh/DamoBird365/microsoft-cloud-icons@master/icons/copilot/copilot-365.svg'

/* Every "Reserve a seat" CTA on the page — nav, hero, the ticket and seat
   reveals, the repeating section pill and the footer link — sends the viewer
   straight to the hosted payment page. There is no on-page registration form
   any more (Register.jsx is commented out of App.jsx), so this is the single
   place the checkout URL lives. */
export let PAYMENT_URL = 'https://link.trym.co.in/widget/form/NkftkuuLIgwagCAj0LQL'
export const RECORDED_PAYMENT_URL = 'https://link.trym.co.in/widget/form/Py8Ql9ccGxzsI9b63vRs'

/* Thank-you page. Paste the real WhatsApp Community invite over this placeholder. */
export let WHATSAPP_COMMUNITY_URL = 'https://chat.whatsapp.com/Fe1uU0KfSq86Hdk4wX0zhr'

/* Every entry must point at a section that is actually rendered in App.jsx.
   Agenda and FAQ were dropped because Agenda.jsx and Faq.jsx are commented
   out there — re-add them here if those sections come back. */
export const NAV_LINKS = [
  { href: '#overview', label: 'Overview' },
  { href: '#learn', label: "What You'll Learn" },
  { href: '#benefits', label: 'Benefits' },
  { href: '#speaker', label: 'Speaker' },
  { href: '#pricing', label: 'Pricing' },
]

/* 1:1 coaching programmes shown after the Speaker section.
   An empty `url` hides that card's Enrol button. */
export const PROGRAMMES = [
  {
    key: 'skill-builder',
    name: 'AI Skill Builder',
    tagline: 'Build hands-on Copilot skills with a personal coach.',
    points: ['15-day programme', '2.5 hours of 1:1 coaching', '5 calls of 30 minutes'],
    pkg: '₹16,249',
    save: '₹11,250',
    price: '₹4,999',
    url: 'https://rzp.io/rzp/8b0AZrP',
  },
  {
    key: 'project-builder',
    name: 'AI Project Builder',
    tagline: 'Ship a real AI project with guided reviews.',
    points: ['30-day programme', '5 hours of 1:1 coaching', 'Project guidance and review'],
    pkg: '₹32,499',
    save: '₹22,500',
    price: '₹4,999',
    url: 'https://rzp.io/rzp/OMsvnqoC',
    featured: true,
  },
]

/* Shown under "Join the Webinar" in the hero. Change it before each session,
   e.g. 'Sun, 29 Nov 2026 · 7:00 PM IST' once the start time is set. */
export let WEBINAR_DATE = 'Sat 28 Nov 2026 · 9 AM – 1 PM IST in Tamil'
/* The webinar's later dates from the admin (after the one in WEBINAR_DATE), written the same way. */
export let MORE_DATES = []

export const HERO_CHECKS = ['Live demonstration', 'Practical use cases', 'Q&A session', 'Limited seats']

/* Hero price table. `name` is the table row and `url` is where Register goes.
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
    name: 'M365 Apps using copilot',
    price: 499,
    url: PAYMENT_URL,
    title: 'Microsoft Copilot Live Webinar – Tamil',
    meta: 'Saturday, 28 November 2026 · 9:00 AM – 1:00 PM IST · Tamil',
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
    name: 'Microsoft Excel with Copilot',
    price: 799,
    url: 'https://link.trym.co.in/widget/form/z4WbJOkIp0CdLuPuXAiE', // TODO: replace with this program's own form link
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
    name: 'M365 Copilot Recorded Videos',
    price: 999,
    url: RECORDED_PAYMENT_URL,
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
    name: 'M365 copilot 1 to 1 Project support',
    price: 4999,
    url: PROGRAMMES[0].url, // same Razorpay link as the ₹4,999 AI Skill Builder card
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
    name: 'M365Copilot offline Workshop',
    price: 4999,
    url: 'https://rzp.io/rzp/OMsvnqoC',
    title: 'Offline Copilot Workshop – Chennai',
    scene: 'workshop',
    format: 'In person, Chennai',
    summary: 'A full day of hands-on Copilot demonstrations, in Tamil.',
    highlights: ['Saturday, 23 January 2027', 'Venue to be announced'],
    facts: [
      ['Language', 'Tamil'],
      ['Date', '23 January 2027'],
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

// The Overview deck. Six stages in order; `stage` is the one-word beat of
// the story (LEARN -> USE -> BUILD -> PROMPT -> EXPAND -> MASTER) and `icon`
// keys into the lucide set in Overview.jsx.
export const JOURNEY = [
  { n: '01', stage: 'Learn', icon: 'learn', t: 'Copilot Fundamentals', points: ['AI Basics', 'Copilot Essentials'] },
  { n: '02', stage: 'Use', icon: 'use', t: 'Microsoft 365 Copilot', points: ['Work Smarter', 'Across M365 Apps'] },
  { n: '03', stage: 'Build', icon: 'build', t: 'Build Copilot Agents', points: ['Add Knowledge', 'Automate Processes'] },
  { n: '04', stage: 'Prompt', icon: 'prompt', t: 'Smarter Prompting', points: ['Slash Prompts', 'Reusable Instructions'] },
  { n: '05', stage: 'Expand', icon: 'expand', t: 'Beyond Copilot', points: ['Multiple AI Tools', 'One Prompt Structure'] },
  { n: '06', stage: 'Master', icon: 'master', t: 'AI Professional', points: ['30-Day Accelerator', '90-Day Transformation'] },
]

// The Copilot Studio diagram. Step N lights row N of the circuit (one app
// chip on each side), so the apps walk down in time with the build steps.
export const AGENT_HEADER = { name: 'Copilot Agent', tagline: 'Your AI Work Assistant' }

export const AGENT_STEPS = [
  { n: '01', icon: 'create', short: 'Create', t: 'Create Your Agent', d: 'Build an agent for your business process.' },
  { n: '02', icon: 'knowledge', short: 'Knowledge', t: 'Add Knowledge', d: 'Connect your files, data and business knowledge.' },
  { n: '03', icon: 'instruct', short: 'Instruct', t: 'Set Instructions & Behavior', d: 'Define what your agent should do and how it should respond.' },
  { n: '04', icon: 'work', short: 'Work 24/7', t: 'Agent Ready — Works 24/7', d: 'Your trained agent is ready to answer, assist and support your process anytime.' },
]

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

// The agenda deck: four cards in one 9 AM – 1 PM session, each one a title and the three
// things it covers.
export const AGENDA = [
  { n: '01', day: 'First half', t: 'Understand Copilot', points: ['How Copilot Works', 'Copilot Architecture', 'Security & Your Data'] },
  { n: '02', day: 'First half', t: 'Smart Prompting', points: ['How to Talk to Copilot', 'Build Better Prompts', 'Use the Same Prompting Skills Across Copilot'] },
  { n: '03', day: 'Second half', t: 'Copilot in Microsoft 365', points: ['Excel • Word • PowerPoint', 'Outlook • Teams', 'Work Faster with Copilot'] },
  { n: '04', day: 'Second half', t: 'Build with Copilot', points: ['Connect Your Daily Work', 'Create Smart Workflows', 'Build Practical Copilot Skills'] },
]

export const AUDIENCE = [
  { n: '01', icon: 'owner', t: 'Business Owners', d: 'Drive growth, streamline operations, and make smarter decisions.' },
  { n: '02', icon: 'ceo', t: 'CEOs / COOs', d: 'Lead with clarity, align teams, and accelerate business outcomes.' },
  { n: '03', icon: 'managers', t: 'Managers', d: 'Improve team productivity, track progress, and achieve more with less effort.' },
  { n: '04', icon: 'm365', t: 'Microsoft 365 Users', d: 'Get the most out of the Microsoft 365 tools you use every day.' },
  { n: '05', icon: 'sales', t: 'Sales Professionals', d: 'Close more deals, manage pipelines, and engage customers effectively.' },
  { n: '06', icon: 'finance', t: 'Finance Teams', d: 'Automate reporting, ensure accuracy, and gain real-time financial insights.' },
  { n: '07', icon: 'hr', t: 'HR Professionals', d: 'Simplify people processes, improve engagement, and empower your workforce.' },
  { n: '08', icon: 'admin', t: 'Administrative Teams', d: 'Automate routine tasks, manage information, and keep everything organised.' },
  { n: '09', icon: 'educator', t: 'Educators', d: 'Prepare content faster, simplify assessment, and bring AI into the classroom.' },
  { n: '10', icon: 'it', t: 'IT Professionals', d: 'Deploy, govern, and support Copilot confidently across your organisation.' },
  { n: '11', icon: 'dx', t: 'Digital Transformation Teams', d: 'Champion AI adoption and modernise everyday workflows end to end.' },
]

export const USE_CASES = [
  {
    before: ['Open Excel', 'Filter information', 'Create formulas', 'Prepare report', 'Draft email', 'Send report'],
    prompt: '“Analyse this month’s sales and prepare an executive summary.”',
    after: ['AI analysis', 'Charts', 'Summary', 'Email draft'],
  },
  {
    before: ['Read 30 emails manually', 'Note what needs action', 'Reply one by one'],
    prompt: '“Summarise important emails and show actions requiring my attention.”',
    after: ['Thread summaries', 'Action list', 'Draft replies'],
  },
  {
    before: ['Collect the source document', 'Rewrite key points', 'Build slides manually', 'Format the deck'],
    prompt: '“Turn this document into a management presentation.”',
    after: ['Slide structure', 'Presentation', 'Executive summary'],
  },
]

export const DEMOS = ['Excel AI analysis', 'Automatic document creation', 'AI presentations', 'Email assistance', 'Teams meeting intelligence', 'Business workflow automation', 'Copilot agents']

export const DEMO_CONVERSATIONS = [
  { p: 'Analyse this month’s sales and prepare an executive summary.', a: 'Revenue is up 12% month over month, driven by the enterprise segment. I have prepared a three-slide summary and a draft email to the leadership team.' },
  { p: 'Summarise the important emails needing my attention.', a: 'Four threads need action today: two contract approvals, one escalation from a key account, and a pending invoice query. Draft replies are ready.' },
  { p: 'Turn this proposal document into a client presentation.', a: 'Created an eight-slide deck with an executive summary, scope, timeline and commercials, matching your brand template.' },
]

export const BENEFITS = [
  { i: 'LT', icon: 'live', t: 'Live Training', d: 'Instructor-led interactive webinar.' },
  { i: 'UC', icon: 'cases', t: 'Real Use Cases', d: 'Practical Microsoft 365 scenarios.' },
  { i: 'WF', icon: 'workflow', t: 'AI Workflows', d: 'Reusable productivity techniques.' },
  { i: 'QA', icon: 'qa', t: 'Q&A', d: 'Ask implementation questions directly.' },
  { i: 'LM', icon: 'materials', t: 'Learning Materials', d: 'Resources and checklists where applicable.' },
]

// The Benefits fork. Four checkpoints up the Copilot branch, four down the
// unchanged one; each pair sits at the same distance along its branch.
export const CAREER_STEPS = {
  up: ['Save Time with Copilot​', 'Work Smarter with Copilot', 'Build Future-Ready Skills', 'Career Growth'],
  down: ['More Manual Work', 'AI Skills Gap Widens', 'Lower Career Relevance', 'Risk of Falling Behind'],
}

// The question the fork puts to the reader, typed out in the middle of the picture.
export const CAREER_PROMPT = 'Which direction will you choose?'

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

export const ECOSYSTEM = [
  { i: 'CP', t: 'Microsoft Copilot Solutions', d: 'AI agents for smarter daily work.' },
  { i: 'OB', t: 'Office AI Bots', d: 'Automate repetitive office processes.' },
  { i: 'HB', t: 'Business Hub CRM', d: 'Leads, customers, projects, finance and sales.' },
  { i: 'CB', t: 'AI Chatbot', d: '24/7 intelligent customer engagement.' },
  { i: 'DX', t: 'Premium Digital Experiences', d: 'Modern interactive web solutions.' },
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

export const FAQS = [
  { q: 'What is Microsoft 365 Copilot?', a: 'Copilot is the AI assistant built into Microsoft 365. It works inside Word, Excel, PowerPoint, Outlook and Teams to draft content, analyse information and summarise work using your own business context.' },
  { q: 'Who should attend this webinar?', a: 'Business owners, managers, and any team already working in Microsoft 365 who want practical ways to reduce manual effort. No technical background is required.' },
  { q: 'Do I need Microsoft 365 experience?', a: 'Basic familiarity with Word, Excel or Outlook is enough. Every demonstration starts from a real everyday task.' },
  { q: 'Will the webinar include live demonstrations?', a: 'Yes. Capabilities are shown live inside the actual applications, followed by a walkthrough of how to reproduce them.' },
  { q: 'Will Copilot Studio be covered?', a: 'Yes. We cover how AI agents are built, connected to business data and published to your teams.' },
  { q: 'Can businesses use Copilot for automation?', a: 'Yes. Copilot combined with Power Automate handles approvals, notifications, reporting and other repetitive processes across Microsoft 365.' },
  { q: 'Was the program shortened to fit one day?', a: 'No. Day 1 and Day 2 now run together in one session on Saturday, 28 November, from 9 AM to 1 PM IST. All four modules are covered.' },
  { q: 'How do I join the webinar?', a: 'Register on this page and the joining link is sent to your email, along with a calendar invitation and a reminder before the session.' },
  { q: 'Will learning resources be provided?', a: 'Practical checklists and reference material are shared with registered participants where applicable.' },
]

// Footer content. Contact details are AmBot365's own, taken from the site.
// TODO: the social hrefs, Disclaimer and Cookie Policy are placeholders — swap in the real URLs.
// Terms and Privacy open the LegalDialog (key in `dialog`, copy in legal.js);
// the href is the matching static page under public/legal/ for direct links.
export const FOOTER = {
  company: 'Ambot365 RPA & IT Solutions OPC Pvt Ltd',
  tagline: 'AI • Automation • Microsoft 365 Solutions',
  regions: 'UAE | India',
  email: 'Connect@ambot365.in',
  phone: '+91 88707 77365',
  location: 'Coimbatore | Tamil Nadu',
  // Real, working anchors on this page, plus the checkout link.
  webinar: [
    { href: '#overview', label: 'Overview' },
    { href: '#learn', label: "What You'll Learn" },
    { href: '#agenda', label: 'Agenda' },
    { href: '#speaker', label: 'Speaker' },
    { href: '#faq', label: 'FAQ' },
    { href: PAYMENT_URL, label: 'Reserve a seat' },
  ],
  offerings: [
    { href: '#', label: 'M365 Copilot' },
    { href: '#', label: 'M365 Apps' },
    { href: '#', label: 'OfficeBots' },
    { href: '#', label: 'AI Chatbot' },
    { href: '#', label: 'Business Hub CRM' },
    { href: '#', label: 'Premium 3D Websites' },
  ],
  legal: [
    { href: '/legal/terms-and-conditions.html', label: 'Terms & Conditions', dialog: 'terms' },
    { href: '/legal/privacy-policy.html', label: 'Privacy Policy', dialog: 'privacy' },
    { href: '/legal/disclaimer.html', label: 'Disclaimer', dialog: 'disclaimer' },
    { href: '#', label: 'Cookie Policy' },
  ],
  social: [
    { href: '#', label: 'LinkedIn', icon: 'linkedin' },
    { href: '#', label: 'WhatsApp', icon: 'whatsapp' },
    { href: '#', label: 'YouTube', icon: 'youtube' },
    { href: '#', label: 'Instagram', icon: 'instagram' },
    { href: '#', label: 'Facebook', icon: 'facebook' },
  ],
}

// Who the masterclass is for. The first two are the core audience: the page is
// built around Microsoft 365 and Copilot, so they carry the product marks.
export const ATTENDEES = [
  { t: 'Microsoft 365 Users', mark: 'm365' },
  { t: 'Copilot Licensed Users', mark: 'copilot' },
  { t: 'Corporate Professionals' },
  { t: 'Managers & Team Leads' },
  { t: 'Business Owners' },
  { t: 'AI & Automation Learners' },
]

export const LICENSE_NOTE = 'For hands-on Premium Copilot and Agent features, an eligible Microsoft 365 Copilot license is recommended.'

// The five outcomes. `code` is the two-letter monogram shown on each tile.
// `icon` names the glyph drawn on the outcome's badge; `prompt` is the
// example typed for it.
export const LEARN = [
  { code: 'SP', icon: 'prompt', t: 'Smart Prompting', d: 'Learn how to communicate effectively with Copilot.', prompt: 'Summarise this report in five bullet points for my manager, in a confident tone.' },
  { code: 'CA', icon: 'apps', t: 'Copilot Across Apps', d: 'Apply the same prompting approach across Microsoft 365 applications.', prompt: 'Turn the figures in this Excel sheet into a three-slide update for Monday’s meeting.' },
  { code: 'AS', icon: 'shield', t: 'Architecture & Security', d: 'Understand how Copilot works and how your business data is protected.', prompt: 'Which files can you see, and does anything I share leave our tenant?' },
  { code: 'PK', icon: 'bulb', t: 'Practical Knowledge', d: 'Turn prompting knowledge into skills you can use in your everyday work.', prompt: 'Draft a reply to this thread with the agreed next steps and owners.' },
  { code: 'AG', icon: 'agent', t: 'Copilot Agents', d: 'Understand how Agents work and how they can support real business processes.', prompt: 'Create an agent that answers HR policy questions from our SharePoint handbook.' },
]

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

/* Price list (PriceLadder.jsx), one tab per group. Every Enrol button goes to
   the Razorpay store. */
export const STORE_URL = 'https://rzp.io/rzp/VNhx9z1I'

const MS_ICON = (app) => `https://cdn.jsdelivr.net/gh/DamoBird365/microsoft-cloud-icons@master/icons/microsoft-365/${app}.svg`

/* The Pricing section. The tabs are fixed here; the cards come from the admin
   (applySiteData rebuilds each tab's items), so these are only the fallback for
   when the API is down. `key` matches the program in the admin. */
export const PRICE_LADDER = [
  {
    id: 'once',
    name: 'One-time access',
    blurb: 'A single session. Pay once, no commitment.',
    items: [
      { key: 'webinar', name: 'Live Webinar', includes: 'Microsoft 365 Copilot apps live training', price: 499, duration: '3-hour live session', icon: 'monitor-play', cta: 'Register' },
      { key: 'recorded', name: 'Webinar Recording, Flexi Access', includes: 'Watch the recording at your preferred time', price: 999, duration: '3 hours, watch any time', icon: 'circle-play', cta: 'Get the recording' },
    ],
  },
  {
    id: 'single',
    name: 'Individual programs',
    blurb: 'Go deep on one app. 30 days of access each.',
    items: [
      { key: 'ladder-excel', name: 'Copilot for Excel', includes: 'Excel skills and agent building', price: 1499, duration: '30 days access', logos: [MS_ICON('excel')], cta: 'Enrol' },
      { key: 'ladder-word', name: 'Copilot for Word', includes: 'Word skills and agent building', price: 1499, duration: '30 days access', logos: [MS_ICON('word')], cta: 'Enrol' },
      { key: 'ladder-powerpoint', name: 'Copilot for PowerPoint', includes: 'PowerPoint skills and agent building', price: 1499, duration: '30 days access', logos: [MS_ICON('powerpoint')], cta: 'Enrol' },
      { key: 'ladder-outlook-teams', name: 'Copilot for Outlook & Teams', includes: 'Outlook and Teams workflows', price: 1499, duration: '30 days access', logos: [MS_ICON('outlook'), MS_ICON('teams')], cta: 'Enrol' },
      { key: 'ladder-image-gallery', name: 'Image Gallery & App Integration', includes: 'Image gallery and app integration', price: 1499, duration: '30 days access', icon: 'image', cta: 'Enrol' },
    ],
  },
  {
    id: 'bundle',
    name: 'Skill bundles',
    blurb: 'Several related skills, taught together.',
    items: [
      { key: 'ladder-notebook', name: 'Notebook & Copilot Schedule', includes: 'Reverse engineering, Copilot prompting, saving prompts and scheduling prompts', price: 3999, duration: '60 days access', icon: 'calendar-check', cta: 'Enrol' },
      { key: 'ladder-skills-agents', name: 'Copilot Skills & Agents', includes: 'Build skills and agents for Excel, Word and PowerPoint', price: 3999, duration: '30 days access', icon: 'bot', cta: 'Enrol' },
      { key: 'ladder-sharepoint', name: 'SharePoint & Web Applications', includes: 'To-Do lists, Forms, HTML dashboards and SharePoint websites', price: 3999, duration: '30 days access', logos: [MS_ICON('sharepoint')], cta: 'Enrol' },
    ],
  },
  {
    id: 'master',
    name: 'Complete packages',
    blurb: 'Microsoft 365 apps, end to end.',
    items: [
      { key: 'ladder-master', name: 'Master Package', includes: 'All programmes listed on this page', price: 9999, duration: '120 days access', icon: 'layers', featured: true, cta: 'Get the Master Package' },
      { key: 'ladder-premium', name: 'Premium', includes: 'Weekly Copilot updates, 1 project with 5 hours of 1-to-1 support, and access to all new video content', price: 24999, duration: '1 year access', icon: 'gem', cta: 'Get Premium' },
    ],
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

export function applySiteData({ courses = [], whatsappUrl, pricingTabs = [] } = {}) {
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
      title: c.cardTitle || c.name, price: Number(c.price), form: c.form ?? [], url: c.paymentUrl ?? null,
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
  // The Pricing section is rebuilt from the admin's cards: every program with a tab (category), in its order.
  if (courses.some((c) => c.category)) {
    for (const g of PRICE_LADDER) {
      g.items = courses.filter((c) => c.category === g.id).map((c) => ({
        key: c.key, name: c.cardTitle || c.name, includes: c.description ?? '', duration: c.duration ?? '',
        price: Number(c.price), originalPrice: c.originalPrice != null ? Number(c.originalPrice) : null, offer: c.offer ?? null,
        url: c.paymentUrl, hidden: !c.isVisible, cta: c.cta || 'Enrol', featured: !!c.isFeatured,
        ...(c.icon?.startsWith('app:') ? { logos: c.icon.slice(4).split(',').map(MS_ICON) } : { icon: c.icon || 'bot' }),
      }))
    }
  }
  // Every "Reserve a seat" button sells the webinar.
  PAYMENT_URL = HERO_PRICES[0].url
  HERO_PRICES[0].hidden = false
}
