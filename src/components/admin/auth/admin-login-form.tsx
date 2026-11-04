'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { primaryBtn } from '@/components/admin/styles';
import { Field } from '@/components/ui/field';
import { PasswordInput } from '@/components/ui/password-input';
import { useLogin, useLogout, useMe } from '@/hooks/api/use-auth';
import { getApiErrorMessage } from '@/lib/api-error';
import { inputClass } from '@/lib/styles';
import type { TRole } from '@/types/auth';
import {
  type FieldErrors,
  type LoginValues,
  loginSchema,
  validateEmail,
  validateLoginPassword,
} from '@/validations/login/login.schema';
import { toFieldErrors } from '@/validations/shared/fields';

const PANEL_ROLES: TRole[] = ['ADMIN', 'STAFF'];
const STORAGE_KEY_ADMIN = 'arhe_saved_admin_email';

// Form masuk panel admin; akun pasien yang mencoba masuk langsung di-logout lagi
export default function AdminLoginForm() {
  const router = useRouter();
  const { data: me } = useMe();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState<FieldErrors<LoginValues>>({});
  const [serverError, setServerError] = useState('');

  // Sudah login sebagai admin/staff → langsung ke dashboard
  useEffect(() => {
    if (me && PANEL_ROLES.includes(me.role)) router.replace('/admin/dashboard');
  }, [me, router]);

  // Muat email admin tersimpan jika sebelumnya dicentang
  useEffect(() => {
    try {
      const savedEmail = localStorage.getItem(STORAGE_KEY_ADMIN);
      if (savedEmail) {
        setEmail(savedEmail);
        setRememberMe(true);
      }
    } catch {
      // Abaikan jika localStorage dibatasi browser
    }
  }, []);

  const { mutate: logout } = useLogout();

  const { mutate: login, isPending: isSubmitting } = useLogin({
    onSuccess: ({ data }) => {
      // Simpan atau bersihkan email sesuai status checklist
      try {
        if (rememberMe) {
          localStorage.setItem(STORAGE_KEY_ADMIN, email.trim());
        } else {
          localStorage.removeItem(STORAGE_KEY_ADMIN);
        }
      } catch {
        // Abaikan jika localStorage dibatasi browser
      }

      if (PANEL_ROLES.includes(data.user.role)) {
        router.replace('/admin/dashboard');
        return;
      }
      // Login berhasil tapi bukan akun admin: hapus sesinya lagi
      logout();
      setServerError('Akun ini bukan akun admin. Pasien silakan masuk lewat halaman login pasien.');
    },
    onError: (error) =>
      setServerError(
        error.response?.status === 401
          ? 'Email atau password salah. Silakan coba lagi.'
          : getApiErrorMessage(error, 'Gagal masuk. Silakan coba lagi.'),
      ),
  });

  function setFieldError(field: keyof LoginValues, message?: string) {
    setErrors((prev) => ({ ...prev, [field]: message }));
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setServerError('');
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setErrors(toFieldErrors<LoginValues>(parsed.error));
      return;
    }
    setErrors({});
    login(parsed.data);
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="mt-6 rounded-3xl border border-neutral-200 bg-white p-6 md:p-8"
    >
      <h1 className="text-2xl font-bold tracking-tight text-[#1B1B7A]">Masuk sebagai admin</h1>
      <p className="mt-1 text-neutral-600">Khusus admin dan staf klinik.</p>

      {serverError && (
        <div
          role="alert"
          className="mt-5 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-red-900"
        >
          {serverError}
        </div>
      )}

      <div className="mt-6 grid gap-5">
        <Field id="admin-email" label="Email" error={errors.email}>
          <input
            id="admin-email"
            name="email"
            type="email"
            autoComplete="username"
            placeholder="admin@klinik.com"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              if (errors.email) setFieldError('email', validateEmail(event.target.value));
            }}
            onBlur={() => setFieldError('email', validateEmail(email))}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? 'admin-email-error' : undefined}
            className={inputClass(errors.email)}
          />
        </Field>

        <Field id="admin-password" label="Password" error={errors.password}>
          <PasswordInput
            id="admin-password"
            value={password}
            onChange={(value) => {
              setPassword(value);
              if (errors.password) setFieldError('password', validateLoginPassword(value));
            }}
            onBlur={() => setFieldError('password', validateLoginPassword(password))}
            autoComplete="current-password"
            placeholder="Password Anda"
            error={errors.password}
          />
        </Field>

        {/* INPUT CHECKLIST: SIMPAN LOGIN ADMIN */}
        <div className="flex items-center justify-between pt-1">
          <label className="flex items-center gap-2.5 cursor-pointer text-sm font-medium text-neutral-700 select-none">
            <input
              type="checkbox"
              id="admin-remember-me"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 rounded border-neutral-300 text-[#1B1B7A] focus:ring-2 focus:ring-[#1B1B7A]/30 accent-[#1B1B7A]"
            />
            <span>Ingat saya (Simpan akun admin)</span>
          </label>
        </div>
      </div>

      <button type="submit" disabled={isSubmitting} className={`mt-7 w-full ${primaryBtn}`}>
        {isSubmitting ? 'Memproses...' : 'Masuk'}
      </button>

      <p className="mt-6 text-center text-sm text-neutral-600">
        Belum punya akun admin? Minta admin yang sudah ada untuk membuatkannya.
      </p>
    </form>
  );
}
