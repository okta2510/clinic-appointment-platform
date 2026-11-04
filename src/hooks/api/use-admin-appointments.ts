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
import type { TAdminAppointment, TTransactionStatus } from '@/types/appointment';

type TAdminAppointmentIndex = {
  status?: TTransactionStatus;
  session_id?: string;
  doctor_id?: string;
  date?: string;
  page?: number;
  limit?: number;
};

// Helper memetakan baris database Supabase ke bentuk TAdminAppointment
function mapToAdminAppointment(row: any, publicUrlBase: string): TAdminAppointment {
  const profile = row.profiles || {};
  const doctor = row.doctors || {};
  const session = row.practice_sessions || {};
  const fee = Number(row.consultation_fee) || 0;

  let proofUrl = '';
  if (row.payment_proof_path) {
    if (
      row.payment_proof_path.startsWith('data:image') ||
      row.payment_proof_path.startsWith('http')
    ) {
      proofUrl = row.payment_proof_path;
    } else {
      proofUrl = `${publicUrlBase}/storage/v1/object/public/payment-proofs/${row.payment_proof_path}`;
    }
  }

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
    created_at: row.created_at,
    doctors: {
      id: doctor.id || row.doctor_id,
      full_name: doctor.full_name || 'Dokter',
      photo: doctor.photo_url || null,
    },
    treatments: {
      id: 'general',
      slug: null,
      name: 'Konsultasi Dokter',
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
    ratings: row.ratings ? (Array.isArray(row.ratings) ? row.ratings[0] : row.ratings) : null,
    patient_profiles: {
      id: profile.id || row.patient_id,
      users: {
        full_name: profile.full_name || 'Pasien',
        email: profile.email || 'pasien@klinik.test',
        phone_number: profile.phone_number || null,
      },
    },
  };
}

// GET /admin/appointments — daftar janji temu pasien (ADMIN)
export const useGetAdminAppointments = ({
  status,
  session_id,
  doctor_id,
  date,
  page = 1,
  limit = 20,
}: TAdminAppointmentIndex = {}) => {
  return useQuery<TPaginateResponse<TAdminAppointment>>({
    queryKey: ['get-admin-appointments', status, session_id, doctor_id, date, page, limit],
    placeholderData: keepPreviousData,
    staleTime: 5000,
    queryFn: async () => {
      const supabase = createClient();
      const urlBase = process.env.NEXT_PUBLIC_SUPABASE_URL || '';

      let query = supabase
        .from('appointments')
        .select(
          `
          *,
          profiles:patient_id (id, full_name, phone_number),
          doctors:doctor_id (id, full_name, photo_url),
          practice_sessions:session_id (id, session_date, start_time, end_time, starts_at, ends_at)
        `,
          { count: 'exact' },
        );

      if (status) query = query.eq('status', status);
      if (session_id) query = query.eq('session_id', session_id);
      if (doctor_id) query = query.eq('doctor_id', doctor_id);

      const from = (page - 1) * limit;
      const to = from + limit - 1;

      const { data, count, error } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      const items = (data || []).map((row) => mapToAdminAppointment(row, urlBase));
      const total = count || 0;

      return {
        success: true as const,
        message: 'Daftar janji temu berhasil dimuat',
        data: items,
        meta: {
          page,
          limit,
          total,
          total_pages: Math.ceil(total / limit) || 1,
        },
      };
    },
  });
};

// RPC approve_appointment — status done, terbit QR token
export const useApproveAppointment = ({
  onError,
  onSuccess,
}: TMutationCallbacks<TApiSuccessResponse<TAdminAppointment>> = {}) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['approve-appointment'],
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { data, error } = await supabase.rpc('approve_appointment', {
        p_appointment_id: id,
      });

      if (error) throw error;

      return {
        success: true as const,
        message: 'Janji temu berhasil disetujui',
        data: data as any,
      };
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['get-admin-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
      onSuccess?.(response);
    },
    onError: (error) => onError?.(error as TApiError),
  });
};

// RPC reject_appointment — tolak bukti bayar, kuota dipulihkan
export const useRejectAppointment = ({
  onError,
  onSuccess,
}: TMutationCallbacks<TApiSuccessResponse<TAdminAppointment>> = {}) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['reject-appointment'],
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const supabase = createClient();
      const { data, error } = await supabase.rpc('reject_appointment', {
        p_appointment_id: id,
        p_reason: reason,
      });

      if (error) throw error;

      return {
        success: true as const,
        message: 'Janji temu berhasil ditolak',
        data: data as any,
      };
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['get-admin-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
      onSuccess?.(response);
    },
    onError: (error) => onError?.(error as TApiError),
  });
};

// RPC check_in — scan QR pasien hari H
export const useCheckIn = ({
  onError,
  onSuccess,
}: TMutationCallbacks<TApiSuccessResponse<any>> = {}) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['check-in'],
    mutationFn: async (qrToken: string) => {
      const supabase = createClient();
      let clean = qrToken.trim();
      if (clean.includes(':')) {
        const parts = clean.split(':');
        clean = (parts[1] || parts[0]).trim();
      }
      const { data, error } = await supabase.rpc('check_in', {
        p_qr_token: clean,
      });

      if (error) throw error;

      const resData = (typeof data === 'object' && data !== null) ? data : {};

      return {
        success: true as const,
        message: resData.message || 'Pasien berhasil diproses',
        data: resData,
      };
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['get-admin-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['live-queue'] });
      queryClient.invalidateQueries({ queryKey: ['admin-sessions-today'] });
      onSuccess?.(response);
    },
    onError: (error) => onError?.(error as TApiError),
  });
};

// RPC call_next — panggil nomor antrean berikutnya
export const useCallNext = ({
  onError,
  onSuccess,
}: TMutationCallbacks<TApiSuccessResponse<any>> = {}) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['call-next'],
    mutationFn: async (sessionId: string) => {
      const supabase = createClient();
      const { data, error } = await supabase.rpc('call_next', {
        p_session_id: sessionId,
      });

      if (error) throw error;

      return {
        success: true as const,
        message: 'Nomor antrean berhasil dipanggil',
        data,
      };
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['live-queue'] });
      queryClient.invalidateQueries({ queryKey: ['admin-sessions-today'] });
      onSuccess?.(response);
    },
    onError: (error) => onError?.(error as TApiError),
  });
};

// RPC mark_no_show — tandai tidak hadir
export const useMarkNoShow = ({
  onError,
  onSuccess,
}: TMutationCallbacks<TApiSuccessResponse<any>> = {}) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['mark-no-show'],
    mutationFn: async (appointmentId: string) => {
      const supabase = createClient();
      const { data, error } = await supabase.rpc('mark_no_show', {
        p_appointment_id: appointmentId,
      });

      if (error) throw error;

      return {
        success: true as const,
        message: 'Pasien berhasil ditandai tidak hadir',
        data,
      };
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['get-admin-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['live-queue'] });
      onSuccess?.(response);
    },
    onError: (error) => onError?.(error as TApiError),
  });
};

// RPC get_live_queue — data antrean langsung hari ini (publik)
export const useGetLiveQueue = () => {
  return useQuery({
    queryKey: ['live-queue'],
    refetchInterval: 5000, // refresh setiap 5 detik
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase.rpc('get_live_queue');
      if (error) throw error;
      return data || [];
    },
  });
};

// RPC get_appointment_stats — statistik laporan
export const useGetAppointmentStats = (
  period: 'day' | 'month' | 'year' = 'month',
  from: string,
  to: string,
  doctorId?: string,
) => {
  return useQuery({
    queryKey: ['appointment-stats', period, from, to, doctorId],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase.rpc('get_appointment_stats', {
        p_period: period,
        p_from: from,
        p_to: to,
        p_doctor_id: doctorId || null,
      });

      if (error) throw error;
      return data || [];
    },
  });
};

// Metrik Dashboard Admin
export const useGetAdminDashboardMetrics = () => {
  return useQuery({
    queryKey: ['admin-dashboard-stats'],
    refetchInterval: 15000,
    queryFn: async () => {
      const supabase = createClient();
      const todayStr = new Date().toISOString().split('T')[0];

      // 1. Total janji hari ini
      const { count: todayCount } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', `${todayStr}T00:00:00.000Z`);

      // 2. Menunggu konfirmasi bukti bayar
      const { count: pendingCount } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'waiting_confirmation');

      // 3. Janji selesai
      const { count: doneCount } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'done');

      // 4. Total omzet (janji berstatus done)
      const { data: revenueData } = await supabase
        .from('appointments')
        .select('consultation_fee')
        .eq('status', 'done');

      const totalRevenue = (revenueData || []).reduce(
        (sum, item) => sum + (Number(item.consultation_fee) || 0),
        0,
      );

      return {
        todayCount: todayCount || 0,
        pendingCount: pendingCount || 0,
        doneCount: doneCount || 0,
        totalRevenue,
      };
    },
  });
};

export type TAdminAppointmentUpdatePayload = {
  id: string;
  doctor_id?: string;
  session_date?: string; // YYYY-MM-DD
  start_time?: string; // HH:mm:ss or HH:mm
  status?: TTransactionStatus;
  notes?: string;
};

// PATCH /admin/appointments/:id — koreksi atau reschedule janji temu oleh admin
export const useAdminUpdateAppointment = ({
  onError,
  onSuccess,
}: TMutationCallbacks<TApiSuccessResponse<TAdminAppointment>> = {}) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['admin-update-appointment'],
    mutationFn: async (payload: TAdminAppointmentUpdatePayload) => {
      const supabase = createClient();
      const startTimeFormatted = payload.start_time
        ? payload.start_time.length === 5
          ? `${payload.start_time}:00`
          : payload.start_time
        : null;

      const { error: rpcError } = await supabase.rpc('admin_update_appointment', {
        p_appointment_id: payload.id,
        p_doctor_id: payload.doctor_id || null,
        p_session_date: payload.session_date || null,
        p_start_time: startTimeFormatted,
        p_status: payload.status || null,
        p_notes: payload.notes || null,
      });

      if (rpcError && rpcError.message.includes('does not exist')) {
        // Fallback langsung jika RPC belum dieksekusi di database
        const updateObj: Record<string, any> = {
          updated_at: new Date().toISOString(),
        };
        if (payload.status) {
          updateObj.status = payload.status;
          if (payload.status === 'done') {
            updateObj.confirmed_at = new Date().toISOString();
          }
        }
        if (payload.doctor_id) updateObj.doctor_id = payload.doctor_id;
        if (payload.notes) updateObj.rejection_reason = payload.notes;

        const { error: directError } = await supabase
          .from('appointments')
          .update(updateObj)
          .eq('id', payload.id);

        if (directError) {
          throw new Error(directError.message);
        }
      } else if (rpcError) {
        throw new Error(rpcError.message);
      }

      // Ambil appointment terupdate
      const { data: row, error: fetchError } = await supabase
        .from('appointments')
        .select(`
          *,
          profiles:patient_id (id, full_name, phone_number),
          doctors (id, full_name, photo_url),
          practice_sessions (id, session_date, start_time, end_time),
          ratings (*)
        `)
        .eq('id', payload.id)
        .single();

      if (fetchError || !row) {
        throw new Error('Janji temu berhasil diubah, namun gagal memuat ulang data');
      }

      const publicUrlBase = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
      const mapped = mapToAdminAppointment(row, publicUrlBase);

      return {
        success: true as const,
        message: 'Janji temu berhasil diperbarui',
        data: mapped,
      };
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['get-admin-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['get-appointment', response.data.id] });
      queryClient.invalidateQueries({ queryKey: ['get-admin-dashboard-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['get-live-queue'] });
      onSuccess?.(response);
    },
    onError: (error) => onError?.(error as TApiError),
  });
};
