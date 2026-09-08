import { EmptyState } from '../ui'

/** Rebuilt in phase 2. */
export function Solutions() {
  return (
    <main id="main" className="page">
      <header className="page__head">
        <h1 className="page__title">Solutions</h1>
      </header>
      <div className="page__body" style={{ justifyContent: 'center' }}>
        <EmptyState
          title="Being rebuilt"
          body="Repair options, costs and mechanics come back in phase 2."
        />
      </div>
    </main>
  )
}
