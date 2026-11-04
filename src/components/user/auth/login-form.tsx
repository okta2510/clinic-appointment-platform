'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useLogin } from '@/hooks/api/use-auth';
import { getApiErrorMessage } from '@/lib/api-error';
import { inputClass, linkClass } from '@/lib/styles';
import {
  type FieldErrors,
  type LoginValues,
  loginSchema,
  validateEmail,
  validateLoginPassword,
} from '@/validations/login/login.schema';
import { toFieldErrors } from '@/validations/shared/fields';
import { Field } from '@/components/ui/field';
import { PasswordInput } from '@/components/ui/password-input';

const submitBtn =
  'mt-7 w-full rounded-2xl bg-[#1B1B7A] px-6 py-3.5 text-lg font-bold text-white transition-colors hover:bg-[#12125c] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1B1B7A] disabled:cursor-not-allowed disabled:bg-neutral-300 disabled:text-neutral-500';

const STORAGE_KEY_PATIENT = 'arhe_saved_patient_email';

// Hanya path internal agar tidak bisa dipakai untuk open redirect
function safeRedirect(path: string | null) {
  return path?.startsWith('/') && !path.startsWith('//') ? path : '/';
}

// Form masuk pasien. Admin/staf yang login di sini diarahkan ke dashboard admin.
export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const justRegistered = searchParams.get('registered') === '1';
  const redirectTo = safeRedirect(searchParams.get('redirect'));

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState<FieldErrors<LoginValues>>({});
  const [serverError, setServerError] = useState('');

  // Muat email tersimpan jika pengguna mengaktifkan Simpan Login sebelumnya
  useEffect(() => {
    try {
      const savedEmail = localStorage.getItem(STORAGE_KEY_PATIENT);
      if (savedEmail) {
        setEmail(savedEmail);
        setRememberMe(true);
      }
    } catch {
      // Abaikan jika localStorage dibatasi browser
    }
  }, []);

  const { mutate: login, isPending: isSubmitting } = useLogin({
    onSuccess: ({ data }) => {
      // Simpan atau bersihkan email sesuai status checklist
      try {
        if (rememberMe) {
          localStorage.setItem(STORAGE_KEY_PATIENT, email.trim());
        } else {
          localStorage.removeItem(STORAGE_KEY_PATIENT);
        }
      } catch {
        // Abaikan jika localStorage dibatasi browser
      }

      const role = data.user.role;
      router.push(role === 'ADMIN' || role === 'STAFF' ? '/admin/dashboard' : redirectTo);
    },
    onError: (error) =>
      setServerError(getApiErrorMessage(error, 'Email atau password salah. Silakan coba lagi.')),
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
    login(parsed.data); // email sudah di-trim oleh zod
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="w-full max-w-md rounded-3xl border border-neutral-200 bg-white p-6 md:p-8"
    >
      <h2 className="text-2xl font-bold tracking-tight text-[#1B1B7A]">Masuk</h2>
      <p className="mt-1 text-neutral-600">Gunakan akun yang sudah terdaftar.</p>

      {justRegistered && !serverError && (
        <div
          role="status"
          className="mt-5 rounded-xl border border-green-300 bg-green-50 px-4 py-3 text-green-900"
        >
          Pendaftaran berhasil. Silakan masuk dengan akun Anda.
        </div>
      )}

      {serverError && (
        <div
          role="alert"
          className="mt-5 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-red-900"
        >
          {serverError}
        </div>
      )}

      <div className="mt-6 grid gap-5">
        <Field id="email" label="Email" error={errors.email}>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="nama@email.com"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              if (errors.email) setFieldError('email', validateEmail(event.target.value));
            }}
            onBlur={() => setFieldError('email', validateEmail(email))}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? 'email-error' : undefined}
            className={inputClass(errors.email)}
          />
        </Field>

        <div>
          <div className="flex items-center justify-between gap-3">
            <label htmlFor="password" className="font-semibold">
              Password
            </label>
            <Link href="/lupa-password" className={`text-sm ${linkClass}`}>
              Lupa password?
            </Link>
          </div>
          <div className="mt-2">
            <PasswordInput
              id="password"
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
          </div>
          {errors.password && (
            <p id="password-error" role="alert" className="mt-1.5 text-sm font-medium text-red-700">
              {errors.password}
            </p>
          )}
        </div>

        {/* INPUT CHECKLIST: SIMPAN LOGIN / REMEMBER ME */}
        <div className="flex items-center justify-between pt-1">
          <label className="flex items-center gap-2.5 cursor-pointer text-sm font-medium text-neutral-700 select-none">
            <input
              type="checkbox"
              id="remember-me"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 rounded border-neutral-300 text-[#1B1B7A] focus:ring-2 focus:ring-[#1B1B7A]/30 accent-[#1B1B7A]"
            />
            <span>Ingat saya (Simpan login)</span>
          </label>
        </div>
      </div>

      <button type="submit" disabled={isSubmitting} className={submitBtn}>
        {isSubmitting ? 'Memproses...' : 'Masuk'}
      </button>

      <p className="mt-6 text-center text-neutral-600">
        Belum punya akun?{' '}
        <Link href="/register" className={linkClass}>
          Daftar
        </Link>
      </p>
    </form>
  );
}
