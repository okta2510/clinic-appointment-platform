import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
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

// Helper memetakan data janji temu admin
function normalizeAdminAppointment(row: any, publicUrlBase: string): TAdminAppointment {
  const profile = row.profiles || row.patient_profiles?.users || {};
  const doctor = row.doctors || {};
  const session = row.practice_sessions || {};
  const fee = Number(row.consultation_fee) || 0;

  let proofUrl = '';
  const proofPath = row.payment_proof_path || row.payment_proofs?.[0]?.image_url;
  if (proofPath) {
    if (proofPath.startsWith('data:image') || proofPath.startsWith('http')) {
      proofUrl = proofPath;
    } else {
      proofUrl = `${publicUrlBase}/storage/v1/object/public/payment-proofs/${proofPath}`;
    }
  }

  return {
    id: row.id,
    appointment_code: row.appointment_code || row.code || `APT-${row.id.slice(0, 8)}`,
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
      photo: doctor.photo_url || doctor.photo || null,
    },
    treatments: {
      id: 'general',
      slug: row.treatment_slug || null,
      name: 'Konsultasi Dokter & Treatment',
    },
    practice_sessions: {
      id: session.id || row.session_id,
      session_date: session.session_date || new Date().toISOString(),
      start_time: session.start_time || '08:00',
      end_time: session.end_time || '12:00',
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
      const params: any = { page, limit };
      if (status) params.status = status;
      if (session_id) params.session_id = session_id;
      if (doctor_id) params.doctor_id = doctor_id;
      if (date) params.date = date;

      const res = await apiClient.get<TPaginateResponse<any>>('/admin/appointments', { params });
      const publicUrlBase = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
      const rawList = res.data.data || [];
      const items = rawList.map((row) => normalizeAdminAppointment(row, publicUrlBase));

      return {
        success: true,
        message: res.data.message || 'Daftar janji temu berhasil dimuat',
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

// PATCH /admin/appointments/:id/approve — setujui pembayaran pasien
export const useApproveAppointment = ({
  onError,
  onSuccess,
}: TMutationCallbacks<TApiSuccessResponse<TAdminAppointment>> = {}) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['approve-appointment'],
    mutationFn: async (id: string) => {
      const res = await apiClient.patch<TApiSuccessResponse<any>>(`/admin/appointments/${id}/approve`);
      return res.data;
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['get-admin-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['live-queue'] });
      onSuccess?.(response);
    },
    onError: (error) => onError?.(error as TApiError),
  });
};

// PATCH /admin/appointments/:id/reject — tolak bukti bayar
export const useRejectAppointment = ({
  onError,
  onSuccess,
}: TMutationCallbacks<TApiSuccessResponse<TAdminAppointment>> = {}) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['reject-appointment'],
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const res = await apiClient.patch<TApiSuccessResponse<any>>(`/admin/appointments/${id}/reject`, {
        reason,
      });
      return res.data;
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['get-admin-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
      onSuccess?.(response);
    },
    onError: (error) => onError?.(error as TApiError),
  });
};

// POST /admin/queue/check-in — scan QR pasien hari H
export const useCheckIn = ({
  onError,
  onSuccess,
}: TMutationCallbacks<TApiSuccessResponse<any>> = {}) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['check-in'],
    mutationFn: async (qrToken: string) => {
      let clean = qrToken.trim();
      if (clean.includes(':')) {
        const parts = clean.split(':');
        clean = (parts[1] || parts[0]).trim();
      }

      const res = await apiClient.post<TApiSuccessResponse<any>>('/admin/queue/check-in', {
        qr_token: clean,
        token: clean,
      });

      return res.data;
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

// PATCH /admin/queue/call-next — panggil nomor antrean berikutnya
export const useCallNext = ({
  onError,
  onSuccess,
}: TMutationCallbacks<TApiSuccessResponse<any>> = {}) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['call-next'],
    mutationFn: async (sessionId: string) => {
      const res = await apiClient.patch<TApiSuccessResponse<any>>('/admin/queue/call-next', {
        session_id: sessionId,
      });
      return res.data;
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['live-queue'] });
      queryClient.invalidateQueries({ queryKey: ['admin-sessions-today'] });
      onSuccess?.(response);
    },
    onError: (error) => onError?.(error as TApiError),
  });
};

// PATCH /admin/queue/no-show/:id — tandai tidak hadir
export const useMarkNoShow = ({
  onError,
  onSuccess,
}: TMutationCallbacks<TApiSuccessResponse<any>> = {}) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['mark-no-show'],
    mutationFn: async (appointmentId: string) => {
      const res = await apiClient.patch<TApiSuccessResponse<any>>(`/admin/queue/no-show/${appointmentId}`);
      return res.data;
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['get-admin-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['live-queue'] });
      onSuccess?.(response);
    },
    onError: (error) => onError?.(error as TApiError),
  });
};

// GET /queue/live — data antrean langsung hari ini (publik)
export const useGetLiveQueue = () => {
  return useQuery({
    queryKey: ['live-queue'],
    refetchInterval: 5000, // refresh setiap 5 detik
    queryFn: async () => {
      const res = await apiClient.get<TApiSuccessResponse<any[]>>('/queue/live');
      return res.data.data || [];
    },
  });
};

// GET /admin/dashboard/stats — statistik laporan grafik (Recharts)
export const useGetAppointmentStats = (
  period: 'day' | 'month' | 'year' = 'month',
  from: string,
  to: string,
  doctorId?: string,
) => {
  return useQuery({
    queryKey: ['appointment-stats', period, from, to, doctorId],
    queryFn: async () => {
      const params: any = { period, from, to };
      if (doctorId && doctorId !== 'all') params.doctor_id = doctorId;

      const res = await apiClient.get<TApiSuccessResponse<any>>('/admin/dashboard/stats', {
        params,
      });

      const raw = res.data.data;
      if (Array.isArray(raw)) return raw;

      if (raw && typeof raw === 'object') {
        const timeline = Array.isArray(raw.timeline) ? raw.timeline : [];
        const doctorPerf = Array.isArray(raw.doctor_performance) ? raw.doctor_performance : [];

        if (timeline.length > 0) {
          // Petakan data timeline backend ke bentuk array statistik yang kompatibel dengan UI
          return timeline.map((item: any) => ({
            period_start: item.label,
            label: item.label,
            doctor_name: doctorPerf[0]?.full_name || 'Semua Dokter',
            total:
              (item.done || 0) +
              (item.rejected || 0) +
              (item.canceled || 0) +
              (item.expired || 0),
            done: item.done || 0,
            rejected: item.rejected || 0,
            canceled: item.canceled || 0,
            expired: item.expired || 0,
            revenue: item.revenue || 0,
          }));
        }

        if (doctorPerf.length > 0) {
          return doctorPerf.map((d: any) => ({
            period_start: from,
            label: from,
            doctor_name: d.full_name,
            total: d.total_patients || 0,
            done: d.total_patients || 0,
            rejected: 0,
            canceled: 0,
            expired: 0,
            revenue: d.total_revenue || 0,
          }));
        }
      }

      return [];
    },
  });
};

// GET /admin/dashboard/metrics — metrik ringkasan kartu operasional admin
export const useGetAdminDashboardMetrics = () => {
  return useQuery({
    queryKey: ['admin-dashboard-stats'],
    refetchInterval: 15000,
    queryFn: async () => {
      const res = await apiClient.get<TApiSuccessResponse<any>>('/admin/dashboard/metrics');
      const raw = res.data.data || {};

      return {
        todayCount: raw.today_appointments ?? raw.todayCount ?? 0,
        pendingCount: raw.pending_verification ?? raw.pendingCount ?? 0,
        doneCount: raw.today_appointments ?? raw.doneCount ?? 0,
        totalRevenue: raw.today_revenue ?? raw.totalRevenue ?? 0,
        waitingQueue: raw.waiting_queue ?? 0,
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

// PATCH /admin/appointments/:id — reschedule / koreksi admin
export const useAdminUpdateAppointment = ({
  onError,
  onSuccess,
}: TMutationCallbacks<TApiSuccessResponse<TAdminAppointment>> = {}) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['admin-update-appointment'],
    mutationFn: async (payload: TAdminAppointmentUpdatePayload) => {
      let res;
      if (payload.status === 'done') {
        res = await apiClient.patch(`/admin/appointments/${payload.id}/approve`);
      } else if (payload.status === 'rejected') {
        res = await apiClient.patch(`/admin/appointments/${payload.id}/reject`, {
          reason: payload.notes || 'Ditolak oleh admin',
        });
      } else {
        res = await apiClient.patch(`/admin/appointments/${payload.id}`, payload);
      }

      const publicUrlBase = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
      return {
        success: true as const,
        message: 'Janji temu berhasil diperbarui',
        data: normalizeAdminAppointment(res.data.data, publicUrlBase),
      };
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['get-admin-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['get-appointment', response.data.id] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['live-queue'] });
      onSuccess?.(response);
    },
    onError: (error) => onError?.(error as TApiError),
  });
};
