import {
  type QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type {
  TApiError,
  TApiSuccessResponse,
  TMutationCallbacks,
} from '@/types/api';
import type {
  TDoctorSchedule,
  TScheduleCreate,
  TScheduleUpdate,
} from '@/types/schedule';

function invalidateSchedules(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: ['get-schedules'] });
  queryClient.invalidateQueries({ queryKey: ['get-doctors'] });
  queryClient.invalidateQueries({ queryKey: ['get-detail-doctor'] });
  queryClient.invalidateQueries({ queryKey: ['get-availability'] });
}

// GET /schedules?doctor_id=
export const useGetSchedules = (doctorId?: string) => {
  return useQuery<TApiSuccessResponse<TDoctorSchedule[]>>({
    enabled: Boolean(doctorId),
    queryKey: ['get-schedules', doctorId],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('doctor_schedules')
        .select('*')
        .eq('doctor_id', doctorId)
        .order('day_of_week', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) throw new Error(error.message);

      const schedules: TDoctorSchedule[] = (data || []).map((row: any) => ({
        id: row.id,
        doctor_id: row.doctor_id,
        day_of_week: Number(row.day_of_week),
        start_time: row.start_time,
        end_time: row.end_time,
        patient_quota: Number(row.patient_quota),
        is_active: Boolean(row.is_active),
        created_at: row.created_at,
        updated_at: row.updated_at,
      }));

      return {
        success: true as const,
        message: 'Jadwal dokter berhasil dimuat',
        data: schedules,
      };
    },
  });
};

// POST /schedules
export const useCreateSchedule = ({
  onError,
  onSuccess,
}: TMutationCallbacks<TApiSuccessResponse<TDoctorSchedule>> = {}) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['create-schedule'],
    mutationFn: async (body: TScheduleCreate) => {
      const supabase = createClient();
      const startTimeFormatted =
        body.start_time.length === 5 ? `${body.start_time}:00` : body.start_time;
      const endTimeFormatted =
        body.end_time.length === 5 ? `${body.end_time}:00` : body.end_time;

      const { data, error } = await supabase
        .from('doctor_schedules')
        .insert({
          doctor_id: body.doctor_id,
          day_of_week: body.day_of_week,
          start_time: startTimeFormatted,
          end_time: endTimeFormatted,
          patient_quota: body.patient_quota,
          is_active: body.is_active ?? true,
        })
        .select()
        .single();

      if (error) throw new Error(error.message);

      const schedule: TDoctorSchedule = {
        id: data.id,
        doctor_id: data.doctor_id,
        day_of_week: Number(data.day_of_week),
        start_time: data.start_time,
        end_time: data.end_time,
        patient_quota: Number(data.patient_quota),
        is_active: Boolean(data.is_active),
        created_at: data.created_at,
        updated_at: data.updated_at,
      };

      return {
        success: true as const,
        message: 'Jadwal berhasil ditambahkan',
        data: schedule,
      };
    },
    onSuccess: (response) => {
      invalidateSchedules(queryClient);
      onSuccess?.(response);
    },
    onError: (error) => onError?.(error as TApiError),
  });
};

// PATCH /schedules/:id
export const useUpdateSchedule = ({
  onError,
  onSuccess,
}: TMutationCallbacks<TApiSuccessResponse<TDoctorSchedule>> = {}) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['update-schedule'],
    mutationFn: async ({ id, body }: { id: string; body: TScheduleUpdate }) => {
      const supabase = createClient();
      const updates: any = {};
      if (body.day_of_week !== undefined) updates.day_of_week = body.day_of_week;
      if (body.start_time !== undefined) {
        updates.start_time =
          body.start_time.length === 5 ? `${body.start_time}:00` : body.start_time;
      }
      if (body.end_time !== undefined) {
        updates.end_time =
          body.end_time.length === 5 ? `${body.end_time}:00` : body.end_time;
      }
      if (body.patient_quota !== undefined) updates.patient_quota = body.patient_quota;
      if (body.is_active !== undefined) updates.is_active = body.is_active;

      const { data, error } = await supabase
        .from('doctor_schedules')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw new Error(error.message);

      const schedule: TDoctorSchedule = {
        id: data.id,
        doctor_id: data.doctor_id,
        day_of_week: Number(data.day_of_week),
        start_time: data.start_time,
        end_time: data.end_time,
        patient_quota: Number(data.patient_quota),
        is_active: Boolean(data.is_active),
        created_at: data.created_at,
        updated_at: data.updated_at,
      };

      return {
        success: true as const,
        message: 'Jadwal berhasil diperbarui',
        data: schedule,
      };
    },
    onSuccess: (response) => {
      invalidateSchedules(queryClient);
      onSuccess?.(response);
    },
    onError: (error) => onError?.(error as TApiError),
  });
};

// DELETE /schedules/:id
export const useDeleteSchedule = ({
  onError,
  onSuccess,
}: TMutationCallbacks<TApiSuccessResponse<Record<string, never>>> = {}) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['delete-schedule'],
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase.from('doctor_schedules').delete().eq('id', id);
      if (error) throw new Error(error.message);

      return {
        success: true as const,
        message: 'Jadwal berhasil dihapus',
        data: {},
      };
    },
    onSuccess: (response) => {
      invalidateSchedules(queryClient);
      onSuccess?.(response);
    },
    onError: (error) => onError?.(error as TApiError),
  });
};
