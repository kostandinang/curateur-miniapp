// Time utility functions for converting UTC to local time

/**
 * Convert UTC hour to local hour
 */
export function utcToLocalHour(utcHour: number): number {
  const date = new Date()
  date.setUTCHours(utcHour, 0, 0, 0)
  return date.getHours()
}

/**
 * Format hour and minute in 12-hour format with AM/PM
 */
export function formatLocalTime(hour: number, minute: number = 0): string {
  const date = new Date()
  date.setHours(hour, minute, 0, 0)
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })
}

/**
 * Format UTC time to local time string
 */
export function formatUtcToLocal(utcHour: number, utcMinute: number = 0): string {
  const date = new Date()
  date.setUTCHours(utcHour, utcMinute, 0, 0)
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })
}

/**
 * Get timezone abbreviation
 */
export function getTimezoneAbbr(): string {
  return new Date().toLocaleTimeString([], { timeZoneName: 'short' }).split(' ').pop() || 'Local'
}

/**
 * Format cron schedule times to local time
 * Input: "0 22 * * *" (UTC)
 * Output: "10:00 PM" (local)
 */
export function formatCronToLocal(cronSchedule: string): string {
  const parts = cronSchedule.split(' ')
  const minute = parseInt(parts[0]) || 0
  const hour = parseInt(parts[1]) || 0
  return formatUtcToLocal(hour, minute)
}
