/* Every entry must point at a section that is actually rendered in App.jsx.
   Agenda and FAQ were dropped because Agenda.jsx and Faq.jsx are commented
   out there — re-add them here if those sections come back. */
export const NAV_LINKS = [
  { href: '#overview', label: 'Overview' },
  { href: '#learn', label: "What You'll Learn" },
  { href: '#benefits', label: 'Benefits' },
  { href: '#speaker', label: 'Speaker' },
]

export const HERO_CHECKS = ['Live demonstration', 'Practical use cases', 'Q&A session', 'Limited seats']

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

export const AGENDA = [
  { n: '01', day: 'Day 1', time: '0 – 30 MIN', t: 'Copilot Foundations', d: 'Introduction to Copilot, prompting and best practices across Microsoft 365.' },
  { n: '02', day: 'Day 2', time: '30 – 60 MIN', t: 'Copilot in Action', d: 'Hands-on with Excel, Word, PowerPoint, Outlook and Teams.' },
  { n: '03', day: 'Day 3', time: '60 – 90 MIN', t: 'Automation & Insights', d: 'Power Automate, Power BI and Power Apps working alongside Copilot.' },
  { n: '04', day: 'Day 4', time: '90 – 120 MIN', t: 'Build & Deploy AI Agents', d: 'Build a Copilot Studio agent, see it live, and close with Q&A.' },
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
  { q: 'How do I join the webinar?', a: 'Register on this page and the joining link is sent to your email, along with a calendar invitation and a reminder before the session.' },
  { q: 'Will learning resources be provided?', a: 'Practical checklists and reference material are shared with registered participants where applicable.' },
]

// Footer content. Contact details are AmBot365's own, taken from the site.
// TODO: the legal and social hrefs are placeholders — swap in the real URLs.
export const FOOTER = {
  company: 'Ambot365 RPA & IT Solutions OPC Pvt Ltd',
  tagline: 'AI • Automation • Microsoft 365 Solutions',
  regions: 'UAE | India',
  email: 'Connect@ambot365.in',
  phone: '+91 9043777365',
  location: 'Coimbatore | Tamil Nadu',
  // Real, working anchors on this page.
  webinar: [
    { href: '#overview', label: 'Overview' },
    { href: '#learn', label: "What You'll Learn" },
    { href: '#agenda', label: 'Agenda' },
    { href: '#speaker', label: 'Speaker' },
    { href: '#faq', label: 'FAQ' },
    { href: '#register', label: 'Reserve a seat' },
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
    { href: '#', label: 'Terms & Conditions' },
    { href: '#', label: 'Privacy Policy' },
    { href: '#', label: 'Disclaimer' },
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
