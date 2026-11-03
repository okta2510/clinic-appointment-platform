import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
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

function mapToPatientAppointment(row: any, publicUrlBase: string): TAppointment {
  const doctor = row.doctors || {};
  const session = row.practice_sessions || {};
  const fee = Number(row.consultation_fee) || 0;
  const deadline = row.payment_deadline ? new Date(row.payment_deadline).getTime() : 0;
  const now = Date.now();
  const remainingSeconds = Math.max(0, Math.floor((deadline - now) / 1000));

  let proofUrl = '';
  if (row.payment_proof_path) {
    if (row.payment_proof_path.startsWith('http')) {
      proofUrl = row.payment_proof_path;
    } else {
      proofUrl = `${publicUrlBase}/storage/v1/object/public/payment-proofs/${row.payment_proof_path}`;
    }
  }

  const rating = Array.isArray(row.ratings) ? row.ratings[0] : row.ratings || null;

  return {
    id: row.id,
    appointment_code: row.code || `APT-${row.id.slice(0, 8)}`,
    consultation_fee: String(fee),
    treatment_fee: '0',
    discount_amount: '0',
    total_amount: String(fee),
    status: row.status as TTransactionStatus,
    payment_deadline: row.payment_deadline,
    queue_number: row.queue_number ?? null,
    qr_token: row.status === 'done' ? row.qr_token || null : null,
    remaining_seconds: remainingSeconds,
    can_cancel: ['waiting_payment', 'waiting_confirmation'].includes(row.status),
    can_rate: row.status === 'done' && !rating,
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
      id: doctor.id || row.doctor_id,
      full_name: doctor.full_name || 'Dokter',
      photo: doctor.photo_url || null,
    },
    treatments: {
      id: 'general',
      slug: row.treatment_slug || 'acne-dermapeel',
      name: 'Konsultasi Dokter & Treatment',
    },
    practice_sessions: {
      id: session.id || row.session_id,
      session_date: session.session_date || new Date().toISOString(),
      start_time: session.start_time || '08:00',
      end_time: session.end_time || '12:00',
    },
    payment_proofs: row.payment_proof_path
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

// GET /appointments/availability
export const useGetAvailability = (doctorId?: string, date?: string) => {
  return useQuery<TApiSuccessResponse<TAvailability>>({
    enabled: Boolean(doctorId) && Boolean(date),
    queryKey: ['get-availability', doctorId, date],
    staleTime: 0,
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase.rpc('get_availability', {
        p_doctor_id: doctorId,
        p_date: date,
      });

      if (error) {
        throw new Error(error.message);
      }

      const slots: TSlot[] = (data || []).map((slot: any) => ({
        schedule_id: slot.schedule_id || slot.id,
        start_time: (slot.start_time || '').slice(0, 5),
        end_time: (slot.end_time || '').slice(0, 5),
        quota: Number(slot.quota) || 0,
        booked: Number(slot.booked) || 0,
        remaining: Number(slot.remaining) || 0,
        available: Boolean(slot.available),
      }));

      return {
        success: true as const,
        message: 'Ketersediaan jadwal berhasil dimuat',
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
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('Sesi Anda telah berakhir, silakan masuk kembali');
      }

      const from = (page - 1) * limit;
      const to = from + limit - 1;

      const { data, count, error } = await supabase
        .from('appointments')
        .select(
          `
          *,
          doctors (id, full_name, photo_url),
          practice_sessions (id, session_date, start_time, end_time),
          ratings (*)
        `,
          { count: 'exact' },
        )
        .eq('patient_id', user.id)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) {
        throw new Error(error.message);
      }

      const publicUrlBase = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
      const totalItems = count || 0;
      const totalPages = Math.ceil(totalItems / limit) || 1;

      const items = (data || []).map((row: any) =>
        mapToPatientAppointment(row, publicUrlBase),
      );

      return {
        success: true as const,
        message: 'Riwayat reservasi berhasil dimuat',
        data: items,
        meta: {
          page,
          limit,
          total: totalItems,
          total_pages: totalPages,
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
      const supabase = createClient();
      const { data, error } = await supabase
        .from('appointments')
        .select(
          `
          *,
          doctors (id, full_name, photo_url),
          practice_sessions (id, session_date, start_time, end_time),
          ratings (*)
        `,
        )
        .eq('id', id)
        .single();

      if (error || !data) {
        throw new Error(error?.message || 'Janji temu tidak ditemukan');
      }

      const publicUrlBase = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
      const mapped = mapToPatientAppointment(data, publicUrlBase);

      return {
        success: true as const,
        message: 'Janji temu berhasil dimuat',
        data: mapped,
      };
    },
  });
};

// POST /appointments — menahan 1 kuota selama 30 menit
export const useCreateAppointment = ({
  onError,
  onSuccess,
}: TMutationCallbacks<TApiSuccessResponse<TAppointment>> = {}) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['create-appointment'],
    mutationFn: async (body: TAppointmentCreate) => {
      const supabase = createClient();
      let scheduleId = body.schedule_id;

      if (!scheduleId) {
        const [year, month, day] = body.session_date.split('-').map(Number);
        const dayOfWeek = new Date(year, month - 1, day).getDay();

        const startTimeFormatted =
          body.start_time.length === 5 ? `${body.start_time}:00` : body.start_time;

        const { data: schedule, error: schedError } = await supabase
          .from('doctor_schedules')
          .select('id')
          .eq('doctor_id', body.doctor_id)
          .eq('day_of_week', dayOfWeek)
          .eq('start_time', startTimeFormatted)
          .maybeSingle();

        if (schedError || !schedule) {
          throw new Error(
            'Jadwal praktik dokter tidak ditemukan pada hari dan jam tersebut.',
          );
        }
        scheduleId = schedule.id;
      }

      const { data: appointmentId, error: bookError } = await supabase.rpc(
        'book_appointment',
        {
          p_schedule_id: scheduleId,
          p_date: body.session_date,
        },
      );

      if (bookError) {
        throw new Error(bookError.message);
      }

      // Ambil appointment lengkap
      const createdId =
        typeof appointmentId === 'object' && appointmentId !== null
          ? (appointmentId as any).id
          : appointmentId;

      const { data: fullAppointment, error: fetchError } = await supabase
        .from('appointments')
        .select(
          `
          *,
          doctors (id, full_name, photo_url),
          practice_sessions (id, session_date, start_time, end_time),
          ratings (*)
        `,
        )
        .eq('id', createdId)
        .single();

      if (fetchError || !fullAppointment) {
        throw new Error('Gagal memuat janji temu yang baru dibuat');
      }

      const publicUrlBase = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
      const mapped = mapToPatientAppointment(fullAppointment, publicUrlBase);

      return {
        success: true as const,
        message: 'Reservasi berhasil dibuat',
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
    mutationFn: async ({ id, file }: { id: string; file: File }) => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('Sesi Anda telah berakhir, silakan masuk kembali');
      }

      const fileExt = file.name.split('.').pop() || 'jpg';
      const storagePath = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('payment-proofs')
        .upload(storagePath, file, { upsert: true });

      if (uploadError) {
        throw new Error(`Gagal mengunggah bukti bayar: ${uploadError.message}`);
      }

      const { error: rpcError } = await supabase.rpc('submit_payment_proof', {
        p_appointment_id: id,
        p_path: storagePath,
      });

      if (rpcError) {
        throw new Error(rpcError.message);
      }

      const { data: updatedAppointment, error: fetchError } = await supabase
        .from('appointments')
        .select(
          `
          *,
          doctors (id, full_name, photo_url),
          practice_sessions (id, session_date, start_time, end_time),
          ratings (*)
        `,
        )
        .eq('id', id)
        .single();

      if (fetchError || !updatedAppointment) {
        throw new Error('Gagal memuat janji temu setelah unggah bukti');
      }

      const publicUrlBase = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
      const mapped = mapToPatientAppointment(updatedAppointment, publicUrlBase);

      return {
        success: true as const,
        message: 'Bukti pembayaran berhasil diunggah',
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
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error: rpcError } = await supabase.rpc('cancel_appointment', {
        p_appointment_id: id,
      });

      if (rpcError) {
        throw new Error(rpcError.message);
      }

      const { data: updatedAppointment, error: fetchError } = await supabase
        .from('appointments')
        .select(
          `
          *,
          doctors (id, full_name, photo_url),
          practice_sessions (id, session_date, start_time, end_time),
          ratings (*)
        `,
        )
        .eq('id', id)
        .single();

      if (fetchError || !updatedAppointment) {
        throw new Error('Gagal memuat janji temu setelah dibatalkan');
      }

      const publicUrlBase = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
      const mapped = mapToPatientAppointment(updatedAppointment, publicUrlBase);

      return {
        success: true as const,
        message: 'Reservasi berhasil dibatalkan',
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
    mutationFn: async ({ id, body }: { id: string; body: TRatingCreate }) => {
      const supabase = createClient();
      const { error: rpcError } = await supabase.rpc('rate_appointment', {
        p_appointment_id: id,
        p_rating: body.rating,
        p_review: body.review || null,
      });

      if (rpcError) {
        throw new Error(rpcError.message);
      }

      const { data: updatedAppointment, error: fetchError } = await supabase
        .from('appointments')
        .select(
          `
          *,
          doctors (id, full_name, photo_url),
          practice_sessions (id, session_date, start_time, end_time),
          ratings (*)
        `,
        )
        .eq('id', id)
        .single();

      if (fetchError || !updatedAppointment) {
        throw new Error('Gagal memuat janji temu setelah memberikan ulasan');
      }

      const publicUrlBase = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
      const mapped = mapToPatientAppointment(updatedAppointment, publicUrlBase);

      return {
        success: true as const,
        message: 'Ulasan berhasil disimpan',
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
