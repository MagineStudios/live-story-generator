/**
 * Format dates using native Intl.RelativeTimeFormat
 * No external dependencies needed!
 */

const DIVISIONS = [
  { amount: 60, name: 'seconds' },
  { amount: 60, name: 'minutes' },
  { amount: 24, name: 'hours' },
  { amount: 7, name: 'days' },
  { amount: 4.34524, name: 'weeks' },
  { amount: 12, name: 'months' },
  { amount: Number.POSITIVE_INFINITY, name: 'years' }
] as const;

export function formatRelativeTime(date: Date | string): string {
  const formatter = new Intl.RelativeTimeFormat('en', {
    numeric: 'auto',
  });

  let duration = (new Date(date).getTime() - new Date().getTime()) / 1000;

  for (let i = 0; i < DIVISIONS.length; i++) {
    const division = DIVISIONS[i];
    if (Math.abs(duration) < division.amount) {
      return formatter.format(Math.round(duration), division.name as Intl.RelativeTimeFormatUnit);
    }
    duration /= division.amount;
  }
  
  return formatter.format(Math.round(duration), 'years');
}

// For "X ago" format specifically
export function formatTimeAgo(date: Date | string): string {
  const relativeTime = formatRelativeTime(date);
  // Intl.RelativeTimeFormat returns "yesterday", "2 days ago", etc.
  // which is already in the format we want
  return relativeTime;
}

// For absolute dates when needed
export function formatDate(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat('en', options ?? {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(date));
}

// Format for display like "Jan 1, 2024"
export function formatShortDate(date: Date | string): string {
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(date));
}