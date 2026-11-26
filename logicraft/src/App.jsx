import { useSyncExternalStore } from 'react'
import Landing from './landing.jsx'
import Dashboard from './dashboard.jsx'
import { getBackendConnection, reconnectBackend, subscribeToBackendConnection } from './api.js'

function BackendConnectionStatus() {
  const connection = useSyncExternalStore(
    subscribeToBackendConnection,
    getBackendConnection,
    getBackendConnection,
  )
  const needsAttention = connection.state === 'offline'

  return (
    <aside className={`backend-connection backend-connection-${connection.state}`} aria-live="polite">
      <span className="backend-connection-indicator" aria-hidden="true" />
      <span title={connection.message}>
        {connection.state === 'connected' ? 'Django connected' : connection.state === 'saving' ? 'Saving to Django…' : connection.state === 'offline' ? 'Backend unavailable' : 'Connecting to Django…'}
      </span>
      {needsAttention && <button type="button" onClick={() => { void reconnectBackend() }}>Retry</button>}
    </aside>
  )
}

export default function App() {
  return (
    <>
      {window.location.pathname === '/dashboard' ? <Dashboard /> : <Landing />}
      <BackendConnectionStatus />
    </>
  )
}
