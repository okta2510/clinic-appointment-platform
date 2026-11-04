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
import type {
  TDoctor,
  TDoctorCreate,
  TDoctorIndex,
  TDoctorUpdate,
} from '@/types/doctor';

function normalizeDoctor(d: any): TDoctor {
  const schedules = (d.doctor_schedules || [])
    .filter((s: any) => s.is_active !== false)
    .map((s: any) => ({
      id: s.id,
      day_of_week: Number(s.day_of_week),
      start_time: s.start_time,
      end_time: s.end_time,
      patient_quota: Number(s.patient_quota),
    }))
    .sort(
      (a: any, b: any) =>
        a.day_of_week - b.day_of_week || a.start_time.localeCompare(b.start_time),
    );

  const ratings = Array.isArray(d.ratings) ? d.ratings : [];
  const ratingCount = d.rating_count ?? ratings.length;
  const ratingAvg = d.rating_avg ?? (ratingCount > 0
    ? ratings.reduce((sum: number, r: any) => sum + (Number(r.rating) || 0), 0) / ratingCount
    : null);

  const photo = d.photo_url || d.photo || d.users?.profile_picture || null;

  return {
    id: d.id,
    user_id: d.user_id || d.id,
    full_name: d.full_name || d.users?.full_name || 'Dokter',
    bio: d.bio ?? d.description ?? null,
    experience_years: Number(d.experience_years) || 0,
    consultation_fee: String(d.consultation_fee || 0),
    photo,
    specialist_id: d.specialist_id,
    is_active: Boolean(d.is_active ?? true),
    created_at: d.created_at,
    updated_at: d.updated_at,
    users: {
      id: d.user_id || d.id,
      email: d.users?.email || '',
      full_name: d.full_name || d.users?.full_name || '',
      phone_number: d.users?.phone_number || null,
      profile_picture: photo,
    },
    specialists: d.specialists
      ? {
          id: d.specialists.id,
          name: d.specialists.name,
        }
      : null,
    doctor_schedules: schedules,
    rating_avg: ratingAvg,
    rating_count: ratingCount,
    reviews: Array.isArray(d.reviews)
      ? d.reviews
      : ratings.map((r: any) => ({
          id: r.id,
          rating: r.rating,
          review: r.review,
          created_at: r.created_at,
          patient_profiles: {
            users: {
              full_name: r.profiles?.full_name || r.patient_profiles?.users?.full_name || 'Pasien',
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
      const params: any = { page, limit };
      if (search) params.search = search;
      if (typeof is_active === 'boolean') params.is_active = is_active;
      if (sort) params.sort = sort;
      if (specialist_id && specialist_id !== 'all') params.specialist_id = specialist_id;
      if (typeof min_fee === 'number') params.min_fee = min_fee;
      if (typeof max_fee === 'number') params.max_fee = max_fee;
      if (typeof day_of_week === 'number') params.day_of_week = day_of_week;

      const res = await apiClient.get<TPaginateResponse<any>>('/doctors', { params });
      const rawList = res.data.data || [];
      const items = rawList.map(normalizeDoctor);

      return {
        success: true,
        message: res.data.message || 'Daftar dokter berhasil dimuat',
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

// GET /doctors/:id
export const useGetDetailDoctor = (id?: string) => {
  return useQuery<TApiSuccessResponse<TDoctor>>({
    enabled: Boolean(id),
    queryKey: ['get-detail-doctor', id],
    queryFn: async () => {
      const res = await apiClient.get<TApiSuccessResponse<any>>(`/doctors/${id}`);
      return {
        success: true,
        message: res.data.message || 'Detail dokter berhasil dimuat',
        data: normalizeDoctor(res.data.data),
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
      const res = await apiClient.post<TApiSuccessResponse<any>>('/doctors', {
        email: body.email,
        phone_number: body.phone_number,
        password: body.password,
        full_name: body.full_name,
        bio: body.bio || undefined,
        experience_years: Number(body.experience_years) || 0,
        consultation_fee: Number(body.consultation_fee) || 0,
        photo: body.photo || (body as any).photo_url || undefined,
        photo_url: body.photo || (body as any).photo_url || undefined,
        specialist_id: body.specialist_id || undefined,
        is_active: body.is_active ?? true,
      });

      return {
        success: true as const,
        message: res.data.message || 'Dokter berhasil ditambahkan',
        data: normalizeDoctor(res.data.data),
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
      const payload: any = {};
      if (body.full_name !== undefined) payload.full_name = body.full_name;
      if (body.bio !== undefined) payload.bio = body.bio;
      if (body.experience_years !== undefined) payload.experience_years = Number(body.experience_years);
      if (body.consultation_fee !== undefined) payload.consultation_fee = Number(body.consultation_fee);
      if (body.photo !== undefined || (body as any).photo_url !== undefined) {
        payload.photo_url = body.photo || (body as any).photo_url;
      }
      if (body.specialist_id !== undefined) payload.specialist_id = body.specialist_id;
      if (body.is_active !== undefined) payload.is_active = body.is_active;

      const res = await apiClient.patch<TApiSuccessResponse<any>>(`/doctors/${id}`, payload);
      return {
        success: true as const,
        message: res.data.message || 'Dokter berhasil diperbarui',
        data: normalizeDoctor(res.data.data),
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

// POST /doctors/photo
export const useUploadDoctorPhoto = ({
  onError,
  onSuccess,
}: TMutationCallbacks<TApiSuccessResponse<{ url: string }>> = {}) => {
  return useMutation({
    mutationKey: ['upload-doctor-photo'],
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('photo', file);

      const res = await apiClient.post<TApiSuccessResponse<{ url: string }>>(
        '/doctors/photo',
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
        },
      );
      return res.data;
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
      const res = await apiClient.delete<TApiSuccessResponse<Record<string, never>>>(`/doctors/${id}`);
      return res.data;
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['get-doctors'] });
      onSuccess?.(response);
    },
    onError: (error) => onError?.(error as TApiError),
  });
};
