import { EmptyState } from '../ui'

/** Rebuilt in phase 2. */
export function Diagnosis() {
  return (
    <main id="main" className="page">
      <header className="page__head">
        <h1 className="page__title">Diagnosis</h1>
      </header>
      <div className="page__body" style={{ justifyContent: 'center' }}>
        <EmptyState title="Being rebuilt" body="The scan view is next up in the redesign." />
      </div>
    </main>
  )
}
