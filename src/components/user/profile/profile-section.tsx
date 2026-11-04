'use client';

import { useState } from 'react';
import { useUpdateMyPatient } from '@/hooks/api/use-patient';
import { getApiErrorMessage, getApiStatus } from '@/lib/api-error';
import { card, inputBase, inputClass, primaryBtn, secondaryBtn } from '@/lib/styles';
import { Field } from '@/components/ui/field';
import {
  formatBirthDate,
  GENDER_LABEL,
  type Profile,
  type ProfileErrors,
  validateProfile,
} from './profile-utils';

const successBox =
  'mt-5 rounded-xl border border-green-300 bg-green-50 px-4 py-3 text-green-900';
const errorBox = 'mt-5 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-red-900';

type Props = { profile: Profile };

// Kartu "Data diri": mode lihat & mode edit, menyimpan ke PATCH /patients/me
export function ProfileSection({ profile }: Props) {
  const [draft, setDraft] = useState<Profile>(profile);
  const [isEditing, setIsEditing] = useState(false);
  const [errors, setErrors] = useState<ProfileErrors>({});
  const [status, setStatus] = useState('');
  const [serverError, setServerError] = useState('');

  const { mutate: updateProfile, isPending: isSaving } = useUpdateMyPatient({
    onSuccess: () => {
      setIsEditing(false);
      setStatus('Data diri berhasil disimpan.');
    },
    onError: (err) => {
      setServerError(
        getApiStatus(err) === 409
          ? 'Email atau nomor WhatsApp sudah dipakai akun lain.'
          : getApiErrorMessage(err, 'Data diri gagal disimpan. Silakan coba lagi.'),
      );
    },
  });

  function setField<K extends keyof Profile>(key: K, value: Profile[K]) {
    setDraft((previousDraft) => ({ ...previousDraft, [key]: value }));
  }

  function startEdit() {
    setDraft(profile);
    setErrors({});
    setStatus('');
    setServerError('');
    setIsEditing(true);
  }

  function cancelEdit() {
    setErrors({});
    setServerError('');
    setIsEditing(false);
  }

  function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setServerError('');
    setStatus('');

    const nextErrors = validateProfile(draft);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    // Kolom opsional yang dikosongkan dikirim sebagai null
    const payload: any = {
      full_name: draft.name.trim(),
      phone_number: draft.phone.replace(/[\s-]/g, ''),
      date_of_birth: draft.birthDate || null,
      gender: draft.gender || null,
      address: draft.address.trim() || null,
    };
    if (draft.email && draft.email.trim() && /^\S+@\S+\.\S+$/.test(draft.email.trim())) {
      payload.email = draft.email.trim();
    }
    updateProfile(payload);
  }

  const describedBy = (field: keyof Profile) => (errors[field] ? `${field}-error` : undefined);

  return (
    <section aria-labelledby="data-diri-title" className={card}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="data-diri-title" className="text-2xl font-bold tracking-tight text-[#1B1B7A]">
            Data diri
          </h2>
          <p className="mt-1 text-neutral-600">
            {isEditing ? 'Ubah data lalu simpan.' : 'Data yang tersimpan di akun Anda.'}
          </p>
        </div>
        {!isEditing && (
          <button type="button" onClick={startEdit} className={secondaryBtn}>
            Edit data
          </button>
        )}
      </div>

      {status && !isEditing && (
        <div role="status" className={successBox}>
          {status}
        </div>
      )}

      {serverError && (
        <div role="alert" className={errorBox}>
          {serverError}
        </div>
      )}

      {!isEditing ? (
        <dl className="mt-6 grid gap-5 sm:grid-cols-2">
          <div>
            <dt className="text-sm font-semibold text-neutral-600">Nama lengkap</dt>
            <dd className="mt-1">{profile.name}</dd>
          </div>
          <div>
            <dt className="text-sm font-semibold text-neutral-600">Email</dt>
            <dd className="mt-1 wrap-break-words">{profile.email}</dd>
          </div>
          <div>
            <dt className="text-sm font-semibold text-neutral-600">Nomor WhatsApp</dt>
            <dd className="mt-1">{profile.phone}</dd>
          </div>
          <div>
            <dt className="text-sm font-semibold text-neutral-600">Tanggal lahir</dt>
            <dd className="mt-1">{formatBirthDate(profile.birthDate)}</dd>
          </div>
          <div>
            <dt className="text-sm font-semibold text-neutral-600">Jenis kelamin</dt>
            <dd className="mt-1">{profile.gender ? GENDER_LABEL[profile.gender] : '-'}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-sm font-semibold text-neutral-600">Alamat</dt>
            <dd className="mt-1">{profile.address || '-'}</dd>
          </div>
        </dl>
      ) : (
        <form onSubmit={handleSave} noValidate className="mt-6">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field id="name" label="Nama lengkap" error={errors.name}>
                <input
                  id="name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  value={draft.name}
                  onChange={(event) => setField('name', event.target.value)}
                  aria-invalid={Boolean(errors.name)}
                  aria-describedby={describedBy('name')}
                  className={inputClass(errors.name)}
                />
              </Field>
            </div>

            <Field id="email" label="Email" error={errors.email}>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={draft.email || profile.email}
                disabled
                title="Email login akun tidak dapat diubah"
                className="mt-2 block w-full rounded-2xl border border-neutral-200 bg-neutral-100 px-4 py-3 text-neutral-500 cursor-not-allowed opacity-80"
              />
              <span className="mt-1 block text-xs text-neutral-500">
                Email terdaftar sebagai identitas login utama
              </span>
            </Field>

            <Field id="phone" label="Nomor WhatsApp" error={errors.phone}>
              <input
                id="phone"
                name="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="081234567890"
                value={draft.phone}
                onChange={(event) => setField('phone', event.target.value)}
                aria-invalid={Boolean(errors.phone)}
                aria-describedby={describedBy('phone')}
                className={inputClass(errors.phone)}
              />
            </Field>

            <Field id="birthDate" label="Tanggal lahir" error={errors.birthDate}>
              <input
                id="birthDate"
                name="birthDate"
                type="date"
                autoComplete="bday"
                value={draft.birthDate}
                onChange={(event) => setField('birthDate', event.target.value)}
                aria-invalid={Boolean(errors.birthDate)}
                aria-describedby={describedBy('birthDate')}
                className={inputClass(errors.birthDate)}
              />
            </Field>

            <Field id="gender" label="Jenis kelamin">
              <select
                id="gender"
                name="gender"
                value={draft.gender}
                onChange={(event) => setField('gender', event.target.value as Profile['gender'])}
                className={`${inputBase} border-neutral-300`}
              >
                <option value="">Pilih jenis kelamin</option>
                {Object.entries(GENDER_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>

            <div className="sm:col-span-2">
              <Field id="address" label="Alamat">
                <textarea
                  id="address"
                  name="address"
                  rows={3}
                  autoComplete="street-address"
                  placeholder="Alamat lengkap"
                  value={draft.address}
                  onChange={(event) => setField('address', event.target.value)}
                  className={`${inputBase} border-neutral-300`}
                />
              </Field>
            </div>
          </div>

          <div className="mt-7 flex flex-wrap gap-3">
            <button type="submit" disabled={isSaving} className={primaryBtn}>
              {isSaving ? 'Memproses...' : 'Simpan perubahan'}
            </button>
            <button type="button" onClick={cancelEdit} disabled={isSaving} className={secondaryBtn}>
              Batal
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
