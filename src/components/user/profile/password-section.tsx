'use client';

import { useState } from 'react';
import { useChangePassword } from '@/hooks/api/use-auth';
import { card, primaryBtn, secondaryBtn } from '@/lib/styles';
import { PasswordInput } from '@/components/ui/password-input';
import { Field } from '@/components/ui/field';

type PasswordErrors = {
  current?: string;
  next?: string;
  confirm?: string;
};

// Kartu "Password": form ubah password yang bisa dibuka/ditutup
export function PasswordSection() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<PasswordErrors>({});
  const [status, setStatus] = useState('');
  const [serverError, setServerError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  function validate(): PasswordErrors {
    const newErrors: PasswordErrors = {};
    if (!currentPassword) newErrors.current = 'Password saat ini wajib diisi';
    if (!newPassword) {
      newErrors.next = 'Password baru wajib diisi';
    } else if (newPassword.length < 8) {
      newErrors.next = 'Password minimal 8 karakter';
    } else if (newPassword === currentPassword) {
      newErrors.next = 'Password baru harus berbeda dari password saat ini';
    }
    if (!confirmPassword) {
      newErrors.confirm = 'Konfirmasi password wajib diisi';
    } else if (confirmPassword !== newPassword) {
      newErrors.confirm = 'Password tidak sama';
    }
    return newErrors;
  }

  function resetForm() {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setIsOpen(false);
  }

  const { mutateAsync: changePassword } = useChangePassword();

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setServerError('');
    setStatus('');

    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setIsSaving(true);
    try {
      await changePassword({ currentPassword, newPassword });
      resetForm();
      setStatus('Password berhasil diubah.');
    } catch (err: any) {
      setServerError(err?.message || 'Password gagal diubah. Periksa password saat ini lalu coba lagi.');
    } finally {
      setIsSaving(false);
    }
  }

  function handleCancel() {
    resetForm();
    setErrors({});
    setServerError('');
  }

  return (
    <section aria-labelledby="password-title" className={card}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="password-title" className="text-2xl font-bold tracking-tight text-[#1B1B7A]">
            Password
          </h2>
          <p className="mt-1 text-neutral-600">
            Ganti password secara berkala agar akun tetap aman.
          </p>
        </div>
        {!isOpen && (
          <button
            type="button"
            onClick={() => {
              setStatus('');
              setIsOpen(true);
            }}
            className={secondaryBtn}
          >
            Ubah password
          </button>
        )}
      </div>

      {status && !isOpen && (
        <div
          role="status"
          className="mt-5 rounded-xl border border-green-300 bg-green-50 px-4 py-3 text-green-900"
        >
          {status}
        </div>
      )}

      {isOpen && (
        <form onSubmit={handleSubmit} noValidate className="mt-6">
          {serverError && (
            <div
              role="alert"
              className="mb-5 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-red-900"
            >
              {serverError}
            </div>
          )}

          <div className="grid gap-5">
            <Field id="currentPassword" label="Password saat ini" error={errors.current}>
              <PasswordInput
                id="currentPassword"
                value={currentPassword}
                onChange={setCurrentPassword}
                autoComplete="current-password"
                placeholder="Password saat ini"
                error={errors.current}
              />
            </Field>

            <Field id="newPassword" label="Password baru" error={errors.next}>
              <PasswordInput
                id="newPassword"
                value={newPassword}
                onChange={setNewPassword}
                autoComplete="new-password"
                placeholder="Minimal 8 karakter"
                error={errors.next}
              />
            </Field>

            <Field id="confirmNewPassword" label="Konfirmasi password baru" error={errors.confirm}>
              <PasswordInput
                id="confirmNewPassword"
                value={confirmPassword}
                onChange={setConfirmPassword}
                autoComplete="new-password"
                placeholder="Ulangi password baru"
                error={errors.confirm}
              />
            </Field>
          </div>

          <div className="mt-7 flex flex-wrap gap-3">
            <button type="submit" disabled={isSaving} className={primaryBtn}>
              {isSaving ? 'Memproses...' : 'Simpan password'}
            </button>
            <button type="button" onClick={handleCancel} disabled={isSaving} className={secondaryBtn}>
              Batal
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
