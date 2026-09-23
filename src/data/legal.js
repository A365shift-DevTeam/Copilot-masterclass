/* Legal copy shown in the footer's Terms & Conditions and Privacy Policy
 * dialogs. The same text lives in the static pages under public/legal/,
 * which Razorpay and search engines link to directly; edit both together. */

export const LEGAL = {
  terms: {
    id: 'terms',
    title: 'Terms & Conditions',
    intro:
      'By accessing this website or registering for the Microsoft 365 Copilot Masterclass, you agree to the terms below.',
    agreeLabel: 'I agree',
    hint: 'Read all terms before accepting.',
    sections: [
      {
        heading: 'Use of Website',
        body: 'The content on this website is for general information purposes only. Unauthorized use or misuse is prohibited.',
      },
      {
        heading: 'Registration and Payments',
        body: 'A seat in the masterclass is confirmed only after a successful payment. Payments are processed securely by Razorpay; Ambot365 does not store your card or bank details. Session joining details are sent to the email address and phone number you provide at registration.',
      },
      {
        heading: 'Intellectual Property',
        body: 'All content, including text, design, branding, and session material, is owned by Ambot365 and may not be copied, recorded, or reused without permission.',
      },
      {
        heading: 'Services',
        body: 'Any services described on this website are subject to separate agreements, proposals, or contracts.',
      },
      {
        heading: 'Limitation of Liability',
        body: 'Ambot365 is not liable for any direct or indirect damages arising from the use of this website, its content, or the masterclass.',
      },
      {
        heading: 'External Links',
        body: 'Our website may contain links to third-party sites. We are not responsible for their content or practices.',
      },
      {
        heading: 'Changes to Terms',
        body: 'We may update these terms at any time without prior notice.',
      },
      {
        heading: 'Contact',
        body: 'For any questions about these terms, contact us at',
        email: 'Connect@ambot365.in',
      },
    ],
  },

  privacy: {
    id: 'privacy',
    title: 'Privacy Policy',
    intro:
      'Ambot365 respects your privacy and is committed to protecting your personal information.',
    agreeLabel: 'I understand',
    hint: 'Read the full policy to continue.',
    sections: [
      {
        heading: 'Information We Collect',
        body: 'We may collect basic information such as your name, email address, phone number, and company details when you register for the masterclass, fill out forms, or contact us.',
      },
      {
        heading: 'How We Use Information',
        body: 'We use your information to:',
        list: [
          'Confirm your registration and send session joining details',
          'Respond to inquiries and provide services',
          'Improve our website and offerings',
          'Communicate updates or relevant information',
        ],
      },
      {
        heading: 'Data Protection',
        body: 'We implement appropriate security measures to protect your data. We do not sell or share your personal information with third parties without consent, except as required by law.',
      },
      {
        heading: 'Cookies and Tracking',
        body: 'Our website may use cookies or analytics tools to enhance user experience and improve performance.',
      },
      {
        heading: 'Third-Party Services',
        body: 'We may use third-party tools (such as Razorpay for payments, analytics, or hosting services) that may process your data as part of their services. Payment details are handled by Razorpay under its own privacy policy and are not stored by Ambot365.',
      },
      {
        heading: 'Your Rights',
        body: 'You can request access, correction, or deletion of your data by contacting us.',
      },
      {
        heading: 'Contact',
        body: 'For any privacy-related concerns, contact us at',
        email: 'Connect@ambot365.in',
      },
    ],
  },
}
