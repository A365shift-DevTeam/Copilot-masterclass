export const NAV_LINKS = [
  { href: '#overview', label: 'Overview' },
  { href: '#learn', label: "What You'll Learn" },
  { href: '#agenda', label: 'Agenda' },
  { href: '#speaker', label: 'Speaker' },
  { href: '#faq', label: 'FAQ' },
]

export const HERO_CHECKS = ['Live demonstration', 'Practical use cases', 'Q&A session', 'Limited seats']

export const APP_CARDS = [
  { mark: 'X', title: 'Microsoft Excel', icon: 'microsoft-365/excel.svg', color: '#35A160', tint: '#E9F7EE', points: ['Analyse data', 'Create formulas', 'Identify trends', 'Generate summaries', 'Automate repetitive work'] },
  { mark: 'W', title: 'Microsoft Word', icon: 'microsoft-365/word.svg', color: '#1D5368', tint: '#E8F3F8', points: ['Generate documents', 'Rewrite content', 'Summarise information', 'Improve communication'] },
  { mark: 'P', title: 'Microsoft PowerPoint', icon: 'microsoft-365/powerpoint.svg', color: '#35A160', tint: '#E9F7EE', points: ['Generate presentations', 'Create slide structures', 'Summarise documents into decks'] },
  { mark: 'O', title: 'Microsoft Outlook', icon: 'microsoft-365/outlook.svg', color: '#1D5368', tint: '#E8F3F8', points: ['Draft emails', 'Summarise threads', 'Prioritise communication'] },
  { mark: 'T', title: 'Microsoft Teams', icon: 'microsoft-365/teams.svg', color: '#35A160', tint: '#E9F7EE', points: ['Meeting summaries', 'Action items', 'Collaboration assistance'] },
  { mark: 'B', title: 'Microsoft Power BI', icon: 'power-platform/power-bi.svg', color: '#1D5368', tint: '#E8F3F8', points: ['AI-assisted analysis', 'Business insights', 'Data storytelling'] },
  { mark: 'A', title: 'Power Automate', icon: 'power-platform/power-automate.svg', color: '#35A160', tint: '#E9F7EE', points: ['Workflow automation', 'Approvals', 'Notifications', 'Microsoft 365 integration'] },
  { mark: 'S', title: 'SharePoint', icon: 'microsoft-365/sharepoint.svg', color: '#1D5368', tint: '#E8F3F8', points: ['Knowledge management', 'Enterprise content', 'Copilot-powered search'] },
]

export const FLOW_STEPS = [
  { n: '1', label: 'Employee asks a question' },
  { n: '2', label: 'Copilot agent interprets intent' },
  { n: '3', label: 'Microsoft 365 context applied' },
  { n: '4', label: 'SharePoint / CRM / business data' },
  { n: '5', label: 'Automation runs' },
]

export const AGENT_CAPS = ['Answer questions', 'Search company knowledge', 'Create support tickets', 'Check customer information', 'Trigger workflows', 'Generate responses']

export const AGENDA = [
  { n: '01', t: 'Introduction to Microsoft 365 Copilot' },
  { n: '02', t: 'Using Copilot across Microsoft 365' },
  { n: '03', t: 'Real-world AI productivity workflows' },
  { n: '04', t: 'Building AI agents with Copilot Studio' },
  { n: '05', t: 'Automating business processes' },
  { n: '06', t: 'Live demonstration' },
  { n: '07', t: 'Q&A and implementation guidance' },
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
  { i: 'LT', t: 'Live Training', d: 'Instructor-led interactive webinar.' },
  { i: 'UC', t: 'Real Use Cases', d: 'Practical Microsoft 365 scenarios.' },
  { i: 'WF', t: 'AI Workflows', d: 'Reusable productivity techniques.' },
  { i: 'QA', t: 'Q&A', d: 'Ask implementation questions directly.' },
  { i: 'LM', t: 'Learning Materials', d: 'Resources and checklists where applicable.' },
]

export const EXPERTISE = ['Business Automation', 'Artificial Intelligence', 'Microsoft 365', 'Microsoft Copilot', 'Business Applications', 'Digital Transformation']

export const ECOSYSTEM = [
  { i: 'CP', t: 'Microsoft Copilot Solutions', d: 'AI agents for smarter daily work.' },
  { i: 'OB', t: 'Office AI Bots', d: 'Automate repetitive office processes.' },
  { i: 'HB', t: 'Business Hub CRM', d: 'Leads, customers, projects, finance and sales.' },
  { i: 'CB', t: 'AI Chatbot', d: '24/7 intelligent customer engagement.' },
  { i: 'DX', t: 'Premium Digital Experiences', d: 'Modern interactive web solutions.' },
]

export const TESTIMONIALS = [
  { quote: 'Placeholder testimonial — replace with a verified participant quote once collected.', name: 'Participant name', role: 'Role — Organisation' },
  { quote: 'Placeholder testimonial — replace with a verified participant quote once collected.', name: 'Participant name', role: 'Role — Organisation' },
  { quote: 'Placeholder testimonial — replace with a verified participant quote once collected.', name: 'Participant name', role: 'Role — Organisation' },
  { quote: 'Placeholder testimonial — replace with a verified participant quote once collected.', name: 'Participant name', role: 'Role — Organisation' },
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
