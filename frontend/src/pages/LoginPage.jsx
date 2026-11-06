import { useState } from 'react'
import { CalendarCheck, Gavel, ListChecks, Scale } from 'lucide-react'
import { api } from '../api.js'
import ErrorNote from '../components/ErrorNote.jsx'
import ThemeToggle from '../components/ThemeToggle.jsx'
import { useAuth } from '../contexts/AuthContext.jsx'

const HIGHLIGHTS = [
  { icon: CalendarCheck, text: 'Every next date in one calendar' },
  { icon: Gavel, text: 'A full hearing history for each matter' },
  { icon: ListChecks, text: 'Tasks tied to the case they belong to' },
]

export default function LoginPage({ theme }) {
  const { signIn } = useAuth()
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
      signIn(await (registering ? api.register(details) : api.login(credentials)))
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
    <div className="login">
      <section className="login-hero">
        <div className="brand">
          <span className="brand-mark"><Scale size={20} /></span>
          <span>Hearing Diary</span>
        </div>
        <div>
          <h1>Never lose track of a hearing date.</h1>
          <ul>
            {HIGHLIGHTS.map(({ icon: Icon, text }) => (
              <li key={text}><Icon size={18} />{text}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="login-panel">
        <div className="login-theme"><ThemeToggle theme={theme} /></div>
        <div className="login-form">
          <h2>{registering ? 'Create your account' : 'Welcome back'}</h2>
          <p className="muted">{registering ? 'Start your diary in a minute.' : 'Sign in to your diary.'}</p>
          <ErrorNote message={error} />
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
        </div>
      </section>
    </div>
  )
}
