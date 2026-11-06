import { useEffect, useState } from 'react'
import { api, saveToken, setSignedOutHandler } from './api.js'
import AuthForm from './AuthForm.jsx'
import Diary from './Diary.jsx'

export default function App() {
  const [user, setUser] = useState(null)
  const [checking, setChecking] = useState(api.hasToken())

  useEffect(() => {
    setSignedOutHandler(() => setUser(null))
    if (!api.hasToken()) return
    api.me().then(setUser).catch(() => {}).finally(() => setChecking(false))
  }, [])

  const signIn = ({ access_token, user: signedIn }) => {
    saveToken(access_token)
    setUser(signedIn)
  }

  const signOut = () => {
    saveToken(null)
    setUser(null)
  }

  if (checking) return <main className="page"><p className="muted">Loading...</p></main>
  if (!user) return <AuthForm onSignedIn={signIn} />
  return <Diary user={user} onSignOut={signOut} />
}
