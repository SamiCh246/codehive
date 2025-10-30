export default function ComingSoon({ page = 'feature' }) {
  // Capitalize the first letter of the page name
  const pageTitle = page.charAt(0).toUpperCase() + page.slice(1)
  
  return (
    <section className="section">
      <div className="section__header">
        <h1 className="section__title">{pageTitle} Coming Soon</h1>
        <p className="section__subtitle">This feature is currently in development and will be available soon.</p>
      </div>
    </section>
  )
}
