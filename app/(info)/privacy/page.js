export const metadata = { title: 'Privacy Policy · Vinyl Crate' }

const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL

export default function Privacy() {
  return (
    <>
      <h1>Privacy Policy</h1>
      <p className="updated">Last updated October 7, 2026</p>

      <p>Vinyl Crate helps you catalogue your vinyl records. This page explains what the app stores, who it’s shared with and how to delete it.</p>

      <h2>What we store</h2>
      <ul>
        <li><strong>Your email address</strong>, to sign you in. We don’t ask for your name or a password unless you choose one.</li>
        <li><strong>Your collection</strong>: the artist, title, year, genre, label, condition, value and tracklist of each record you add.</li>
        <li><strong>Cover photos you add.</strong> They’re stored at a web address that anyone who has it can open, so don’t photograph anything private.</li>
        <li><strong>A log of lookups</strong> (time, which AI model answered and its cost) for cover scans and name searches, used to keep the service affordable and enforce a daily limit.</li>
      </ul>
      <p>We don’t use advertising, analytics trackers or data brokers, and we don’t sell your information.</p>

      <h2>Who sees your collection</h2>
      <p>Your collection is public by default so that share links work: anyone with your link can browse it. Turn off <em>Public Collection</em> in Settings to make it visible only to you.</p>

      <h2>Services we use</h2>
      <ul>
        <li><strong>Anthropic (Claude)</strong> reads the cover photo you scan, or the words you type in the search box, to identify the album. They’re sent for that request only; Anthropic doesn’t use API data to train its models.</li>
        <li><strong>Discogs</strong> receives the artist and title we search for, to find pressings, tracklists and prices.</li>
        <li><strong>Supabase</strong> stores your account, collection and cover photos.</li>
        <li><strong>Vercel</strong> hosts the website and the app’s servers.</li>
      </ul>

      <h2>Deleting your data</h2>
      <p>In the app, go to Settings → <em>Delete Account</em>. This permanently deletes your account, your records and your cover photos. You can also remove individual records at any time.</p>

      <h2>Children</h2>
      <p>Vinyl Crate isn’t directed at children under 13, and we don’t knowingly collect their information.</p>

      <h2>Contact</h2>
      <p>Questions about privacy: {SUPPORT_EMAIL ? <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> : 'see the Support page'}.</p>
    </>
  )
}
