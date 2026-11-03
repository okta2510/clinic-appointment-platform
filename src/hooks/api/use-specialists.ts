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
      const supabase = createClient();
      let query = supabase.from('specialists').select('*, doctors(id)', { count: 'exact' });

      if (search) {
        query = query.ilike('name', `%${search}%`);
      }
      if (typeof is_active === 'boolean') {
        query = query.eq('is_active', is_active);
      }

      const from = (page - 1) * limit;
      const to = from + limit - 1;

      const { data, count, error } = await query
        .order('name', { ascending: true })
        .range(from, to);

      if (error) throw new Error(error.message);

      const totalItems = count || 0;
      const totalPages = Math.ceil(totalItems / limit) || 1;

      const items: TSpecialist[] = (data || []).map((row: any) => ({
        id: row.id,
        name: row.name,
        description: row.description,
        is_active: row.is_active,
        created_at: row.created_at,
        updated_at: row.updated_at,
        _count: {
          doctors: Array.isArray(row.doctors) ? row.doctors.length : 0,
        },
      }));

      return {
        success: true as const,
        message: 'Spesialis berhasil dimuat',
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

// POST /specialists
export const useCreateSpecialist = ({
  onError,
  onSuccess,
}: TMutationCallbacks<TApiSuccessResponse<TSpecialist>> = {}) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['create-specialist'],
    mutationFn: async (body: TSpecialistCreate) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('specialists')
        .insert({
          name: body.name,
          description: body.description || null,
          is_active: body.is_active ?? true,
        })
        .select()
        .single();

      if (error) throw new Error(error.message);

      const specialist: TSpecialist = {
        id: data.id,
        name: data.name,
        description: data.description,
        is_active: data.is_active,
        created_at: data.created_at,
        updated_at: data.updated_at,
        _count: { doctors: 0 },
      };

      return {
        success: true as const,
        message: 'Spesialis berhasil dibuat',
        data: specialist,
      };
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
      const supabase = createClient();
      const updates: any = {};
      if (body.name !== undefined) updates.name = body.name;
      if (body.description !== undefined) updates.description = body.description;
      if (body.is_active !== undefined) updates.is_active = body.is_active;

      const { data, error } = await supabase
        .from('specialists')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw new Error(error.message);

      const specialist: TSpecialist = {
        id: data.id,
        name: data.name,
        description: data.description,
        is_active: data.is_active,
        created_at: data.created_at,
        updated_at: data.updated_at,
        _count: { doctors: 0 },
      };

      return {
        success: true as const,
        message: 'Spesialis berhasil diperbarui',
        data: specialist,
      };
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
      const supabase = createClient();
      const { error } = await supabase.from('specialists').delete().eq('id', id);
      if (error) throw new Error(error.message);

      return {
        success: true as const,
        message: 'Spesialis berhasil dihapus',
        data: null,
      };
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['get-specialists'] });
      onSuccess?.(response);
    },
    onError: (error) => onError?.(error as TApiError),
  });
};
