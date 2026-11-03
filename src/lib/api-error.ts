// Ambil pesan dari response backend / Supabase Auth & Postgrest
export function getApiErrorMessage(error: unknown, fallback: string) {
  if (!error) return fallback;
  if (typeof error === 'string') return error;

  const errObj = error as {
    message?: string;
    error_description?: string;
    details?: string;
    response?: { data?: { message?: string }; status?: number };
  };

  // Response dari axios (legacy jika masih ada)
  if (errObj.response?.data?.message) {
    return errObj.response.data.message;
  }

  // Response dari Supabase Auth / Postgrest / JS Error
  if (errObj.message) {
    // Terjemahkan beberapa pesan umum Supabase Auth ke Bahasa Indonesia yang ramah
    if (errObj.message.includes('Invalid login credentials')) {
      return 'Email atau password salah. Silakan coba lagi.';
    }
    if (errObj.message.includes('User already registered')) {
      return 'Email ini sudah terdaftar. Silakan masuk.';
    }
    if (errObj.message.includes('Password should be at least')) {
      return 'Password minimal 8 karakter.';
    }
    return errObj.message;
  }

  if (errObj.error_description) {
    return errObj.error_description;
  }

  if (errObj.details) {
    return errObj.details;
  }

  return fallback;
}

export function getApiStatus(error: unknown): number | undefined {
  if (!error || typeof error !== 'object') {
    return undefined;
  }

  const errObj = error as {
    status?: number;
    statusCode?: number;
    code?: string | number;
    message?: string;
    response?: { status?: number };
  };

  if (typeof errObj.status === 'number') {
    return errObj.status;
  }

  if (typeof errObj.response?.status === 'number') {
    return errObj.response.status;
  }

  if (typeof errObj.statusCode === 'number') {
    return errObj.statusCode;
  }

  // Handle common error messages or codes
  if (errObj.message && (errObj.message.includes('Sesi Anda') || errObj.message.includes('Unauthenticated'))) {
    return 401;
  }

  if (errObj.code === 'PGRST116') {
    return 404;
  }

  if (errObj.code === '23505') {
    return 409;
  }

  if (errObj.code === '42501') {
    return 403;
  }

  return undefined;
}
