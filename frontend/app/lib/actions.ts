'use server';

import { signIn, signOut } from './auth';
import { AuthError } from 'next-auth';
import { apiFetch } from './api';

export async function loginAction(formData: FormData) {
  try {
    await signIn('credentials', {
      email: formData.get('email') as string,
      password: formData.get('password') as string,
      redirectTo: '/dashboard',
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: 'Email atau password salah' };
    }
    throw error;
  }
}

export async function logoutAction() {
  await signOut({ redirectTo: '/login' });
}

export async function registerAction(formData: FormData) {
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const role = formData.get('role') as string;

  if (!name || !email || !password || !role) {
    return { error: 'Semua field harus diisi' };
  }

  try {
    await apiFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, role }),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Registrasi gagal';
    return { error: message };
  }

  try {
    await signIn('credentials', {
      email,
      password,
      redirectTo: '/dashboard',
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: 'Registrasi berhasil tapi login gagal. Silakan login manual.' };
    }
    throw error;
  }
}
