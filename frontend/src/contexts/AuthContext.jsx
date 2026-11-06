import { createContext, useContext, useEffect, useState } from 'react'
import { api, saveToken, setSignedOutHandler } from '../api.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
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

  return (
    <AuthContext.Provider value={{ user, checking, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
