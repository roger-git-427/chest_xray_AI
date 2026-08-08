export function formatEsDateTime(
  value: string,
  style: 'compact' | 'full' = 'full',
): string {
  try {
    return new Intl.DateTimeFormat('es-MX', {
      dateStyle: style === 'compact' ? 'short' : 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  } catch {
    return value;
  }
}
