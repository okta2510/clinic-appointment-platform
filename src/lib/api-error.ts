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

export function getApiStatus(error: unknown) {
  const errObj = error as { status?: number; response?: { status?: number } };
  return errObj.status ?? errObj.response?.status;
}
