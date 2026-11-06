import { useState } from 'react'
import { api } from './api.js'

export default function AuthForm({ onSignedIn }) {
  const [mode, setMode] = useState('login')
  const [details, setDetails] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const registering = mode === 'register'

  const submit = async (event) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const { name, ...credentials } = details
      onSignedIn(await (registering ? api.register(details) : api.login(credentials)))
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  const field = (name) => ({
    value: details[name],
    onChange: (event) => setDetails({ ...details, [name]: event.target.value }),
  })

  return (
    <main className="auth">
      <section className="card">
        <h1>Hearing Diary</h1>
        <p className="muted">{registering ? 'Create your diary.' : 'Sign in to your diary.'}</p>
        {error && <p className="error" role="alert">{error}</p>}
        <form onSubmit={submit}>
          {registering && (
            <label>Name<input required autoComplete="name" {...field('name')} /></label>
          )}
          <label>Email<input required type="email" autoComplete="email" {...field('email')} /></label>
          <label>
            Password
            <input
              required
              type="password"
              autoComplete={registering ? 'new-password' : 'current-password'}
              {...field('password')}
            />
          </label>
          <button type="submit" disabled={busy}>{registering ? 'Create account' : 'Sign in'}</button>
        </form>
        <button
          className="link"
          onClick={() => { setMode(registering ? 'login' : 'register'); setError('') }}
        >
          {registering ? 'Already have an account? Sign in' : 'New here? Create an account'}
        </button>
      </section>
    </main>
  )
}
