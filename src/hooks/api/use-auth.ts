import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
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
} from '@/types/auth';

// POST /auth/login -> REST API Express Backend
export const useLogin = ({
  onError,
  onSuccess,
}: TMutationCallbacks<TApiSuccessResponse<TLoginResponse>> = {}) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['login'],
    mutationFn: async (body: TLogin): Promise<TApiSuccessResponse<TLoginResponse>> => {
      const res = await apiClient.post<TApiSuccessResponse<TLoginResponse>>('/auth/login', {
        email: body.email.trim(),
        password: body.password,
      });

      const { token, user } = res.data.data;
      if (typeof window !== 'undefined' && token) {
        localStorage.setItem('token', token);
        // Set cookie document juga untuk kompatibilitas SSR
        document.cookie = `token=${encodeURIComponent(token)}; path=/; max-age=604800; SameSite=Lax`;
      }

      return res.data;
    },
    onSuccess: (response) => {
      queryClient.setQueryData(['me'], response.data.user);
      onSuccess?.(response);
    },
    onError: (error) => onError?.(error as TApiError),
  });
};

// POST /auth/register -> REST API Express Backend
export const useRegister = ({
  onError,
  onSuccess,
}: TMutationCallbacks<TApiSuccessResponse<TAuthUser>> = {}) => {
  return useMutation({
    mutationKey: ['register'],
    mutationFn: async (body: TRegister): Promise<TApiSuccessResponse<TAuthUser>> => {
      const res = await apiClient.post<TApiSuccessResponse<TAuthUser>>('/auth/register', {
        email: body.email.trim(),
        password: body.password,
        full_name: body.full_name.trim(),
        phone_number: body.phone_number.trim(),
      });
      return res.data;
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
    mutationFn: async (body: TRegister): Promise<TApiSuccessResponse<TAuthUser>> => {
      const res = await apiClient.post<TApiSuccessResponse<TAuthUser>>('/auth/admins', {
        email: body.email.trim(),
        password: body.password,
        full_name: body.full_name.trim(),
        phone_number: body.phone_number.trim(),
      });
      return res.data;
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
    staleTime: 1000 * 60 * 5, // 5 menit
    queryFn: async () => {
      try {
        const res = await apiClient.get<TApiSuccessResponse<TAuthUser>>('/auth/me');
        if (res.data?.success && res.data.data) {
          return res.data.data;
        }
        return null;
      } catch (err: any) {
        // Fallback coba baca via Supabase client jika backend offline/belum nyala
        try {
          const supabase = createClient();
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return null;
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();
          if (profile) {
            return {
              id: user.id,
              email: user.email ?? '',
              full_name: profile.full_name || '',
              phone_number: profile.phone_number || '',
              role: (profile.role || 'patient').toUpperCase() === 'ADMIN' ? 'ADMIN' : 'PATIENT',
              profile_picture: profile.avatar_url || null,
              is_active: true,
              created_at: profile.created_at || user.created_at,
              updated_at: profile.updated_at || user.created_at,
            };
          }
        } catch {}
        return null;
      }
    },
  });
};

// POST /auth/logout -> REST API Express Backend
export const useLogout = ({
  onError,
  onSuccess,
}: TMutationCallbacks<TApiSuccessResponse<Record<string, never>>> = {}) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['logout'],
    mutationFn: async (): Promise<TApiSuccessResponse<Record<string, never>>> => {
      try {
        await apiClient.post('/auth/logout');
      } catch {}

      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      }

      // Pastikan supabase auth juga sign out jika ada sisa session
      try {
        const supabase = createClient();
        await supabase.auth.signOut();
      } catch {}

      return {
        success: true,
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
    mutationFn: async (payload: string | { newPassword: string; currentPassword?: string }) => {
      const newPassword = typeof payload === 'string' ? payload : payload.newPassword;
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
