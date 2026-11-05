import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { compressImageToBase64 } from '@/lib/image-compression';
import type {
  TApiError,
  TApiSuccessResponse,
  TMutationCallbacks,
  TPaginateResponse,
} from '@/types/api';
import type {
  TAppointment,
  TAppointmentCreate,
  TAvailability,
  TRatingCreate,
  TSlot,
  TTransactionStatus,
} from '@/types/appointment';

function normalizePatientAppointment(row: any, publicUrlBase: string): TAppointment {
  const doctor = row.doctor || row.doctors || row.Doctor || {};
  const session = row.practice_session || row.practice_sessions || row.PracticeSession || {};
  const fee = Number(row.consultation_fee) || 0;
  const deadline = row.payment_deadline ? new Date(row.payment_deadline).getTime() : 0;
  const now = Date.now();
  const remainingSeconds = Math.max(0, Math.floor((deadline - now) / 1000));

  let proofUrl = '';
  const proofPath = row.payment_proof_path || row.payment_proofs?.[0]?.image_url;
  if (proofPath) {
    if (proofPath.startsWith('data:image') || proofPath.startsWith('http')) {
      proofUrl = proofPath;
    } else {
      proofUrl = `${publicUrlBase}/storage/v1/object/public/payment-proofs/${proofPath}`;
    }
  }

  const rating = Array.isArray(row.ratings) ? row.ratings[0] : row.ratings || null;

  return {
    id: row.id,
    appointment_code: row.appointment_code || row.code || `APT-${row.id.slice(0, 8)}`,
    consultation_fee: String(fee),
    treatment_fee: '0',
    discount_amount: '0',
    total_amount: String(fee),
    status: row.status as TTransactionStatus,
    payment_deadline: row.payment_deadline,
    checked_in_at: row.checked_in_at || null,
    queue_number: row.queue_number ?? null,
    qr_token: row.status === 'done' ? row.qr_token || null : null,
    remaining_seconds: remainingSeconds,
    can_cancel: ['waiting_payment', 'waiting_confirmation'].includes(row.status),
    can_rate: row.status === 'done' && Boolean(row.checked_in_at) && !rating,
    ratings: rating
      ? {
          id: rating.id || row.id,
          rating: rating.rating,
          review: rating.review || null,
          created_at: rating.created_at || row.created_at,
        }
      : null,
    created_at: row.created_at,
    doctors: {
      id: doctor.id || row.doctor_id || '',
      full_name: doctor.full_name || doctor.name || row.doctor_name || 'Dokter',
      photo: doctor.photo_url || doctor.photo || null,
    },
    treatments: {
      id: 'general',
      slug: row.treatment_slug || 'acne-dermapeel',
      name: 'Konsultasi Dokter & Treatment',
    },
    practice_sessions: {
      id: session.id || row.session_id || '',
      session_date: session.session_date || row.session_date || new Date().toISOString(),
      start_time: session.start_time || row.start_time || '08:00',
      end_time: session.end_time || row.end_time || '12:00',
    },
    payment_proofs: proofUrl
      ? [
          {
            id: row.id,
            image_url: proofUrl,
            uploaded_at: row.payment_uploaded_at || row.created_at,
            verification_status:
              row.status === 'done'
                ? 'approved'
                : row.status === 'rejected'
                ? 'rejected'
                : 'pending',
            rejection_reason: row.rejection_reason || null,
          },
        ]
      : [],
  };
}

// GET /appointments/availability?doctor_id=...&date=...
export const useGetAvailability = (doctorId?: string, date?: string) => {
  return useQuery<TApiSuccessResponse<TAvailability>>({
    enabled: Boolean(doctorId) && Boolean(date),
    queryKey: ['get-availability', doctorId, date],
    staleTime: 0,
    queryFn: async () => {
      const res = await apiClient.get<TApiSuccessResponse<any>>('/appointments/availability', {
        params: { doctor_id: doctorId, date },
      });

      const raw = res.data.data;
      const rawSlots = Array.isArray(raw) ? raw : raw?.slots || [];

      const slots: TSlot[] = rawSlots.map((slot: any) => ({
        schedule_id: slot.schedule_id || slot.id,
        start_time: (slot.start_time || '').slice(0, 5),
        end_time: (slot.end_time || '').slice(0, 5),
        quota: Number(slot.quota || slot.patient_quota) || 0,
        booked: Number(slot.booked) || 0,
        remaining: Number(slot.remaining) || 0,
        available: Boolean(slot.is_available ?? slot.available),
      }));

      return {
        success: true,
        message: res.data.message || 'Ketersediaan jadwal berhasil dimuat',
        data: {
          doctor_id: doctorId || '',
          date: date || '',
          slots,
        },
      };
    },
  });
};

// GET /appointments/me — riwayat reservasi pasien yang login
export const useGetMyAppointments = ({ page = 1, limit = 10 } = {}, enabled = true) => {
  return useQuery<TPaginateResponse<TAppointment>>({
    enabled,
    queryKey: ['get-my-appointments', page, limit],
    placeholderData: keepPreviousData,
    staleTime: 0,
    queryFn: async () => {
      const res = await apiClient.get<TPaginateResponse<any>>('/appointments/me', {
        params: { page, limit },
      });

      const publicUrlBase = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
      const rawItems = res.data.data || [];
      const items = rawItems.map((row: any) => normalizePatientAppointment(row, publicUrlBase));

      return {
        success: true,
        message: res.data.message || 'Riwayat reservasi berhasil dimuat',
        data: items,
        meta: res.data.meta || {
          page,
          limit,
          total: items.length,
          total_pages: Math.ceil(items.length / limit) || 1,
        },
      };
    },
  });
};

// GET /appointments/:id
export const useGetAppointment = (id?: string) => {
  return useQuery<TApiSuccessResponse<TAppointment>>({
    enabled: Boolean(id),
    queryKey: ['get-appointment', id],
    staleTime: 0,
    retry: false,
    queryFn: async () => {
      const res = await apiClient.get<TApiSuccessResponse<any>>(`/appointments/${id}`);
      const publicUrlBase = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
      const mapped = normalizePatientAppointment(res.data.data, publicUrlBase);

      return {
        success: true,
        message: res.data.message || 'Janji temu berhasil dimuat',
        data: mapped,
      };
    },
  });
};

// POST /appointments — buat janji temu
export const useCreateAppointment = ({
  onError,
  onSuccess,
}: TMutationCallbacks<TApiSuccessResponse<TAppointment>> = {}) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['create-appointment'],
    mutationFn: async (body: TAppointmentCreate) => {
      const startTimeFormatted = (body.start_time || '').slice(0, 5);

      const res = await apiClient.post<TApiSuccessResponse<any>>('/appointments', {
        doctor_id: body.doctor_id,
        session_date: body.session_date,
        start_time: startTimeFormatted,
        treatment_slug: body.treatment_slug || 'acne-dermapeel',
      });

      const publicUrlBase = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
      const mapped = normalizePatientAppointment(res.data.data, publicUrlBase);

      return {
        success: true as const,
        message: res.data.message || 'Reservasi berhasil dibuat',
        data: mapped,
      };
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['get-availability'] });
      queryClient.invalidateQueries({ queryKey: ['get-my-appointments'] });
      queryClient.setQueryData(['get-appointment', response.data.id], response);
      onSuccess?.(response);
    },
    onError: (error) => onError?.(error as TApiError),
  });
};

// POST /appointments/:id/payment-proof
export const useUploadPaymentProof = ({
  onError,
  onSuccess,
}: TMutationCallbacks<TApiSuccessResponse<TAppointment>> = {}) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['upload-payment-proof'],
    mutationFn: async (payloadInput: { id: string; file: File }): Promise<TApiSuccessResponse<TAppointment>> => {
      const { id, file } = payloadInput;
      let base64String = '';
      try {
        base64String = await compressImageToBase64(file, 1024, 1024, 0.75);
      } catch {}

      let res;
      if (base64String) {
        // Kirim via JSON payload Base64
        res = await apiClient.post<TApiSuccessResponse<any>>(
          `/appointments/${id}/payment-proof`,
          {
            image_base64: base64String,
          },
        );
      } else {
        // Fallback kirim via multipart/form-data
        const formData = new FormData();
        formData.append('image', file);
        res = await apiClient.post<TApiSuccessResponse<any>>(
          `/appointments/${id}/payment-proof`,
          formData,
          {
            headers: { 'Content-Type': 'multipart/form-data' },
          },
        );
      }

      const publicUrlBase = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
      const mapped = normalizePatientAppointment(res.data.data, publicUrlBase);

      return {
        success: true as const,
        message: res.data.message || 'Bukti pembayaran berhasil diunggah',
        data: mapped,
      };
    },
    onSuccess: (response) => {
      queryClient.setQueryData(['get-appointment', response.data.id], response);
      queryClient.invalidateQueries({ queryKey: ['get-my-appointments'] });
      onSuccess?.(response);
    },
    onError: (error) => onError?.(error as TApiError),
  });
};

// PATCH /appointments/:id/cancel
export const useCancelAppointment = ({
  onError,
  onSuccess,
}: TMutationCallbacks<TApiSuccessResponse<TAppointment>> = {}) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['cancel-appointment'],
    mutationFn: async (id: string): Promise<TApiSuccessResponse<TAppointment>> => {
      const res = await apiClient.patch<TApiSuccessResponse<any>>(`/appointments/${id}/cancel`);
      const publicUrlBase = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
      const mapped = normalizePatientAppointment(res.data.data, publicUrlBase);

      return {
        success: true as const,
        message: res.data.message || 'Reservasi berhasil dibatalkan',
        data: mapped,
      };
    },
    onSuccess: (response) => {
      queryClient.setQueryData(['get-appointment', response.data.id], response);
      queryClient.invalidateQueries({ queryKey: ['get-my-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['get-availability'] });
      onSuccess?.(response);
    },
    onError: (error) => onError?.(error as TApiError),
  });
};

// POST /appointments/:id/rating
export const useRateAppointment = ({
  onError,
  onSuccess,
}: TMutationCallbacks<TApiSuccessResponse<TAppointment>> = {}) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['rate-appointment'],
    mutationFn: async ({ id, body }: { id: string; body: TRatingCreate }): Promise<TApiSuccessResponse<TAppointment>> => {
      const res = await apiClient.post<TApiSuccessResponse<any>>(`/appointments/${id}/rating`, {
        rating: body.rating,
        review: body.review || undefined,
      });

      const publicUrlBase = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
      const mapped = normalizePatientAppointment(res.data.data, publicUrlBase);

      return {
        success: true as const,
        message: res.data.message || 'Ulasan berhasil disimpan',
        data: mapped,
      };
    },
    onSuccess: (response) => {
      queryClient.setQueryData(['get-appointment', response.data.id], response);
      queryClient.invalidateQueries({ queryKey: ['get-my-appointments'] });
      queryClient.invalidateQueries({
        queryKey: ['get-detail-doctor', response.data.doctors.id],
      });
      onSuccess?.(response);
    },
    onError: (error) => onError?.(error as TApiError),
  });
};
