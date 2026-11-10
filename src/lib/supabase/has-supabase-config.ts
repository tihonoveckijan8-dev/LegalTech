export function hasSupabaseConfig(
  url: string | undefined,
  publishableKey: string | undefined
): boolean {
  return Boolean(url?.trim() && publishableKey?.trim());
}
