import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type {
  TApiError,
  TApiSuccessResponse,
  TMutationCallbacks,
} from '@/types/api';
import type { TPatient, TPatientUpdate } from '@/types/patient';

// GET /patients/me
export const useGetMyPatient = () => {
  const queryClient = useQueryClient();

  return useQuery<TApiSuccessResponse<TPatient>>({
    queryKey: ['get-my-patient'],
    retry: false,
    queryFn: async () => {
      const res = await apiClient.get<TApiSuccessResponse<any>>('/patients/me');
      const raw = res.data.data;

      // Ambil email dari cache ['me'], response raw, atau localStorage
      let email = raw.email || raw.users?.email || '';
      if (!email && typeof window !== 'undefined') {
        const cachedMe = queryClient.getQueryData<any>(['me']);
        email = cachedMe?.email || localStorage.getItem('user_email') || '';
      }

      // Jika masih kosong, coba fetch /auth/me secara paralel
      if (!email) {
        try {
          const meRes = await apiClient.get<TApiSuccessResponse<any>>('/auth/me');
          if (meRes.data?.data?.email) {
            email = meRes.data.data.email;
          }
        } catch {}
      }

      const patientData: TPatient = {
        id: raw.id,
        email,
        full_name: raw.full_name || raw.users?.full_name || '',
        phone_number: raw.phone_number || raw.users?.phone_number || '',
        role: (raw.role?.toUpperCase() || 'PATIENT') as 'PATIENT',
        profile_picture: raw.profile_picture || raw.photo_url || raw.avatar_url || null,
        patient_profiles: {
          id: raw.id,
          date_of_birth: raw.patient_profiles?.date_of_birth || raw.date_of_birth || null,
          gender: raw.patient_profiles?.gender || raw.gender || null,
          address: raw.patient_profiles?.address || raw.address || null,
        },
      };

      return {
        success: true,
        message: res.data.message || 'Profil berhasil dimuat',
        data: patientData,
      };
    },
  });
};

// PATCH /patients/me
export const useUpdateMyPatient = ({
  onError,
  onSuccess,
}: TMutationCallbacks<TApiSuccessResponse<TPatient>> = {}) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['update-my-patient'],
    mutationFn: async (body: TPatientUpdate) => {
      // Pastikan tidak mengirim email kosong string "" yang memicu 422 di backend
      const payload: any = { ...body };
      if (!payload.email || typeof payload.email !== 'string' || !payload.email.trim()) {
        delete payload.email;
      }

      const res = await apiClient.patch<TApiSuccessResponse<any>>('/patients/me', payload);
      const raw = res.data.data;

      const patientData: TPatient = {
        id: raw.id,
        email: raw.email || raw.users?.email || '',
        full_name: raw.full_name || raw.users?.full_name || '',
        phone_number: raw.phone_number || raw.users?.phone_number || '',
        role: (raw.role?.toUpperCase() || 'PATIENT') as 'PATIENT',
        profile_picture: raw.profile_picture || raw.photo_url || raw.avatar_url || null,
        patient_profiles: {
          id: raw.id,
          date_of_birth: raw.patient_profiles?.date_of_birth || raw.date_of_birth || null,
          gender: raw.patient_profiles?.gender || raw.gender || null,
          address: raw.patient_profiles?.address || raw.address || null,
        },
      };

      return {
        success: true as const,
        message: res.data.message || 'Profil berhasil diperbarui',
        data: patientData,
      };
    },
    onSuccess: (response) => {
      queryClient.setQueryData(['get-my-patient'], response);
      queryClient.invalidateQueries({ queryKey: ['me'] });
      onSuccess?.(response);
    },
    onError: (error) => onError?.(error as TApiError),
  });
};
