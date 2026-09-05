import { EmptyState } from '../ui'

/**
 * A named stand-in for a hub page that is not built yet. It exists so the nav
 * is honestly clickable — a tab that 404s teaches the wrong thing about the
 * app during review.
 */
export function Placeholder({ title, body }: { title: string; body: string }) {
  return (
    <div className="soon">
      <EmptyState title={title} body={body} />
    </div>
  )
}
