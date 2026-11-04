import {
  type QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
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

function normalizeSchedule(row: any): TDoctorSchedule {
  return {
    id: row.id,
    doctor_id: row.doctor_id,
    day_of_week: Number(row.day_of_week),
    start_time: row.start_time,
    end_time: row.end_time,
    patient_quota: Number(row.patient_quota),
    is_active: Boolean(row.is_active ?? true),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

// GET /schedules?doctor_id=
export const useGetSchedules = (doctorId?: string) => {
  return useQuery<TApiSuccessResponse<TDoctorSchedule[]>>({
    enabled: Boolean(doctorId),
    queryKey: ['get-schedules', doctorId],
    queryFn: async () => {
      const res = await apiClient.get<TApiSuccessResponse<any[]>>('/schedules', {
        params: { doctor_id: doctorId },
      });

      const items = (res.data.data || []).map(normalizeSchedule);

      return {
        success: true,
        message: res.data.message || 'Jadwal dokter berhasil dimuat',
        data: items,
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
      const startTimeFormatted =
        body.start_time.length === 5 ? `${body.start_time}:00` : body.start_time;
      const endTimeFormatted =
        body.end_time.length === 5 ? `${body.end_time}:00` : body.end_time;

      const res = await apiClient.post<TApiSuccessResponse<any>>('/schedules', {
        doctor_id: body.doctor_id,
        day_of_week: Number(body.day_of_week),
        start_time: startTimeFormatted,
        end_time: endTimeFormatted,
        patient_quota: Number(body.patient_quota),
        is_active: body.is_active ?? true,
      });

      return {
        success: true as const,
        message: res.data.message || 'Jadwal berhasil ditambahkan',
        data: normalizeSchedule(res.data.data),
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
      const payload: any = {};
      if (body.day_of_week !== undefined) payload.day_of_week = Number(body.day_of_week);
      if (body.start_time !== undefined) {
        payload.start_time =
          body.start_time.length === 5 ? `${body.start_time}:00` : body.start_time;
      }
      if (body.end_time !== undefined) {
        payload.end_time =
          body.end_time.length === 5 ? `${body.end_time}:00` : body.end_time;
      }
      if (body.patient_quota !== undefined) payload.patient_quota = Number(body.patient_quota);
      if (body.is_active !== undefined) payload.is_active = body.is_active;

      const res = await apiClient.patch<TApiSuccessResponse<any>>(`/schedules/${id}`, payload);

      return {
        success: true as const,
        message: res.data.message || 'Jadwal berhasil diperbarui',
        data: normalizeSchedule(res.data.data),
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
      const res = await apiClient.delete<TApiSuccessResponse<Record<string, never>>>(`/schedules/${id}`);
      return res.data;
    },
    onSuccess: (response) => {
      invalidateSchedules(queryClient);
      onSuccess?.(response);
    },
    onError: (error) => onError?.(error as TApiError),
  });
};
