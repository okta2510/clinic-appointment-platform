'use client';

import Link from 'next/link';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Field } from '@/components/ui/field';
import { inputClass, linkClass, primaryBtn } from '@/lib/styles';

export default function LupaPasswordPage() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!email || !email.includes('@')) {
      setErrorMsg('Masukkan alamat email yang valid');
      return;
    }

    setIsSubmitting(true);
    try {
      const supabase = createClient();
      const redirectUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/reset-password`
        : undefined;

      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: redirectUrl,
      });

      if (error) {
        throw error;
      }

      setIsSent(true);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Gagal mengirim email reset password. Coba beberapa saat lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-neutral-100 flex items-center justify-center p-5">
      <div className="w-full max-w-md rounded-3xl border border-neutral-200 bg-white p-6 md:p-8 shadow-sm">
        <div className="text-center">
          <Link
            href="/"
            aria-label="Ke beranda"
            className="inline-block rounded-md bg-[#FAF8F3] px-3 py-1.5 focus-visible:outline-2 focus-visible:outline-[#1B1B7A]"
          >
            <img src="/IH-logo-icon.png" alt="Logo klinik" className="h-9 w-auto mx-auto" />
          </Link>
          <h1 className="mt-6 text-2xl font-bold tracking-tight text-[#1B1B7A]">
            Lupa Password
          </h1>
          <p className="mt-2 text-sm text-neutral-600">
            Masukkan email Anda. Kami akan mengirimkan tautan untuk mengatur ulang password akun Anda.
          </p>
        </div>

        {isSent ? (
          <div className="mt-6 text-center">
            <div className="rounded-xl border border-green-300 bg-green-50 p-4 text-sm text-green-900">
              <p className="font-semibold">Tautan reset password terkirim!</p>
              <p className="mt-1">
                Silakan periksa kotak masuk atau spam email <strong>{email}</strong> Anda.
              </p>
            </div>
            <Link
              href="/login"
              className={`mt-6 inline-block w-full text-center ${primaryBtn}`}
            >
              Kembali ke Halaman Masuk
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 grid gap-5">
            {errorMsg && (
              <div
                role="alert"
                className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-900"
              >
                {errorMsg}
              </div>
            )}

            <Field id="email" label="Email Terdaftar">
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="nama@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={inputClass(errorMsg || undefined)}
              />
            </Field>

            <button type="submit" disabled={isSubmitting} className={primaryBtn}>
              {isSubmitting ? 'Mengirim...' : 'Kirim Tautan Reset Password'}
            </button>

            <p className="text-center text-sm text-neutral-600">
              Ingat password Anda?{' '}
              <Link href="/login" className={linkClass}>
                Masuk
              </Link>
            </p>
          </form>
        )}
      </div>
    </main>
  );
}
