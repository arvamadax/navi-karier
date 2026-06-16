export { auth as middleware } from './app/lib/auth';

export const config = {
  matcher: ['/dashboard/:path*', '/login', '/register'],
};
