export const metadata = { title: 'Delete Your Account · Vinyl Crate' }

const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL

export default function DeleteAccount() {
  return (
    <>
      <h1>Delete Your Account and Data</h1>
      <p className="updated">Last updated November 9, 2026</p>

      <h2>Delete your account in the app</h2>
      <ol>
        <li>Open Vinyl Crate and tap the Settings gear (top left).</li>
        <li>Scroll to the bottom and tap <em>Delete Account</em>.</li>
        <li>Confirm when asked.</li>
      </ol>
      <p>Deletion is permanent and can’t be undone.</p>

      <h2>What is deleted</h2>
      <ul>
        <li>Your account and email address.</li>
        <li>Every record and wish-list item in your collection.</li>
        <li>The cover photos you uploaded.</li>
        <li>Your profile setting (the Public Collection switch).</li>
        <li>Your lookup log.</li>
      </ul>
      <p>Your share link stops working because the collection no longer exists.</p>

      <h2>What happens immediately, and what lingers</h2>
      <p>Your account, records, photos, setting and lookup log are removed from our live systems as soon as you confirm. Our hosting and database providers may keep backups and server logs for a while longer; those expire on the providers’ own schedules.</p>

      <h2>Delete only some of your data</h2>
      <ul>
        <li>Remove an individual record: open it and tap <em>Remove from Collection</em>, or tap <em>Edit</em> on the Albums list. If you uploaded its cover photo, that’s deleted too.</li>
        <li>Make your collection private: turn off the <em>Public Collection</em> switch in Settings.</li>
      </ul>

      <h2>Can’t sign in?</h2>
      <p>{SUPPORT_EMAIL ? <>Email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> from the email address on the account and ask us to delete it.</> : 'Contact us through the Support page from the email address on the account and ask us to delete it.'} We’ll confirm once it’s done.</p>

      <h2>What isn’t affected</h2>
      <ul>
        <li>A CSV spreadsheet you exported earlier. It’s a file on your device, so it’s yours to keep or delete.</li>
        <li>Links or screenshots of your collection that other people already saved.</li>
      </ul>

      <p><a href="/privacy/">Privacy Policy</a> · <a href="/terms/">Terms of Use</a> · <a href="/support/">Support</a></p>
    </>
  )
}
