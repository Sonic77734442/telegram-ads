/** Use a first-party delivery URL so browser content filters do not hide /ads/ media. */
export function mediaDisplayUrl(value?: string): string | undefined {
  if (!value) return value;
  const prefix = 'https://eoybnbhpqsqxeygsikkz.supabase.co/storage/v1/object/public/media/ads/';
  if (!value.startsWith(prefix)) return value;
  return '/creative-media/' + value.slice(prefix.length);
}
