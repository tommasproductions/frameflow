import { useEntity } from '@/hooks/useCollection'
import { calendarEventsStore } from '@/lib/store'

/** Compromissos avulsos do calendário. */
export function useCalendarEvents() {
  const { items, ...operations } = useEntity(calendarEventsStore)
  return { events: items, ...operations }
}
