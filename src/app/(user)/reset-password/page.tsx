'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { PasswordInput } from '@/components/ui/password-input';
import { primaryBtn } from '@/lib/styles';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (newPassword.length < 8) {
      setErrorMsg('Password baru minimal 8 karakter');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('Konfirmasi password tidak cocok');
      return;
    }

    setIsSubmitting(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        throw error;
      }

      setIsSuccess(true);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Gagal mengatur ulang password. Tautan mungkin telah kedaluwarsa.');
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
            Atur Password Baru
          </h1>
          <p className="mt-2 text-sm text-neutral-600">
            Masukkan password baru Anda untuk mengamankan akun.
          </p>
        </div>

        {isSuccess ? (
          <div className="mt-6 text-center">
            <div className="rounded-xl border border-green-300 bg-green-50 p-4 text-sm text-green-900">
              <p className="font-semibold">Password berhasil diperbarui!</p>
              <p className="mt-1">
                Sekarang Anda dapat masuk dengan password baru.
              </p>
            </div>
            <button
              type="button"
              onClick={() => router.push('/login')}
              className={`mt-6 inline-block w-full text-center ${primaryBtn}`}
            >
              Masuk Sekarang
            </button>
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

            <div>
              <label htmlFor="newPassword" className="font-semibold block text-sm mb-1 text-neutral-800">
                Password Baru
              </label>
              <PasswordInput
                id="newPassword"
                value={newPassword}
                onChange={setNewPassword}
                placeholder="Minimal 8 karakter"
                autoComplete="new-password"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="font-semibold block text-sm mb-1 text-neutral-800">
                Ulangi Password Baru
              </label>
              <PasswordInput
                id="confirmPassword"
                value={confirmPassword}
                onChange={setConfirmPassword}
                placeholder="Ulangi password baru"
                autoComplete="new-password"
              />
            </div>

            <button type="submit" disabled={isSubmitting} className={primaryBtn}>
              {isSubmitting ? 'Menyimpan...' : 'Simpan Password Baru'}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
