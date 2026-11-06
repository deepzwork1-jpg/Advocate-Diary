import { useCallback, useEffect, useRef, useState } from 'react'

/** Run an async loader when deps change. Keeps old data on screen during a reload. */
export function useLoad(loader, deps) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const latestRun = useRef(0)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const reload = useCallback(async () => {
    const run = ++latestRun.current
    try {
      const result = await loader()
      // A slower, older request must not overwrite a newer answer.
      if (run === latestRun.current) {
        setData(result)
        setError('')
      }
    } catch (err) {
      if (run === latestRun.current) setError(err.message)
    }
  }, deps)

  useEffect(() => {
    reload()
  }, [reload])

  return { data, error, reload, loading: data === null && !error }
}
