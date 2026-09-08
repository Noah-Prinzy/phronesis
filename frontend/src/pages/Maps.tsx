import { EmptyState } from '../ui'

/** Rebuilt in phase 2. */
export function Maps() {
  return (
    <main id="main" className="page">
      <header className="page__head">
        <h1 className="page__title">Map</h1>
      </header>
      <div className="page__body" style={{ justifyContent: 'center' }}>
        <EmptyState title="Being rebuilt" body="Finding people nearby comes back in phase 2." />
      </div>
    </main>
  )
}
