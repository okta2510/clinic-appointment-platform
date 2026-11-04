import type { TGender, TPatient } from '@/types/patient';

// Bentuk data di form profil (nama field versi frontend)
export type Profile = {
  name: string;
  email: string;
  phone: string;
  birthDate: string; // YYYY-MM-DD
  gender: TGender | '';
  address: string;
};

export type ProfileErrors = Partial<Record<keyof Profile, string>>;

export const GENDER_LABEL: Record<TGender, string> = {
  female: 'Perempuan',
  male: 'Laki-laki',
  other: 'Lainnya',
};

// Ubah response backend ke bentuk form
export function toProfile(patient: TPatient): Profile {
  return {
    name: patient.full_name,
    email: patient.email,
    phone: patient.phone_number,
    birthDate: patient.patient_profiles?.date_of_birth?.slice(0, 10) ?? '',
    gender: patient.patient_profiles?.gender ?? '',
    address: patient.patient_profiles?.address ?? '',
  };
}

/** "1995-08-17" → "17 Agustus 1995"; kosong / tidak valid → "-" */
export function formatBirthDate(value: string) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function validateProfile(profile: Profile): ProfileErrors {
  const newErrors: ProfileErrors = {};
  if (!profile.name.trim()) newErrors.name = 'Nama lengkap wajib diisi';

  if (profile.email && !/^\S+@\S+\.\S+$/.test(profile.email.trim())) {
    newErrors.email = 'Format email tidak valid';
  }

  if (!profile.phone.trim()) {
    newErrors.phone = 'Nomor WhatsApp wajib diisi';
  } else if (!/^(\+62|62|0)8\d{8,11}$/.test(profile.phone.replace(/[\s-]/g, ''))) {
    newErrors.phone = 'Nomor tidak valid. Contoh: 081234567890';
  }

  if (profile.birthDate && new Date(profile.birthDate) > new Date()) {
    newErrors.birthDate = 'Tanggal lahir tidak boleh di masa depan';
  }

  return newErrors;
}
