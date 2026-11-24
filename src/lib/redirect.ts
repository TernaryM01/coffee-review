/** Only follow same-site, path-only redirect targets (no "//evil.com"). */
export function safeRedirect(target: string | null | undefined): string {
  return target && target.startsWith('/') && !target.startsWith('//') ? target : '/'
}
