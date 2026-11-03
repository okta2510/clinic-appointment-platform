import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type {
  TApiError,
  TApiSuccessResponse,
  TMutationCallbacks,
} from '@/types/api';
import type {
  TAuthUser,
  TLogin,
  TLoginResponse,
  TRegister,
  TRole,
} from '@/types/auth';

// Helper pembuat objek TAuthUser dari data Supabase Auth & profil
function buildAuthUser(
  user: { id: string; email?: string; created_at: string; updated_at?: string; user_metadata?: Record<string, unknown> },
  profile?: { full_name?: string | null; phone_number?: string | null; role?: string | null; avatar_url?: string | null; created_at?: string; updated_at?: string } | null,
): TAuthUser {
  const rawRole = profile?.role || (user.user_metadata?.role as string) || 'patient';
  const role: TRole = rawRole.toUpperCase() === 'ADMIN' ? 'ADMIN' : 'PATIENT';

  return {
    id: user.id,
    email: user.email ?? '',
    full_name: profile?.full_name || (user.user_metadata?.full_name as string) || '',
    phone_number: profile?.phone_number || (user.user_metadata?.phone_number as string) || '',
    role,
    profile_picture: profile?.avatar_url || null,
    is_active: true,
    created_at: profile?.created_at || user.created_at,
    updated_at: profile?.updated_at || user.updated_at || user.created_at,
  };
}

// POST /auth/login -> Supabase auth.signInWithPassword
export const useLogin = ({
  onError,
  onSuccess,
}: TMutationCallbacks<TApiSuccessResponse<TLoginResponse>> = {}) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['login'],
    mutationFn: async (body: TLogin) => {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: body.email.trim(),
        password: body.password,
      });

      if (error) throw error;
      if (!data.user || !data.session) {
        throw new Error('Gagal mendapatkan sesi login.');
      }

      // Ambil data profil untuk mendapatkan role dan nama
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .maybeSingle();

      const user = buildAuthUser(data.user, profile);

      return {
        success: true as const,
        message: 'Berhasil masuk',
        data: {
          token: data.session.access_token,
          user,
        },
      };
    },
    onSuccess: (response) => {
      queryClient.setQueryData(['me'], response.data.user);
      onSuccess?.(response);
    },
    onError: (error) => onError?.(error as TApiError),
  });
};

// POST /auth/register -> Supabase auth.signUp
export const useRegister = ({
  onError,
  onSuccess,
}: TMutationCallbacks<TApiSuccessResponse<TAuthUser>> = {}) => {
  return useMutation({
    mutationKey: ['register'],
    mutationFn: async (body: TRegister) => {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email: body.email.trim(),
        password: body.password,
        options: {
          data: {
            full_name: body.full_name.trim(),
            phone_number: body.phone_number.trim(),
          },
        },
      });

      if (error) throw error;
      if (!data.user) {
        throw new Error('Gagal membuat akun.');
      }

      const user = buildAuthUser(data.user, {
        full_name: body.full_name,
        phone_number: body.phone_number,
        role: 'patient',
      });

      return {
        success: true as const,
        message: 'Registrasi berhasil',
        data: user,
      };
    },
    onSuccess: (response) => onSuccess?.(response),
    onError: (error) => onError?.(error as TApiError),
  });
};

// POST /auth/admins — pendaftaran admin baru oleh admin yang sedang login
export const useRegisterAdmin = ({
  onError,
  onSuccess,
}: TMutationCallbacks<TApiSuccessResponse<TAuthUser>> = {}) => {
  return useMutation({
    mutationKey: ['register-admin'],
    mutationFn: async (body: TRegister) => {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const key =
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

      // Client terisolasi tanpa session storage agar sesi admin yang aktif tidak terganggu
      const tempClient = createSupabaseClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

      const { data, error } = await tempClient.auth.signUp({
        email: body.email.trim(),
        password: body.password,
        options: {
          data: {
            full_name: body.full_name.trim(),
            phone_number: body.phone_number.trim(),
          },
        },
      });

      if (error) throw error;
      if (!data.user) {
        throw new Error('Gagal mendaftarkan admin baru.');
      }

      // Update role di tabel profiles menjadi 'admin' menggunakan hak admin yang sedang login
      const currentSupabase = createClient();
      const { error: roleError } = await currentSupabase
        .from('profiles')
        .update({ role: 'admin' })
        .eq('id', data.user.id);

      if (roleError) {
        console.error('Gagal menetapkan role admin:', roleError);
      }

      const user = buildAuthUser(data.user, {
        full_name: body.full_name,
        phone_number: body.phone_number,
        role: 'admin',
      });

      return {
        success: true as const,
        message: 'Admin berhasil didaftarkan',
        data: user,
      };
    },
    onSuccess: (response) => onSuccess?.(response),
    onError: (error) => onError?.(error as TApiError),
  });
};

// GET /auth/me — mengembalikan data pengguna yang sedang login (null bila belum login)
export const useMe = () => {
  return useQuery<TAuthUser | null>({
    queryKey: ['me'],
    retry: false,
    queryFn: async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();

        if (error || !user) return null;

        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        return buildAuthUser(user, profile);
      } catch {
        return null;
      }
    },
  });
};

// POST /auth/logout -> Supabase auth.signOut
export const useLogout = ({
  onError,
  onSuccess,
}: TMutationCallbacks<TApiSuccessResponse<Record<string, never>>> = {}) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['logout'],
    mutationFn: async () => {
      const supabase = createClient();
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      return {
        success: true as const,
        message: 'Berhasil keluar',
        data: {},
      };
    },
    onSuccess: (response) => {
      queryClient.setQueryData(['me'], null);
      queryClient.clear();
      onSuccess?.(response);
    },
    onError: (error) => onError?.(error as TApiError),
  });
};

// Ubah password pengguna yang sedang login
export const useChangePassword = ({
  onError,
  onSuccess,
}: TMutationCallbacks<TApiSuccessResponse<Record<string, never>>> = {}) => {
  return useMutation({
    mutationKey: ['change-password'],
    mutationFn: async (newPassword: string) => {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;

      return {
        success: true as const,
        message: 'Password berhasil diubah',
        data: {},
      };
    },
    onSuccess: (response) => onSuccess?.(response),
    onError: (error) => onError?.(error as TApiError),
  });
};
