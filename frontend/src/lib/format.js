import { format, formatDistanceToNow, isPast, isToday, parseISO } from 'date-fns'

export const toIso = (date) => format(date, 'yyyy-MM-dd')
export const shortDate = (iso) => format(parseISO(iso), 'd MMM yyyy')
export const dayAndMonth = (iso) => format(parseISO(iso), 'EEE, d MMM')

export const isOverdue = (iso) => {
  const date = parseISO(iso)
  return isPast(date) && !isToday(date)
}

// The API stores UTC without a zone marker, so add it before showing local time.
export const timeAgo = (iso) => {
  const utc = /[zZ]|[+-]\d\d:\d\d$/.test(iso) ? iso : `${iso}Z`
  return formatDistanceToNow(new Date(utc), { addSuffix: true })
}
