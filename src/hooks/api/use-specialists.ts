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
  TSpecialist,
  TSpecialistCreate,
  TSpecialistIndex,
  TSpecialistUpdate,
} from '@/types/specialist';

// GET /specialists
export const useGetSpecialists = (
  { page = 1, limit = 50, search, is_active }: TSpecialistIndex = {},
  enabled = true,
) => {
  return useQuery<TPaginateResponse<TSpecialist>>({
    enabled,
    queryKey: ['get-specialists', page, limit, search, is_active],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const res = await apiClient.get<TPaginateResponse<TSpecialist>>('/specialists', {
        params: { page, limit, search, is_active },
      });

      const rawItems = res.data.data || [];
      const items: TSpecialist[] = rawItems.map((row: any) => ({
        id: row.id,
        name: row.name,
        description: row.description,
        is_active: Boolean(row.is_active),
        created_at: row.created_at,
        updated_at: row.updated_at,
        _count: {
          doctors: row._count?.doctors ?? (Array.isArray(row.doctors) ? row.doctors.length : 0),
        },
      }));

      return {
        success: true,
        message: res.data.message || 'Spesialis berhasil dimuat',
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

// POST /specialists
export const useCreateSpecialist = ({
  onError,
  onSuccess,
}: TMutationCallbacks<TApiSuccessResponse<TSpecialist>> = {}) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['create-specialist'],
    mutationFn: async (body: TSpecialistCreate) => {
      const res = await apiClient.post<TApiSuccessResponse<TSpecialist>>('/specialists', {
        name: body.name,
        description: body.description || undefined,
        is_active: body.is_active ?? true,
      });
      return res.data;
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['get-specialists'] });
      onSuccess?.(response);
    },
    onError: (error) => onError?.(error as TApiError),
  });
};

// PATCH /specialists/:id
export const useUpdateSpecialist = ({
  onError,
  onSuccess,
}: TMutationCallbacks<TApiSuccessResponse<TSpecialist>> = {}) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['update-specialist'],
    mutationFn: async ({ id, body }: { id: string; body: TSpecialistUpdate }) => {
      const res = await apiClient.patch<TApiSuccessResponse<TSpecialist>>(`/specialists/${id}`, body);
      return res.data;
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['get-specialists'] });
      onSuccess?.(response);
    },
    onError: (error) => onError?.(error as TApiError),
  });
};

// DELETE /specialists/:id
export const useDeleteSpecialist = ({
  onError,
  onSuccess,
}: TMutationCallbacks<TApiSuccessResponse<null>> = {}) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['delete-specialist'],
    mutationFn: async (id: string) => {
      const res = await apiClient.delete<TApiSuccessResponse<null>>(`/specialists/${id}`);
      return res.data;
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['get-specialists'] });
      onSuccess?.(response);
    },
    onError: (error) => onError?.(error as TApiError),
  });
};
