import { EmptyState } from '../ui'

/**
 * A route that exists but has nothing behind it yet. Says so plainly rather
 * than showing an empty shell the user has to interpret.
 */
export function Placeholder({ title, body }: { title: string; body: string }) {
  return (
    <main id="main" className="page">
      <header className="page__head">
        <h1 className="page__title">{title}</h1>
      </header>
      <div className="page__body" style={{ justifyContent: 'center' }}>
        <EmptyState title="Not built yet" body={body} />
      </div>
    </main>
  )
}
