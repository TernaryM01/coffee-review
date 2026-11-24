import { convexAuthNextjsProxy, nextjsProxyRedirect } from '~/lib/convexAuth'
import { safeRedirect } from '~/lib/redirect'

/** Pages that only make sense signed in; visitors are sent to /signin and back. */
const PROTECTED = [
  /^\/settings$/,
  /^\/activity$/,
  /^\/beans\/new$/,
  /^\/beans\/[^/]+\/edit$/,
  /^\/lists\/new$/,
]

// Runs before every page request: refreshes sessions that are about to
// expire (so Server Components see a valid token), then applies redirects.
export default convexAuthNextjsProxy(async (request, { isAuthenticated }) => {
  const { pathname, search, searchParams } = request.nextUrl
  if (pathname === '/signin') {
    if (await isAuthenticated()) {
      return nextjsProxyRedirect(request, safeRedirect(searchParams.get('redirect')))
    }
    return
  }
  if (PROTECTED.some((re) => re.test(pathname)) && !(await isAuthenticated())) {
    return nextjsProxyRedirect(request, `/signin?redirect=${encodeURIComponent(pathname + search)}`)
  }
})

export const config = {
  // Everything except the /auth handlers (they set their own cookies), Next
  // internals, and static files.
  matcher: ['/((?!auth(?:/|$)|_next/static|_next/image|favicon.svg|site.webmanifest).*)'],
}
