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
  TDoctor,
  TDoctorCreate,
  TDoctorIndex,
  TDoctorUpdate,
} from '@/types/doctor';

function mapDoctorRow(row: any): TDoctor {
  const schedules = (row.doctor_schedules || [])
    .filter((s: any) => s.is_active)
    .map((s: any) => ({
      id: s.id,
      day_of_week: Number(s.day_of_week),
      start_time: s.start_time,
      end_time: s.end_time,
      patient_quota: Number(s.patient_quota),
    }))
    .sort((a: any, b: any) => a.day_of_week - b.day_of_week || a.start_time.localeCompare(b.start_time));

  const ratings = Array.isArray(row.ratings) ? row.ratings : [];
  const ratingCount = ratings.length;
  const ratingSum = ratings.reduce((sum: number, r: any) => sum + (Number(r.rating) || 0), 0);
  const ratingAvg = ratingCount > 0 ? ratingSum / ratingCount : null;

  return {
    id: row.id,
    user_id: row.id,
    full_name: row.full_name,
    bio: row.bio,
    experience_years: Number(row.experience_years) || 0,
    consultation_fee: String(row.consultation_fee || 0),
    photo: row.photo_url || null,
    specialist_id: row.specialist_id,
    is_active: Boolean(row.is_active),
    created_at: row.created_at,
    updated_at: row.updated_at,
    users: {
      id: row.id,
      email: '',
      full_name: row.full_name,
      phone_number: null,
      profile_picture: row.photo_url || null,
    },
    specialists: row.specialists
      ? {
          id: row.specialists.id,
          name: row.specialists.name,
        }
      : null,
    doctor_schedules: schedules,
    rating_avg: ratingAvg,
    rating_count: ratingCount,
    reviews: ratings.map((r: any) => ({
      id: r.id,
      rating: r.rating,
      review: r.review,
      created_at: r.created_at,
      patient_profiles: {
        users: {
          full_name: r.profiles?.full_name || 'Pasien',
        },
      },
    })),
  };
}

// GET /doctors
export const useGetDoctors = (
  {
    page = 1,
    limit = 50,
    search,
    is_active,
    sort,
    specialist_id,
    min_fee,
    max_fee,
    day_of_week,
  }: TDoctorIndex = {},
  enabled = true,
) => {
  return useQuery<TPaginateResponse<TDoctor>>({
    enabled,
    queryKey: [
      'get-doctors',
      page,
      limit,
      search,
      is_active,
      sort,
      specialist_id,
      min_fee,
      max_fee,
      day_of_week,
    ],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const supabase = createClient();
      let query = supabase.from('doctors').select(
        `
        *,
        specialists (id, name),
        doctor_schedules (*),
        ratings (*, profiles:patient_id (full_name))
      `,
        { count: 'exact' },
      );

      if (typeof is_active === 'boolean') {
        query = query.eq('is_active', is_active);
      }
      if (specialist_id && specialist_id !== 'all') {
        query = query.eq('specialist_id', specialist_id);
      }
      if (search) {
        query = query.ilike('full_name', `%${search}%`);
      }
      if (typeof min_fee === 'number') {
        query = query.gte('consultation_fee', min_fee);
      }
      if (typeof max_fee === 'number') {
        query = query.lte('consultation_fee', max_fee);
      }

      // Sort
      if (sort === 'fee_asc') {
        query = query.order('consultation_fee', { ascending: true });
      } else if (sort === 'fee_desc') {
        query = query.order('consultation_fee', { ascending: false });
      } else if (sort === 'experience_desc') {
        query = query.order('experience_years', { ascending: false });
      } else {
        query = query.order('created_at', { ascending: false });
      }

      const from = (page - 1) * limit;
      const to = from + limit - 1;

      const { data, count, error } = await query.range(from, to);

      if (error) throw new Error(error.message);

      let items = (data || []).map(mapDoctorRow);

      // Filter by day_of_week if specified
      if (typeof day_of_week === 'number') {
        items = items.filter((d) =>
          d.doctor_schedules.some((s) => s.day_of_week === day_of_week),
        );
      }

      const totalItems = count || items.length;
      const totalPages = Math.ceil(totalItems / limit) || 1;

      return {
        success: true as const,
        message: 'Daftar dokter berhasil dimuat',
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

// GET /doctors/:id
export const useGetDetailDoctor = (id?: string) => {
  return useQuery<TApiSuccessResponse<TDoctor>>({
    enabled: Boolean(id),
    queryKey: ['get-detail-doctor', id],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('doctors')
        .select(
          `
          *,
          specialists (id, name),
          doctor_schedules (*),
          ratings (*, profiles:patient_id (full_name))
        `,
        )
        .eq('id', id)
        .single();

      if (error || !data) {
        throw new Error(error?.message || 'Dokter tidak ditemukan');
      }

      return {
        success: true as const,
        message: 'Detail dokter berhasil dimuat',
        data: mapDoctorRow(data),
      };
    },
  });
};

// POST /doctors
export const useCreateDoctor = ({
  onError,
  onSuccess,
}: TMutationCallbacks<TApiSuccessResponse<TDoctor>> = {}) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['create-doctor'],
    mutationFn: async (body: TDoctorCreate) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('doctors')
        .insert({
          full_name: body.full_name,
          bio: body.bio || null,
          experience_years: body.experience_years || 0,
          consultation_fee: body.consultation_fee || 0,
          photo_url: body.photo || (body as any).photo_url || null,
          specialist_id: body.specialist_id || null,
          is_active: body.is_active ?? true,
        })
        .select(
          `
          *,
          specialists (id, name),
          doctor_schedules (*),
          ratings (*)
        `,
        )
        .single();

      if (error) throw new Error(error.message);

      return {
        success: true as const,
        message: 'Dokter berhasil ditambahkan',
        data: mapDoctorRow(data),
      };
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['get-doctors'] });
      onSuccess?.(response);
    },
    onError: (error) => onError?.(error as TApiError),
  });
};

// PATCH /doctors/:id
export const useUpdateDoctor = ({
  onError,
  onSuccess,
}: TMutationCallbacks<TApiSuccessResponse<TDoctor>> = {}) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['update-doctor'],
    mutationFn: async ({ id, body }: { id: string; body: TDoctorUpdate }) => {
      const supabase = createClient();
      const updates: any = {};
      if (body.full_name !== undefined) updates.full_name = body.full_name;
      if (body.bio !== undefined) updates.bio = body.bio;
      if (body.experience_years !== undefined) updates.experience_years = body.experience_years;
      if (body.consultation_fee !== undefined) updates.consultation_fee = body.consultation_fee;
      if (body.photo !== undefined || (body as any).photo_url !== undefined) {
        updates.photo_url = body.photo || (body as any).photo_url || null;
      }
      if (body.specialist_id !== undefined) updates.specialist_id = body.specialist_id;
      if (body.is_active !== undefined) updates.is_active = body.is_active;

      const { data, error } = await supabase
        .from('doctors')
        .update(updates)
        .eq('id', id)
        .select(
          `
          *,
          specialists (id, name),
          doctor_schedules (*),
          ratings (*)
        `,
        )
        .single();

      if (error) throw new Error(error.message);

      return {
        success: true as const,
        message: 'Dokter berhasil diperbarui',
        data: mapDoctorRow(data),
      };
    },
    onSuccess: (response, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['get-doctors'] });
      queryClient.invalidateQueries({ queryKey: ['get-detail-doctor', id] });
      onSuccess?.(response);
    },
    onError: (error) => onError?.(error as TApiError),
  });
};

// POST /doctors/photo (upload to Supabase Storage avatars/photos)
export const useUploadDoctorPhoto = ({
  onError,
  onSuccess,
}: TMutationCallbacks<TApiSuccessResponse<{ url: string }>> = {}) => {
  return useMutation({
    mutationKey: ['upload-doctor-photo'],
    mutationFn: async (file: File) => {
      const supabase = createClient();
      const fileExt = file.name.split('.').pop() || 'jpg';
      const fileName = `doctors/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      const { data: publicUrlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      return {
        success: true as const,
        message: 'Foto berhasil diunggah',
        data: { url: publicUrlData.publicUrl },
      };
    },
    onSuccess: (response) => onSuccess?.(response),
    onError: (error) => onError?.(error as TApiError),
  });
};

// DELETE /doctors/:id
export const useDeleteDoctor = ({
  onError,
  onSuccess,
}: TMutationCallbacks<TApiSuccessResponse<Record<string, never>>> = {}) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['delete-doctor'],
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase.from('doctors').delete().eq('id', id);
      if (error) throw new Error(error.message);

      return {
        success: true as const,
        message: 'Dokter berhasil dihapus',
        data: {},
      };
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['get-doctors'] });
      onSuccess?.(response);
    },
    onError: (error) => onError?.(error as TApiError),
  });
};
