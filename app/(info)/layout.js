// Plain document pages (privacy policy, support) linked from Settings and
// from the App Store listing.
export default function InfoLayout({ children }) {
  return (
    <div className="info-page">
      <article>{children}</article>
    </div>
  )
}
