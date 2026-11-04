import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

// Client Axios singleton untuk berkomunikasi dengan Backend Express.js
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 20000,
  headers: {
    Accept: 'application/json',
  },
});

// Helper untuk membaca token JWT dari cookie atau localStorage
export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;

  // 1. Coba baca dari localStorage
  const local = localStorage.getItem('token');
  if (local && local.trim()) return local.trim();

  // 2. Coba baca dari document.cookie
  try {
    const match = document.cookie.match(/(?:^|;\s*)token=([^;]*)/);
    if (match && match[1]) return decodeURIComponent(match[1]);
  } catch {}

  return null;
}

// Request Interceptor: Sematkan Bearer Token jika tersedia
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getStoredToken();
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response Interceptor: Unpack response body atau normalisasi error
apiClient.interceptors.response.use(
  (response) => {
    // Backend Express mengembalikan envelope { success: true, message, data, meta }
    return response;
  },
  (error: AxiosError<{ success?: boolean; message?: string; data?: any }>) => {
    const status = error.response?.status;
    const data = error.response?.data;

    let message =
      data?.message ||
      error.message ||
      'Terjadi kendala saat menghubungi server.';

    if (status === 401) {
      message = data?.message || 'Sesi Anda telah berakhir. Silakan masuk kembali.';
      if (typeof window !== 'undefined') {
        // Jangan hapus langsung jika di halaman login agar user bisa melihat error
        if (!window.location.pathname.includes('/login')) {
          localStorage.removeItem('token');
        }
      }
    } else if (status === 403) {
      message = data?.message || 'Anda tidak memiliki hak akses untuk tindakan ini.';
    } else if (status === 404) {
      message = data?.message || 'Data tidak ditemukan.';
    } else if (status === 409) {
      message = data?.message || 'Data sudah ada atau terjadi konflik.';
    } else if (status === 422 || status === 400) {
      message = data?.message || 'Data yang dikirimkan tidak valid.';
    }

    const enhancedError = new Error(message) as Error & {
      status?: number;
      response?: any;
    };
    enhancedError.status = status;
    enhancedError.response = error.response;

    return Promise.reject(enhancedError);
  },
);

export default apiClient;

