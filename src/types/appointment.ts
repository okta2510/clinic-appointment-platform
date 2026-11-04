// Bentuk data mengikuti response backend (Mini-Project.api/src/features/appointment)

// 6 status transaksi (enum transaction_status di backend)
export type TTransactionStatus =
  | 'waiting_payment'
  | 'waiting_confirmation'
  | 'done'
  | 'rejected'
  | 'expired'
  | 'canceled';

export type TRating = {
  id: string;
  rating: number; // 1–5
  review: string | null;
  created_at: string;
};

export type TSlot = {
  schedule_id?: string;
  start_time: string; // "09:00"
  end_time: string;
  quota: number;
  booked: number;
  remaining: number;
  available: boolean;
};

export type TAvailability = {
  doctor_id: string;
  date: string;
  slots: TSlot[];
};

export type TAppointment = {
  id: string;
  appointment_code: string;
  consultation_fee: string;
  treatment_fee: string;
  discount_amount: string;
  total_amount: string;
  status: TTransactionStatus;
  payment_deadline: string | null;
  /** Terisi saat pasien tiba & check-in di klinik */
  checked_in_at?: string | null;
  /** Terisi setelah admin approve; bisa maju bila pasien lain membatalkan */
  queue_number: number | null;
  /** Isi QR, hanya ada untuk status done */
  qr_token: string | null;
  /** Sisa waktu upload bukti bayar, dihitung server saat response dibuat */
  remaining_seconds: number;
  can_cancel: boolean;
  can_rate: boolean;
  ratings: TRating | null;
  created_at: string;
  doctors: { id: string; full_name: string; photo: string | null };
  treatments: { id: string; slug: string | null; name: string };
  practice_sessions: {
    id: string;
    session_date: string; // "2026-10-26T00:00:00.000Z"
    start_time: string; // "1970-01-01T09:00:00.000Z"
    end_time: string;
  };
  payment_proofs: {
    id: string;
    image_url: string;
    uploaded_at: string;
    verification_status: 'pending' | 'approved' | 'rejected';
    rejection_reason: string | null;
  }[];
};

export type TAppointmentCreate = {
  treatment_slug: string;
  doctor_id: string;
  session_date: string; // YYYY-MM-DD
  start_time: string; // HH:mm
  schedule_id?: string;
};

// Response admin: tanpa qr_token & aksi pasien, dengan data pasien
export type TAdminAppointment = Omit<
  TAppointment,
  'qr_token' | 'remaining_seconds' | 'can_cancel' | 'can_rate'
> & {
  patient_profiles: {
    id: string;
    users: { full_name: string; email: string; phone_number: string | null };
  };
};

export type TRatingCreate = {
  rating: number;
  review?: string;
};
