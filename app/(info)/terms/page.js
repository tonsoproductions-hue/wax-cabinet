export const metadata = { title: 'Terms of Use · Vinyl Crate' }

const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL

export default function Terms() {
  return (
    <>
      <h1>Terms of Use</h1>
      <p className="updated">Last updated November 9, 2026</p>

      <p>Vinyl Crate is run by Tonso Productions (“we”). By using the app or website you agree to these terms. If you don’t agree, please don’t use it.</p>

      <h2>Who can use it</h2>
      <p>You must be at least 13 years old to use Vinyl Crate.</p>

      <h2>Your account</h2>
      <p>You sign in with your email address. Keep your email account secure, and you’re responsible for activity under your account. You can delete your account at any time (see <a href="/delete-account/">Delete Your Account and Data</a>).</p>

      <h2>Your content</h2>
      <ul>
        <li>You keep ownership of what you add, such as your record list and photos.</li>
        <li>You give us permission to store and display it as needed to provide the service. That includes showing it publicly when Public Collection is on, and cover photos at public web addresses.</li>
        <li>Only upload photos you have the right to use. Record covers and artwork belong to their owners.</li>
      </ul>

      <h2>Acceptable use</h2>
      <p>Please don’t:</p>
      <ul>
        <li>abuse, attack or overload the service;</li>
        <li>scrape or bulk-copy data from it;</li>
        <li>try to get around the daily lookup limit or other protections;</li>
        <li>upload anything unlawful, or anything you don’t have the right to share.</li>
      </ul>

      <h2>AI and Discogs information</h2>
      <p>Album identifications, pressings, tracklists and price estimates come from AI and from Discogs. They are provided as-is and may be wrong. They are not appraisals, so please double-check before you buy, sell or insure anything.</p>

      <h2>Trademarks</h2>
      <p>Discogs and Anthropic’s Claude are marks of their respective owners. Vinyl Crate is not affiliated with or endorsed by Apple or Discogs.</p>

      <h2>The service</h2>
      <p>Vinyl Crate is free. We may change it, add limits or stop it at any time.</p>

      <h2>Ending your use</h2>
      <p>You can stop using Vinyl Crate and delete your account whenever you like. We may suspend or remove accounts that break these terms.</p>

      <h2>No warranties, limited liability</h2>
      <p>Vinyl Crate is provided “as is” and “as available”, without promises that it will be accurate, uninterrupted or error-free. To the fullest extent the law allows, we aren’t liable for indirect or consequential losses, or for lost data or lost profits, arising from your use of the service. Nothing here limits rights you have under law that can’t be waived.</p>
      {/* TODO(owner): add governing law / legal entity if desired */}

      <h2>Apple</h2>
      <p>If you use the iPhone app, Apple’s standard <a href="https://www.apple.com/legal/internet-services/itunes/dev/stdeula/">Licensed Application End User License Agreement</a> also applies.</p>

      <h2>Changes</h2>
      <p>We may update these terms. The date at the top shows the latest version, and continuing to use Vinyl Crate means you accept the changes.</p>

      <h2>Contact</h2>
      <p>Questions: {SUPPORT_EMAIL ? <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> : 'see the Support page'}. See also our <a href="/privacy/">Privacy Policy</a>.</p>
    </>
  )
}
