import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/upload(.*)',
  '/files(.*)',
  '/admin(.*)',
  '/api/me(.*)',
  '/api/storage(.*)',
  '/api/files(.*)',
  '/api/admin(.*)'
])

export default clerkMiddleware(async (auth, request) => {
  if (isProtectedRoute(request)) await auth.protect()
})

export const config = {
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/api(.*)']
}
