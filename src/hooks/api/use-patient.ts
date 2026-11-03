import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type {
  TApiError,
  TApiSuccessResponse,
  TMutationCallbacks,
} from '@/types/api';
import type { TPatient, TPatientUpdate } from '@/types/patient';

// GET /patients/me -> Supabase auth + profiles
export const useGetMyPatient = () => {
  return useQuery<TApiSuccessResponse<TPatient>>({
    queryKey: ['get-my-patient'],
    retry: false,
    queryFn: async () => {
      const supabase = createClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        const err = new Error('Sesi Anda telah berakhir, silakan masuk kembali');
        (err as any).status = 401;
        throw err;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) {
        throw new Error(profileError.message);
      }

      if (profile?.role === 'admin') {
        const err = new Error('Akun Anda bukan akun pasien, jadi profil pasien tidak tersedia.');
        (err as any).status = 403;
        throw err;
      }

      const patientData: TPatient = {
        id: user.id,
        email: user.email || '',
        full_name: profile?.full_name || user.user_metadata?.full_name || '',
        phone_number: profile?.phone_number || '',
        role: (profile?.role?.toUpperCase() || 'PATIENT') as 'PATIENT',
        profile_picture: profile?.avatar_url || null,
        patient_profiles: {
          id: user.id,
          date_of_birth: profile?.date_of_birth || null,
          gender: profile?.gender || null,
          address: profile?.address || null,
        },
      };

      return {
        success: true as const,
        message: 'Profil berhasil dimuat',
        data: patientData,
      };
    },
  });
};

// PATCH /patients/me -> Supabase profiles update
export const useUpdateMyPatient = ({
  onError,
  onSuccess,
}: TMutationCallbacks<TApiSuccessResponse<TPatient>> = {}) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['update-my-patient'],
    mutationFn: async (body: TPatientUpdate) => {
      const supabase = createClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error('Sesi Anda telah berakhir, silakan masuk kembali');
      }

      const updates: Record<string, unknown> = {};
      if (body.full_name !== undefined) updates.full_name = body.full_name;
      if (body.phone_number !== undefined) updates.phone_number = body.phone_number;
      if (body.date_of_birth !== undefined) updates.date_of_birth = body.date_of_birth;
      if (body.gender !== undefined) updates.gender = body.gender;
      if (body.address !== undefined) updates.address = body.address;

      if (Object.keys(updates).length > 0) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update(updates)
          .eq('id', user.id);

        if (updateError) {
          throw new Error(updateError.message);
        }
      }

      if (body.email && body.email !== user.email) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: body.email,
        });
        if (emailError) {
          throw new Error(emailError.message);
        }
      }

      const { data: updatedProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      const patientData: TPatient = {
        id: user.id,
        email: body.email || user.email || '',
        full_name: updatedProfile?.full_name || body.full_name || '',
        phone_number: updatedProfile?.phone_number || body.phone_number || '',
        role: (updatedProfile?.role?.toUpperCase() || 'PATIENT') as 'PATIENT',
        profile_picture: updatedProfile?.avatar_url || null,
        patient_profiles: {
          id: user.id,
          date_of_birth: updatedProfile?.date_of_birth || null,
          gender: updatedProfile?.gender || null,
          address: updatedProfile?.address || null,
        },
      };

      return {
        success: true as const,
        message: 'Profil berhasil diperbarui',
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
