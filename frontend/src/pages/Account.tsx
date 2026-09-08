import { useNavigate } from 'react-router-dom'
import { Button, EmptyState } from '../ui'
import { useAuth } from '../app/auth'

/**
 * Rebuilt in phase 2. Sign-out is kept live in the meantime — it is the only
 * way out of a signed-in session, and stubbing it would strand the user.
 */
export function Account() {
  const navigate = useNavigate()
  const { status, signOut } = useAuth()

  return (
    <main id="main" className="page">
      <header className="page__head">
        <h1 className="page__title">Account</h1>
      </header>
      <div className="page__body" style={{ justifyContent: 'center' }}>
        <EmptyState
          title="Being rebuilt"
          body="Settings come back in phase 2."
          action={
            status === 'signedIn' ? (
              <Button
                variant="secondary"
                onClick={async () => {
                  await signOut()
                  navigate('/', { replace: true })
                }}
              >
                Sign out
              </Button>
            ) : undefined
          }
        />
      </div>
    </main>
  )
}
