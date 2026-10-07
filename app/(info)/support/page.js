export const metadata = { title: 'Support · Vinyl Crate' }

const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL

export default function Support() {
  return (
    <>
      <h1>Vinyl Crate Support</h1>

      <h2>Getting started</h2>
      <ol>
        <li>Open Settings (the gear) and choose <em>Sign In or Create Account</em>. Enter your email, then tap the link or type the 6-digit code we send.</li>
        <li>On the Import tab, choose a photo of a record cover, or type its name (or a description, like “the one with the prism on the front”) and tap <em>Find</em>. Vinyl Crate identifies it and lists matching pressings from Discogs.</li>
        <li>Pick your pressing, check the details and tap <em>Add to Collection</em>.</li>
      </ol>

      <h2>Common questions</h2>
      <h3>The cover wasn’t recognised</h3>
      <p>Tap <em>Wrong Album — Ask Again</em>, add a hint, or type the name into the search box instead. You can also search Discogs directly under <em>Not Right?</em>. Each account can make a limited number of lookups per day.</p>
      <h3>The sign-in email didn’t arrive</h3>
      <p>Check your spam folder and wait a minute before asking for another. In the app, you can type the 6-digit code from the email instead of tapping the link.</p>
      <h3>How do I share my collection?</h3>
      <p>Settings → <em>Share Collection Link</em>. People with the link can browse and shuffle but can’t change anything. Turn off <em>Public Collection</em> to stop sharing.</p>
      <h3>How do I export my records?</h3>
      <p>Settings → <em>Export Spreadsheet</em> creates a CSV file for Excel, Numbers or Google Sheets.</p>
      <h3>How do I delete my account?</h3>
      <p>Settings → <em>Delete Account</em>. This removes your account, records and cover photos for good.</p>

      <h2>Contact</h2>
      <p>{SUPPORT_EMAIL ? <>Email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> and we’ll get back to you.</> : 'Support contact coming soon.'}</p>
      <p><a href="/privacy/">Privacy Policy</a></p>
    </>
  )
}
