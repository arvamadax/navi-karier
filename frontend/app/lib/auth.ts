import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import type { UserRole } from './constants';
import { apiFetch, type LoginResponse } from './api';

export const { handlers, signIn, signOut, auth } = NextAuth({
  pages: {
    signIn: '/login',
    newUser: '/register',
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    }),
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const email = credentials?.email as string;
        const password = credentials?.password as string;
        if (!email || !password) return null;

        try {
          const data = await apiFetch<LoginResponse>('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
          });
          return {
            id: String(data.user.id),
            name: data.user.name,
            email: data.user.email,
            role: data.user.role as UserRole,
            accessToken: data.access_token,
          };
        } catch {
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role: UserRole }).role ?? 'JOBSEEKER';
        token.id = user.id;
        token.accessToken = (user as { accessToken?: string }).accessToken;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as UserRole;
        session.user.id = token.id as string;
        session.user.accessToken = token.accessToken as string;
      }
      return session;
    },
    async authorized({ auth: session, request }) {
      const isLoggedIn = !!session?.user;
      const { pathname } = request.nextUrl;
      const isDashboard = pathname.startsWith('/dashboard');
      const isAuth = pathname.startsWith('/login') || pathname.startsWith('/register');

      if (isDashboard && !isLoggedIn) return false;
      if (isAuth && isLoggedIn) {
        return Response.redirect(new URL('/dashboard', request.nextUrl));
      }
      return true;
    },
  },
  session: { strategy: 'jwt' },
});
