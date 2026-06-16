import type { UserRole } from './constants';
import 'next-auth';

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

declare module 'next-auth/jwt' {
  interface JWT {
    role?: UserRole;
    id?: string;
    accessToken?: string;
  }
}
