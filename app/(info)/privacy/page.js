export const metadata = { title: 'Privacy Policy · Vinyl Crate' }

const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL

export default function Privacy() {
  return (
    <>
      <h1>Privacy Policy</h1>
      <p className="updated">Last updated November 9, 2026</p>

      <nav className="info-nav">
        <a href="/support/">Support</a> · <a href="/terms/">Terms of Use</a> · <a href="/delete-account/">Delete Your Account</a>
      </nav>

      <h2>Summary</h2>
      <p>Vinyl Crate helps you catalogue your vinyl records. It is run by Tonso Productions (“we”). In short:</p>
      <ul>
        <li>We store your email address and the records, wish-list items and cover photos you add, so the app can work.</li>
        <li>Your collection is public to anyone with your link by default. You can turn that off in Settings.</li>
        <li>Cover photos are stored at web addresses that anyone who has the address can open, even if your collection is private.</li>
        <li>To identify an album we send your photo or search words to Anthropic’s Claude, and artist and title searches to Discogs.</li>
        <li>No ads, no analytics, no tracking, and we never sell or share your personal information.</li>
        <li>You can export your collection or delete your account and data at any time, in the app.</li>
      </ul>

      <h2>What we collect</h2>
      <table>
        <thead>
          <tr>
            <th>Data</th>
            <th>Why</th>
            <th>Where it is stored</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Email address and a randomly assigned user ID</td>
            <td>To sign you in (email link and 6-digit code, or an optional password) and to tie your data to your account</td>
            <td>Supabase (authentication)</td>
          </tr>
          <tr>
            <td>Your records and wish-list items: artist, title, year, genre, label, condition, Discogs release ID, estimated market value, cover image address, tracklist, favourite and wish-list flags, date added</td>
            <td>To show and manage your collection</td>
            <td>Supabase (database)</td>
          </tr>
          <tr>
            <td>Cover photos you add (resized on your device to about 800 pixels wide first)</td>
            <td>To display covers in your collection</td>
            <td>Supabase (storage, in a public bucket)</td>
          </tr>
          <tr>
            <td>One profile setting: whether your collection is public (on by default)</td>
            <td>To control who can browse your collection</td>
            <td>Supabase (database)</td>
          </tr>
          <tr>
            <td>A lookup log: your user ID, time, which AI model answered, how much text it processed and what it cost</td>
            <td>To enforce the limit of 40 lookups per 24 hours and to control costs</td>
            <td>Supabase (database)</td>
          </tr>
          <tr>
            <td>Photos or typed search words and optional hints sent for identification</td>
            <td>To identify an album when you ask us to</td>
            <td>Sent for that request only (see service providers below); we do not keep the typed text or the scanned photo as part of the log</td>
          </tr>
          <tr>
            <td>Standard server logs, including IP address</td>
            <td>To run and secure the service</td>
            <td>Vercel (our host)</td>
          </tr>
        </tbody>
      </table>

      <h2>What stays on your device</h2>
      <ul>
        <li>Your chosen appearance (Classic iPod or Wood Hi-Fi) and player colour are saved on your device and never sent to us.</li>
        <li>A sign-in token is saved on your device so you stay signed in. It’s sent only to our own servers, to prove requests come from you.</li>
      </ul>
      <p>On iPhone, the app asks permission before using the <strong>Camera</strong> or <strong>Photo Library</strong>, and only when you choose to photograph or pick a cover. It uses <strong>Motion</strong> for shake-to-shuffle. Motion data is read on your device, and it is never stored or sent anywhere.</p>

      <h2>What we do not collect</h2>
      <ul>
        <li>Your name, phone number or social-media accounts.</li>
        <li>Your location or contacts.</li>
        <li>Advertising identifiers, analytics or crash-reporting data.</li>
        <li>Payment information. The app is free and has no in-app purchases.</li>
      </ul>
      <p>We use no advertising or analytics tools, no tracking, no advertising cookies and no data brokers. We do not sell or share your personal information.</p>

      <h2>Who can see your collection</h2>
      <p>Your collection is public by default so that share links work. Anyone with your link can browse it, read-only. Turn off <em>Public Collection</em> in Settings and your records are visible only to you.</p>
      <p><strong>Cover photos are different.</strong> They live in a public storage bucket, so anyone who has a photo’s web address can open it, even when your collection is private. Please don’t photograph anything private.</p>

      <h2>Service providers</h2>
      <p>We use these companies to run Vinyl Crate:</p>
      <ul>
        <li><strong>Anthropic (Claude API)</strong> reads the cover photo you scan, or the words and optional hint you type, to identify the album. This is sent through our server for that request only. Under Anthropic’s commercial API terms, inputs are not used to train its models. Lookups require you to be signed in.</li>
        <li><strong>Discogs</strong> receives artist and title search terms and release IDs from our server, not your identity, and returns pressings, tracklists, cover images and price suggestions.</li>
        <li><strong>Supabase</strong> provides sign-in, the database and file storage. It also sends the sign-in emails, possibly through an email delivery provider such as Resend.</li>
        <li><strong>Vercel</strong> hosts the website and the app’s servers, and keeps standard server logs, including IP addresses.</li>
      </ul>
      <p>These providers process data on our behalf to provide their services.</p>

      <h2>How long we keep it</h2>
      <p>We keep your account, records, photos, setting and lookup log until you delete them or delete your account. Deleting your account removes all of it. Backups and server logs held by our providers aren’t under our direct control and expire on those providers’ own schedules. See <a href="/delete-account/">Delete Your Account and Data</a>.</p>

      <h2>Deleting your data</h2>
      <p>In the app, go to Settings → <em>Delete Account</em>. You can remove individual records at any time. The full steps are on the <a href="/delete-account/">Delete Your Account and Data</a> page.</p>

      <h2>Exporting your data</h2>
      <p>Settings → <em>Export Spreadsheet</em> creates a CSV file of your collection that you can open in Excel, Numbers or Google Sheets.</p>

      <h2>Your rights</h2>
      <p>You can access, correct, delete and export your data yourself in the app, as described above. Depending on where you live, you may also have these rights:</p>
      <ul>
        <li><strong>Access and portability:</strong> to get a copy of your data. Use Export Spreadsheet, or email us.</li>
        <li><strong>Correction:</strong> to fix inaccurate data. Edit your records in the app, or email us.</li>
        <li><strong>Deletion:</strong> to have your data erased. Use Delete Account, or email us.</li>
        <li><strong>Objection and restriction:</strong> to object to or limit how we use your data. Email us.</li>
      </ul>
      <p><strong>EU and UK.</strong> We process your data to provide the service you asked for (contract) and for our legitimate interests in keeping it secure and affordable, such as the daily lookup limit. You may also lodge a complaint with your local data protection authority.</p>
      <p><strong>California.</strong> You have the right to know what personal information we collect, to request its deletion or correction, and not to be discriminated against for using these rights. We do not sell or share personal information, and we do not track you across other companies’ apps or websites.</p>
      <p>To use a right by email, write from the address on your account. We’ll respond within the time required by law.</p>

      <h2>Security</h2>
      <p>Data travels over encrypted connections and is stored with reputable providers. Each account’s records are accessible only to that account, apart from the public view of a collection you have left public. No system is perfectly secure, so we can’t guarantee absolute security.</p>

      <h2>International transfers</h2>
      <p>Our providers are US-based companies, so your data may be processed in the United States and other countries whose data protection laws may differ from yours.</p>

      <h2>Children</h2>
      <p>Vinyl Crate isn’t directed at children under 13, and we don’t knowingly collect their information. If you believe a child has given us data, email us and we’ll delete it.</p>

      <h2>Changes to this policy</h2>
      <p>If we change this policy, we’ll update the date at the top. If a change is significant, we’ll say what changed at the top of this page.</p>

      <h2>Contact</h2>
      <p>Questions about privacy: {SUPPORT_EMAIL ? <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> : 'see the Support page'}.</p>
    </>
  )
}
