import { Moon, Sun } from 'lucide-react'

export default function ThemeToggle({ theme }) {
  const dark = theme.theme === 'dark'
  const label = dark ? 'Switch to light mode' : 'Switch to dark mode'
  return (
    <button className="icon-button" onClick={theme.toggle} aria-label={label} title={label}>
      {dark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  )
}
