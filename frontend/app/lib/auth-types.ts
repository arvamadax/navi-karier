import type { UserRole } from './constants';
import 'next-auth';
import '@auth/core/jwt';

declare module 'next-auth' {
  interface User {
    role?: UserRole;
    accessToken?: string;
  }
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      role: UserRole;
      accessToken?: string;
      image?: string | null;
    };
  }
}

declare module '@auth/core/jwt' {
  interface JWT {
    role?: UserRole;
    id?: string;
    accessToken?: string;
  }
}
