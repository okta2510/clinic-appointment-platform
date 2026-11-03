// Tipe data autentikasi pengguna

export type TRole = 'ADMIN' | 'STAFF' | 'DOCTOR' | 'PATIENT';

export type TAuthUser = {
  id: string;
  email: string;
  full_name: string;
  phone_number: string;
  role: TRole;
  profile_picture: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type TLogin = {
  email: string;
  password: string;
};

export type TRegister = {
  full_name: string;
  email: string;
  phone_number: string;
  password: string;
};

export type TLoginResponse = {
  token: string;
  user: TAuthUser;
};
