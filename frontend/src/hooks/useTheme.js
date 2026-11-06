import { useEffect, useState } from 'react'

const THEME_KEY = 'hearing-diary-theme'

function savedTheme() {
  try {
    return localStorage.getItem(THEME_KEY)
  } catch {
    return null
  }
}

export function useTheme() {
  const [theme, setTheme] = useState(
    () => savedTheme() || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
  )

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try {
      localStorage.setItem(THEME_KEY, theme)
    } catch {
      // Only a preference; the page still works without it.
    }
  }, [theme])

  return { theme, toggle: () => setTheme(theme === 'dark' ? 'light' : 'dark') }
}
