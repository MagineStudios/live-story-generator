import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isProtected = createRouteMatcher([
    '/dashboard(.*)',
    '/api/(upload|generate|stripe|my-world|stories|story|styles|theme-suggestions|videos)(.*)',
    '/api/images/(edit|background-removal|replace-background)(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
    const session = await auth();
    if (isProtected(req) && !session.userId) {
        return session.redirectToSignIn();
    }
});

export const config = {
  matcher: [
    // Match all routes except _next static assets and favicon
    '/((?!_next/static|_next/image|favicon.ico).*)',
    // Also ensure all API routes run the middleware
    '/api/:path*',
  ],
};